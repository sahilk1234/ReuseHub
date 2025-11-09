import { injectable, inject } from 'inversify';
import { Item } from '../../domain/item/Item';
import { User } from '../../domain/user/User';
import { ItemId } from '../../domain/item/value-objects/ItemId';
import { UserId } from '../../domain/user/value-objects/UserId';
import { Location, LocationData } from '../../domain/user/value-objects/Location';
import { IItemRepository } from '../../infrastructure/repositories/IItemRepository';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository';
import { IAIService, SimilarItemResult } from '../../infrastructure/services/IAIService';
import { INotificationService } from '../../infrastructure/services/INotificationService';
import { TYPES } from '@/container/types';

export interface CategorizeItemCommand {
  itemId: string;
  forceRecategorization?: boolean;
}

export interface ItemCategorizationResponse {
  itemId: string;
  primaryCategory: string;
  secondaryCategories: string[];
  tags: string[];
  confidence: number;
}

export interface FindMatchesQuery {
  itemId: string;
  maxDistance?: number;
  minSimilarity?: number;
  limit?: number;
}

export interface UserItemMatch {
  userId: string;
  userDisplayName: string;
  userLocation: LocationData;
  userRating: number;
  distance: number;
  similarity: number;
  matchReason: string;
  notificationSent: boolean;
}

export interface FindSimilarItemsQuery {
  itemId: string;
  limit?: number;
  excludeOwnItems?: boolean;
}

export interface SimilarItemResponse {
  itemId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  location: LocationData;
  distance?: number;
  similarity: number;
  matchReason: string;
}

export interface GetRecommendationsQuery {
  userId: string;
  userLocation?: LocationData;
  maxDistance?: number;
  limit?: number;
}

export interface ItemRecommendation {
  itemId: string;
  title: string;
  description: string;
  category: string;
  images: string[];
  location: LocationData;
  distance: number;
  relevanceScore: number;
  reason: string;
}

export interface IMatchingApplicationService {
  categorizeItem(command: CategorizeItemCommand): Promise<ItemCategorizationResponse>;
  findMatchesForItem(query: FindMatchesQuery): Promise<UserItemMatch[]>;
  findSimilarItems(query: FindSimilarItemsQuery): Promise<SimilarItemResponse[]>;
  getPersonalizedRecommendations(query: GetRecommendationsQuery): Promise<ItemRecommendation[]>;
  notifyPotentialMatches(itemId: string): Promise<number>;
}

@injectable()
export class MatchingApplicationService implements IMatchingApplicationService {
  constructor(
    @inject(TYPES.IItemRepository) private readonly itemRepository: IItemRepository,
    @inject(TYPES.IUserRepository) private readonly userRepository: IUserRepository,
    @inject(TYPES.IAIService) private readonly aiService: IAIService,
    @inject(TYPES.INotificationService) private readonly notificationService: INotificationService
  ) {}

  async categorizeItem(command: CategorizeItemCommand): Promise<ItemCategorizationResponse> {
    const item = await this.getItemById(command.itemId);
    const itemData = item.details.toData();

    const aiAvailable = await this.aiService.isAvailable();
    if (!aiAvailable) {
      throw new Error('AI service is currently unavailable');
    }

    let imageAnalysis;
    if (itemData.images && itemData.images.length > 0) {
      try {
        imageAnalysis = await this.aiService.analyzeImage(itemData.images[0]);
      } catch (error) {
        console.error('Image analysis failed:', error);
      }
    }

    const categorization = await this.aiService.categorizeItem(itemData.description, imageAnalysis);
    const generatedTags = await this.aiService.generateTags(itemData.description, imageAnalysis);
    const allTags = [...new Set([...itemData.tags, ...generatedTags])];

    if (command.forceRecategorization || categorization.confidence > 0.7) {
      const updatedDetails = { ...itemData, category: categorization.primaryCategory, tags: allTags };
      item.updateDetails(updatedDetails);
      await this.itemRepository.save(item);
    }

    return {
      itemId: command.itemId,
      primaryCategory: categorization.primaryCategory,
      secondaryCategories: categorization.secondaryCategories,
      tags: allTags,
      confidence: categorization.confidence
    };
  }

  async findMatchesForItem(query: FindMatchesQuery): Promise<UserItemMatch[]> {
    const item = await this.getItemById(query.itemId);
    const itemLocation = item.location;
    const maxDistance = query.maxDistance || 50;
    const minSimilarity = query.minSimilarity || 0.3;
    const limit = query.limit || 20;

    const nearbyUsers = await this.userRepository.findByLocation(itemLocation, maxDistance);
    const potentialMatches = nearbyUsers.filter(user => !user.id.equals(item.userId));
    const matches: UserItemMatch[] = [];

    for (const user of potentialMatches) {
      const matchScore = await this.calculateUserItemMatchScore(user, item);
      if (matchScore.similarity >= minSimilarity) {
        const distance = itemLocation.distanceTo(user.location);
        matches.push({
          userId: user.id.value,
          userDisplayName: user.profile.displayName,
          userLocation: user.location.toData(),
          userRating: user.rating,
          distance,
          similarity: matchScore.similarity,
          matchReason: matchScore.reason,
          notificationSent: false
        });
      }
    }

    matches.sort((a, b) => {
      const scoreDiff = b.similarity - a.similarity;
      if (Math.abs(scoreDiff) > 0.1) return scoreDiff;
      return a.distance - b.distance;
    });

    return matches.slice(0, limit);
  }

  async findSimilarItems(query: FindSimilarItemsQuery): Promise<SimilarItemResponse[]> {
    const targetItem = await this.getItemById(query.itemId);
    const targetData = targetItem.details.toData();
    const limit = query.limit || 10;

    const availableItems = await this.itemRepository.findAvailableItems();
    let candidateItems = availableItems.filter(item => !item.id.equals(targetItem.id));

    if (query.excludeOwnItems) {
      candidateItems = candidateItems.filter(item => !item.userId.equals(targetItem.userId));
    }

    if (candidateItems.length === 0) return [];

    const existingItemDescriptions = candidateItems.map(item => {
      const data = item.details.toData();
      return { id: item.id.value, description: data.description, categories: [data.category, ...data.tags] };
    });

    let similarItemResults: SimilarItemResult[] = [];
    try {
      const aiAvailable = await this.aiService.isAvailable();
      if (aiAvailable) {
        similarItemResults = await this.aiService.findSimilarItems(
          targetData.description,
          [targetData.category, ...targetData.tags],
          existingItemDescriptions
        );
      }
    } catch (error) {
      console.error('AI similarity search failed, using fallback:', error);
    }

    if (similarItemResults.length === 0) {
      similarItemResults = this.fallbackSimilaritySearch(targetItem, candidateItems);
    }

    const similarItems: SimilarItemResponse[] = [];
    for (const result of similarItemResults.slice(0, limit)) {
      const item = candidateItems.find(i => i.id.value === result.itemId);
      if (!item) continue;

      const itemData = item.details.toData();
      const distance = targetItem.location.distanceTo(item.location);

      similarItems.push({
        itemId: item.id.value,
        title: itemData.title,
        description: itemData.description,
        category: itemData.category,
        images: itemData.images,
        location: item.location.toData(),
        distance,
        similarity: result.similarity,
        matchReason: result.reason
      });
    }

    return similarItems;
  }

  async getPersonalizedRecommendations(query: GetRecommendationsQuery): Promise<ItemRecommendation[]> {
    const user = await this.getUserById(query.userId);
    const userLocation = query.userLocation ? new Location(query.userLocation) : user.location;
    const maxDistance = query.maxDistance || 25;
    const limit = query.limit || 15;

    const nearbyItems = await this.itemRepository.findAvailableItemsNearLocation(userLocation, maxDistance);
    const candidateItems = nearbyItems.filter(item => !item.userId.equals(user.id));

    if (candidateItems.length === 0) return [];

    const recommendations: ItemRecommendation[] = [];
    for (const item of candidateItems) {
      const itemData = item.details.toData();
      const distance = userLocation.distanceTo(item.location);
      const relevanceScore = this.calculateRelevanceScore(user, item, distance, maxDistance);

      if (relevanceScore > 0.2) {
        recommendations.push({
          itemId: item.id.value,
          title: itemData.title,
          description: itemData.description,
          category: itemData.category,
          images: itemData.images,
          location: item.location.toData(),
          distance,
          relevanceScore,
          reason: this.generateRecommendationReason(relevanceScore, distance, itemData.category)
        });
      }
    }

    recommendations.sort((a, b) => b.relevanceScore - a.relevanceScore);
    return recommendations.slice(0, limit);
  }

  async notifyPotentialMatches(itemId: string): Promise<number> {
    const item = await this.getItemById(itemId);
    const itemData = item.details.toData();
    const matches = await this.findMatchesForItem({ itemId, maxDistance: 50, minSimilarity: 0.5, limit: 10 });

    let notificationsSent = 0;
    for (const match of matches) {
      try {
        const user = await this.getUserById(match.userId);
        await this.notificationService.sendEmail(
          user.email.value,
          `New item available: ${itemData.title}`,
          this.buildMatchNotificationEmail(itemData, match)
        );
        notificationsSent++;
      } catch (error) {
        console.error(`Failed to notify user ${match.userId}:`, error);
      }
    }

    return notificationsSent;
  }

  private async getItemById(itemId: string): Promise<Item> {
    const item = await this.itemRepository.findById(new ItemId(itemId));
    if (!item) throw new Error('Item not found');
    return item;
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(new UserId(userId));
    if (!user) throw new Error('User not found');
    return user;
  }

  private async calculateUserItemMatchScore(user: User, item: Item): Promise<{ similarity: number; reason: string }> {
    let similarity = 0.3;
    const reasons: string[] = ['nearby location'];

    if (user.rating >= 4.0) {
      similarity += 0.1;
      reasons.push('high user rating');
    }

    if (user.totalExchanges >= 5) {
      similarity += 0.1;
      reasons.push('active community member');
    }

    return { similarity: Math.min(similarity, 1.0), reason: reasons.join(', ') };
  }

  private fallbackSimilaritySearch(targetItem: Item, candidateItems: Item[]): SimilarItemResult[] {
    const targetData = targetItem.details.toData();
    const targetWords = targetData.description.toLowerCase().split(/\s+/);
    const targetCategories = [targetData.category, ...targetData.tags];
    const results: SimilarItemResult[] = [];

    for (const item of candidateItems) {
      const itemData = item.details.toData();
      let similarity = 0;
      const reasons: string[] = [];

      const itemCategories = [itemData.category, ...itemData.tags];
      const categoryMatches = itemCategories.filter(cat =>
        targetCategories.some(targetCat => targetCat.toLowerCase() === cat.toLowerCase())
      ).length;

      if (categoryMatches > 0) {
        const categorySimilarity = categoryMatches / Math.max(targetCategories.length, itemCategories.length);
        similarity += categorySimilarity * 0.5;
        reasons.push(`${categoryMatches} category matches`);
      }

      const itemWords = itemData.description.toLowerCase().split(/\s+/);
      const wordMatches = targetWords.filter(word =>
        word.length > 3 && itemWords.some(itemWord => itemWord.includes(word) || word.includes(itemWord))
      ).length;

      if (wordMatches > 0) {
        const wordSimilarity = wordMatches / Math.max(targetWords.length, itemWords.length);
        similarity += wordSimilarity * 0.5;
        reasons.push(`${wordMatches} word matches`);
      }

      if (similarity > 0.2) {
        results.push({ itemId: item.id.value, similarity, reason: reasons.join(', ') });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity);
  }

  private calculateRelevanceScore(user: User, item: Item, distance: number, maxDistance: number): number {
    let score = 0;
    const distanceFactor = 1 - (distance / maxDistance);
    score += distanceFactor * 0.4;
    score += 0.2;

    const ageInDays = (Date.now() - item.createdAt.getTime()) / (1000 * 60 * 60 * 24);
    const freshnessFactor = Math.max(0, 1 - (ageInDays / 30));
    score += freshnessFactor * 0.2;

    if (user.totalExchanges > 0) {
      score += Math.min(user.totalExchanges / 10, 0.2);
    }

    return Math.min(score, 1.0);
  }

  private generateRecommendationReason(relevanceScore: number, distance: number, category: string): string {
    const reasons: string[] = [];

    if (distance < 5) {
      reasons.push('very close to you');
    } else if (distance < 15) {
      reasons.push('nearby');
    }

    if (relevanceScore > 0.7) {
      reasons.push('highly relevant');
    } else if (relevanceScore > 0.5) {
      reasons.push('good match');
    }

    reasons.push(`in ${category} category`);
    return reasons.join(', ');
  }

  private buildMatchNotificationEmail(itemData: any, match: UserItemMatch): string {
    return `
      <h2>New Item Match Found!</h2>
      <p>We found an item that might interest you:</p>
      <h3>${itemData.title}</h3>
      <p>${itemData.description}</p>
      <p><strong>Category:</strong> ${itemData.category}</p>
      <p><strong>Distance:</strong> ${match.distance.toFixed(1)} km from you</p>
      <p><strong>Match Score:</strong> ${(match.similarity * 100).toFixed(0)}%</p>
      <p><strong>Why this matches:</strong> ${match.matchReason}</p>
      <p>Click here to view the item and express your interest!</p>
    `;
  }
}
