import { Item, CreateItemData } from '../../domain/item/Item';
import { ItemId } from '../../domain/item/value-objects/ItemId';
import { ItemDetailsData } from '../../domain/item/value-objects/ItemDetails';
import { ItemStatusValue } from '../../domain/item/value-objects/ItemStatus';
import { UserId } from '../../domain/user/value-objects/UserId';
import { LocationData, Location } from '../../domain/user/value-objects/Location';
import { IItemRepository, ItemSearchCriteria, ItemSearchResult } from '../../infrastructure/repositories/IItemRepository';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository';
import { IFileStorageService } from '../../infrastructure/services/IFileStorageService';
import { IAIService, ImageAnalysisResult } from '../../infrastructure/services/IAIService';
import { IMapsService } from '../../infrastructure/services/IMapsService';

export interface CreateItemCommand {
  userId: string;
  title: string;
  description: string;
  category?: string;
  condition: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  images: Array<{
    buffer: Buffer;
    contentType: string;
    filename: string;
  }>;
  location: LocationData;
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  pickupInstructions?: string;
}

export interface UpdateItemCommand {
  itemId: string;
  userId: string; // For authorization
  title?: string;
  description?: string;
  category?: string;
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  dimensions?: {
    length: number;
    width: number;
    height: number;
    weight: number;
  };
  pickupInstructions?: string;
}

export interface UpdateItemStatusCommand {
  itemId: string;
  userId: string; // For authorization
  status: ItemStatusValue;
}

export interface UpdateItemLocationCommand {
  itemId: string;
  userId: string; // For authorization
  location: LocationData;
}

export interface SearchItemsQuery {
  searchTerm?: string;
  category?: string;
  tags?: string[];
  maxDistance?: number;
  userLocation?: LocationData;
  status?: ItemStatusValue;
  minRating?: number;
  maxRating?: number;
  createdAfter?: Date;
  createdBefore?: Date;
  limit?: number;
  offset?: number;
}

export interface ItemCreationResult {
  itemId: string;
  imageUrls: string[];
  aiAnalysisResult?: ImageAnalysisResult;
  suggestedTags: string[];
}

export interface IItemApplicationService {
  createItem(command: CreateItemCommand): Promise<ItemCreationResult>;
  updateItem(command: UpdateItemCommand): Promise<void>;
  updateItemStatus(command: UpdateItemStatusCommand): Promise<void>;
  updateItemLocation(command: UpdateItemLocationCommand): Promise<void>;
  getItemDetails(itemId: string): Promise<Item>;
  searchItems(query: SearchItemsQuery): Promise<ItemSearchResult>;
  getUserItems(userId: string): Promise<Item[]>;
  getAvailableItemsNearLocation(location: LocationData, radiusKm: number): Promise<Item[]>;
  getSimilarItems(itemId: string, limit?: number): Promise<Item[]>;
  deleteItem(itemId: string, userId: string): Promise<void>;
  getItemsByCategory(category: string): Promise<Item[]>;
  getPopularTags(limit?: number): Promise<Array<{ tag: string; count: number }>>;
}

import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';

@injectable()
export class ItemApplicationService implements IItemApplicationService {
  constructor(
    @inject(TYPES.IItemRepository)
    private readonly itemRepository: IItemRepository,
    @inject(TYPES.IUserRepository)
    private readonly userRepository: IUserRepository,
    @inject(TYPES.IFileStorageService)
    private readonly fileStorageService: IFileStorageService,
    @inject(TYPES.IAIService)
    private readonly aiService: IAIService,
    @inject(TYPES.IMapsService)
    private readonly mapsService: IMapsService
  ) {}

  async createItem(command: CreateItemCommand): Promise<ItemCreationResult> {
    // Validate user exists and is verified
    const user = await this.userRepository.findById(new UserId(command.userId));
    if (!user) {
      throw new Error('User not found');
    }
    if (!user.profile.isVerified) {
      throw new Error('Only verified users can post items');
    }

    // Validate images
    if (!command.images || command.images.length === 0) {
      throw new Error('At least one image is required');
    }
    if (command.images.length > 10) {
      throw new Error('Maximum 10 images allowed per item');
    }

    // Upload images
    const imageUrls: string[] = [];
    const itemId = ItemId.generate().value;
    
    for (let i = 0; i < command.images.length; i++) {
      const image = command.images[i];
      const imagePath = `items/${itemId}/image_${i}_${Date.now()}.${this.getFileExtension(image.filename)}`;
      const imageUrl = await this.fileStorageService.uploadFile(
        image.buffer,
        imagePath,
        image.contentType
      );
      imageUrls.push(imageUrl);
    }

    // Analyze first image with AI if available
    let aiAnalysisResult: ImageAnalysisResult | undefined;
    let suggestedTags: string[] = [];
    let finalCategory = command.category;

    try {
      if (await this.aiService.isAvailable()) {
        // Analyze the first image
        aiAnalysisResult = await this.aiService.analyzeImage(imageUrls[0]);
        
        // Get AI categorization
        const categorization = await this.aiService.categorizeItem(
          command.description,
          aiAnalysisResult
        );
        
        // Use AI category if none provided
        if (!finalCategory) {
          finalCategory = categorization.primaryCategory;
        }
        
        // Generate tags
        suggestedTags = await this.aiService.generateTags(
          command.description,
          aiAnalysisResult
        );
      }
    } catch (error) {
      console.error('AI analysis failed, continuing without it:', error);
      // Continue without AI analysis
    }

    // Create item details
    const itemDetails: ItemDetailsData = {
      title: command.title,
      description: command.description,
      category: finalCategory || 'other',
      tags: suggestedTags,
      images: imageUrls,
      condition: command.condition,
      dimensions: command.dimensions,
      pickupInstructions: command.pickupInstructions
    };

    // Create item domain object
    const createItemData: CreateItemData = {
      userId: command.userId,
      details: itemDetails,
      location: command.location
    };

    const item = Item.create(createItemData);
    
    // Override the generated ID with our pre-generated one (for image paths)
    const itemWithCorrectId = Item.fromData({
      id: itemId,
      userId: command.userId,
      details: itemDetails,
      status: 'available',
      location: command.location,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Save item to repository
    await this.itemRepository.save(itemWithCorrectId);

    // Award points to user for posting item
    user.awardPoints(25, 'Item posted');
    await this.userRepository.save(user);

    return {
      itemId,
      imageUrls,
      aiAnalysisResult,
      suggestedTags
    };
  }

  async updateItem(command: UpdateItemCommand): Promise<void> {
    const item = await this.getItemById(command.itemId);
    
    // Verify ownership
    if (!item.belongsToUser(new UserId(command.userId))) {
      throw new Error('You can only update your own items');
    }

    // Only allow updates for available items
    if (!item.isAvailableForExchange()) {
      throw new Error('Can only update available items');
    }

    // Build updated details
    const currentDetails = item.details.toData();
    const updatedDetails: ItemDetailsData = {
      ...currentDetails,
      ...(command.title && { title: command.title }),
      ...(command.description && { description: command.description }),
      ...(command.category && { category: command.category }),
      ...(command.condition && { condition: command.condition }),
      ...(command.dimensions && { dimensions: command.dimensions }),
      ...(command.pickupInstructions !== undefined && { pickupInstructions: command.pickupInstructions })
    };

    item.updateDetails(updatedDetails);
    await this.itemRepository.save(item);
  }

  async updateItemStatus(command: UpdateItemStatusCommand): Promise<void> {
    const item = await this.getItemById(command.itemId);
    
    // Verify ownership
    if (!item.belongsToUser(new UserId(command.userId))) {
      throw new Error('You can only update your own items');
    }

    item.updateStatus(command.status);
    await this.itemRepository.save(item);
  }

  async updateItemLocation(command: UpdateItemLocationCommand): Promise<void> {
    const item = await this.getItemById(command.itemId);
    
    // Verify ownership
    if (!item.belongsToUser(new UserId(command.userId))) {
      throw new Error('You can only update your own items');
    }

    item.updateLocation(command.location);
    await this.itemRepository.save(item);
  }

  async getItemDetails(itemId: string): Promise<Item> {
    return await this.getItemById(itemId);
  }

  async searchItems(query: SearchItemsQuery): Promise<ItemSearchResult> {
    const criteria: ItemSearchCriteria = {
      searchTerm: query.searchTerm,
      category: query.category,
      tags: query.tags,
      status: query.status || 'available', // Default to available items
      maxDistance: query.maxDistance,
      userLocation: query.userLocation ? new Location(query.userLocation) : undefined,
      minRating: query.minRating,
      maxRating: query.maxRating,
      createdAfter: query.createdAfter,
      createdBefore: query.createdBefore
    };

    return await this.itemRepository.search(
      criteria,
      query.limit || 20,
      query.offset || 0
    );
  }

  async getUserItems(userId: string): Promise<Item[]> {
    return await this.itemRepository.findByUserId(new UserId(userId));
  }

  async getAvailableItemsNearLocation(location: LocationData, radiusKm: number): Promise<Item[]> {
    const locationObj = new Location(location);
    return await this.itemRepository.findAvailableItemsNearLocation(locationObj, radiusKm);
  }

  async getSimilarItems(itemId: string, limit?: number): Promise<Item[]> {
    const item = await this.getItemById(itemId);
    return await this.itemRepository.findSimilarItems(item, limit || 10);
  }

  async deleteItem(itemId: string, userId: string): Promise<void> {
    const item = await this.getItemById(itemId);
    
    // Verify ownership
    if (!item.belongsToUser(new UserId(userId))) {
      throw new Error('You can only delete your own items');
    }

    // Only allow deletion of available items
    if (!item.isAvailableForExchange()) {
      throw new Error('Can only delete available items');
    }

    // Delete images from storage
    const imageUrls = item.details.toData().images;
    for (const imageUrl of imageUrls) {
      try {
        // Extract path from URL (this would depend on your storage service implementation)
        const path = this.extractPathFromUrl(imageUrl);
        await this.fileStorageService.deleteFile(path);
      } catch (error) {
        console.error('Failed to delete image:', error);
        // Continue with deletion even if image cleanup fails
      }
    }

    // Delete item from repository
    await this.itemRepository.delete(item.id);
  }

  async getItemsByCategory(category: string): Promise<Item[]> {
    return await this.itemRepository.findByCategory(category);
  }

  async getPopularTags(limit?: number): Promise<Array<{ tag: string; count: number }>> {
    return await this.itemRepository.getPopularTags(limit || 20);
  }

  private async getItemById(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(new ItemId(itemId));
    if (!item) {
      throw new Error('Item not found');
    }
    return item;
  }

  private getFileExtension(filename: string): string {
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1] : 'jpg';
  }

  private extractPathFromUrl(url: string): string {
    // This is a simplified implementation
    // In a real implementation, you'd need to handle different storage providers
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.substring(1); // Remove leading slash
    } catch {
      // Fallback: assume the URL is already a path
      return url;
    }
  }
}