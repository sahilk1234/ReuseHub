import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import multer from 'multer';
import { TYPES } from '@/container/types';
import { IItemApplicationService, CreateItemCommand, UpdateItemCommand, UpdateItemStatusCommand, SearchItemsQuery } from '@/application/services/ItemApplicationService';
import { CreateItemDto, UpdateItemDto, UpdateItemStatusDto, SearchItemsDto } from '../dtos/item.dto';
import { AppError } from '../errors/AppError';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // Maximum 10 files
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

@injectable()
export class ItemController {
  constructor(
    @inject(TYPES.IItemApplicationService)
    private readonly itemService: IItemApplicationService
  ) {}

  /**
   * Multer middleware for file uploads
   */
  public uploadMiddleware = upload.array('images', 10);

  /**
   * POST /api/items - Create a new item
   * Requirements: 1.1, 1.2
   */
  public createItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: CreateItemDto = req.body;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        throw new AppError(400, 'MISSING_IMAGES', 'At least one image is required');
      }

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      // Convert files to the format expected by the service
      const images = files.map(file => ({
        buffer: file.buffer,
        contentType: file.mimetype,
        filename: file.originalname
      }));

      const command: CreateItemCommand = {
        userId: req.userId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        condition: dto.condition,
        images,
        location: {
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: dto.address
        },
        dimensions: dto.dimensions,
        pickupInstructions: dto.pickupInstructions
      };

      const result = await this.itemService.createItem(command);

      res.status(201).json({
        success: true,
        data: {
          itemId: result.itemId,
          imageUrls: result.imageUrls,
          suggestedTags: result.suggestedTags,
          aiAnalysis: result.aiAnalysisResult ? {
            confidence: result.aiAnalysisResult.confidence,
            detectedObjects: result.aiAnalysisResult.detectedObjects,
            suggestedCategories: result.aiAnalysisResult.suggestedCategories
          } : undefined
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'ITEM_CREATION_FAILED',
        error.message || 'Failed to create item'
      );
    }
  };

  /**
   * GET /api/items - Search items with filtering and pagination
   * Requirements: 2.1, 2.2, 2.3
   */
  public searchItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: SearchItemsDto = req.query as any;

      const query: SearchItemsQuery = {
        searchTerm: dto.searchTerm,
        category: dto.category,
        tags: dto.tags,
        status: dto.status || 'available',
        maxDistance: dto.maxDistance,
        userLocation: dto.latitude && dto.longitude ? {
          latitude: dto.latitude,
          longitude: dto.longitude,
          address: '' // Address not needed for search
        } : undefined,
        minRating: dto.minRating,
        maxRating: dto.maxRating,
        createdAfter: dto.createdAfter ? new Date(dto.createdAfter) : undefined,
        createdBefore: dto.createdBefore ? new Date(dto.createdBefore) : undefined,
        limit: dto.limit || 20,
        offset: dto.offset || 0
      };

      const result = await this.itemService.searchItems(query);

      // Transform items to response format
      const items = result.items.map(item => {
        const itemData = item.details.toData();
        const locationData = item.location.toData();
        
        return {
          id: item.id.value,
          userId: item.userId.value,
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          tags: itemData.tags,
          images: itemData.images,
          condition: itemData.condition,
          status: item.status.value,
          location: locationData,
          dimensions: itemData.dimensions,
          pickupInstructions: itemData.pickupInstructions,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });

      res.status(200).json({
        success: true,
        data: {
          items,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit: query.limit,
          offset: query.offset
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'SEARCH_FAILED',
        error.message || 'Failed to search items'
      );
    }
  };

  /**
   * GET /api/items/:id - Get item details
   * Requirements: 2.3
   */
  public getItemDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const item = await this.itemService.getItemDetails(id);
      const itemData = item.details.toData();
      const locationData = item.location.toData();

      res.status(200).json({
        success: true,
        data: {
          id: item.id.value,
          userId: item.userId.value,
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          tags: itemData.tags,
          images: itemData.images,
          condition: itemData.condition,
          status: item.status.value,
          location: locationData,
          dimensions: itemData.dimensions,
          pickupInstructions: itemData.pickupInstructions,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 404,
        error.code || 'ITEM_NOT_FOUND',
        error.message || 'Item not found'
      );
    }
  };

  /**
   * PUT /api/items/:id - Update item details
   * Requirements: 1.2, 1.4
   */
  public updateItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateItemDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: UpdateItemCommand = {
        itemId: id,
        userId: req.userId,
        title: dto.title,
        description: dto.description,
        category: dto.category,
        condition: dto.condition,
        dimensions: dto.dimensions,
        pickupInstructions: dto.pickupInstructions
      };

      await this.itemService.updateItem(command);

      res.status(200).json({
        success: true,
        message: 'Item updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'UPDATE_FAILED',
        error.message || 'Failed to update item'
      );
    }
  };

  /**
   * PUT /api/items/:id/status - Update item status
   * Requirements: 1.4
   */
  public updateItemStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: UpdateItemStatusDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: UpdateItemStatusCommand = {
        itemId: id,
        userId: req.userId,
        status: dto.status
      };

      await this.itemService.updateItemStatus(command);

      res.status(200).json({
        success: true,
        message: 'Item status updated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'STATUS_UPDATE_FAILED',
        error.message || 'Failed to update item status'
      );
    }
  };

  /**
   * DELETE /api/items/:id - Delete an item
   * Requirements: 1.4
   */
  public deleteItem = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      await this.itemService.deleteItem(id, req.userId);

      res.status(200).json({
        success: true,
        message: 'Item deleted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'DELETE_FAILED',
        error.message || 'Failed to delete item'
      );
    }
  };

  /**
   * GET /api/items/user/:userId - Get user's items
   */
  public getUserItems = async (req: Request, res: Response): Promise<void> => {
    try {
      const { userId } = req.params;

      const items = await this.itemService.getUserItems(userId);

      const itemsData = items.map(item => {
        const itemData = item.details.toData();
        const locationData = item.location.toData();
        
        return {
          id: item.id.value,
          userId: item.userId.value,
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          tags: itemData.tags,
          images: itemData.images,
          condition: itemData.condition,
          status: item.status.value,
          location: locationData,
          createdAt: item.createdAt,
          updatedAt: item.updatedAt
        };
      });

      res.status(200).json({
        success: true,
        data: {
          items: itemsData,
          count: itemsData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'FETCH_FAILED',
        error.message || 'Failed to fetch user items'
      );
    }
  };

  /**
   * GET /api/items/categories - Get popular categories
   */
  public getPopularTags = async (req: Request, res: Response): Promise<void> => {
    try {
      const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 20;
      const tags = await this.itemService.getPopularTags(limit);

      res.status(200).json({
        success: true,
        data: { tags },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'FETCH_FAILED',
        error.message || 'Failed to fetch popular tags'
      );
    }
  };
}
