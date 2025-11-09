import {
  IAIService,
  ImageAnalysisResult,
  SimilarItemResult,
  ItemCategorizationResult,
} from '../IAIService';
import { CircuitBreaker, CircuitBreakerConfig } from '../../resilience/CircuitBreaker';
import { ServiceHealthMonitor } from '../../resilience/ServiceHealthMonitor';
import { ErrorLogger } from '@/api/errors/ErrorLogger';

/**
 * Resilient AI Service with Circuit Breaker
 * Requirements: 3.1, 3.3, 3.5 - AI service resilience and fallback mechanisms
 * 
 * This wrapper adds:
 * - Circuit breaker pattern for fault tolerance
 * - Automatic fallback to manual categorization
 * - Health monitoring and automatic recovery
 */
export class ResilientAIService implements IAIService {
  private circuitBreaker: CircuitBreaker;
  private logger = ErrorLogger.getInstance();
  private healthMonitor = ServiceHealthMonitor.getInstance();

  constructor(
    private readonly aiService: IAIService,
    circuitBreakerConfig?: Partial<CircuitBreakerConfig>
  ) {
    // Initialize circuit breaker with sensible defaults
    const config: CircuitBreakerConfig = {
      failureThreshold: circuitBreakerConfig?.failureThreshold || 5,
      successThreshold: circuitBreakerConfig?.successThreshold || 2,
      timeout: circuitBreakerConfig?.timeout || 60000, // 1 minute
      onStateChange: (state) => {
        this.logger.logInfo(`AI Service circuit breaker state changed to ${state}`);
      }
    };

    this.circuitBreaker = new CircuitBreaker('AIService', config);

    // Register with health monitor
    this.healthMonitor.registerCircuitBreaker('AIService', this.circuitBreaker);
    this.healthMonitor.registerHealthCheck('AIService', async () => {
      try {
        const available = await this.aiService.isAvailable();
        return {
          healthy: available,
          message: available ? 'AI service is available' : 'AI service is unavailable'
        };
      } catch (error) {
        return {
          healthy: false,
          message: error instanceof Error ? error.message : 'Health check failed'
        };
      }
    });
  }

  /**
   * Analyze image with circuit breaker protection
   */
  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      return await this.circuitBreaker.execute(() => 
        this.aiService.analyzeImage(imageUrl)
      );
    } catch (error) {
      this.logger.logWarning('AI image analysis failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback: return basic analysis
      return this.fallbackImageAnalysis();
    }
  }

  /**
   * Categorize item with circuit breaker protection
   */
  async categorizeItem(
    description: string,
    imageAnalysis?: ImageAnalysisResult
  ): Promise<ItemCategorizationResult> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.aiService.categorizeItem(description, imageAnalysis)
      );
    } catch (error) {
      this.logger.logWarning('AI categorization failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback: use manual categorization
      return this.fallbackCategorization(description);
    }
  }

  /**
   * Find similar items with circuit breaker protection
   */
  async findSimilarItems(
    itemDescription: string,
    itemCategories: string[],
    existingItemDescriptions: Array<{ id: string; description: string; categories: string[] }>
  ): Promise<SimilarItemResult[]> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.aiService.findSimilarItems(itemDescription, itemCategories, existingItemDescriptions)
      );
    } catch (error) {
      this.logger.logWarning('AI similarity search failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback: use simple keyword matching
      return this.fallbackSimilaritySearch(itemDescription, itemCategories, existingItemDescriptions);
    }
  }

  /**
   * Generate tags with circuit breaker protection
   */
  async generateTags(description: string, imageAnalysis?: ImageAnalysisResult): Promise<string[]> {
    try {
      return await this.circuitBreaker.execute(() =>
        this.aiService.generateTags(description, imageAnalysis)
      );
    } catch (error) {
      this.logger.logWarning('AI tag generation failed, using fallback', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Fallback: extract keywords from description
      return this.extractKeywords(description);
    }
  }

  /**
   * Check if AI service is available
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Check circuit breaker state first
      if (!this.circuitBreaker.isAvailable()) {
        return false;
      }

      return await this.aiService.isAvailable();
    } catch {
      return false;
    }
  }

  /**
   * Fallback image analysis when AI is unavailable
   */
  private fallbackImageAnalysis(): ImageAnalysisResult {
    return {
      description: 'Image analysis unavailable',
      detectedObjects: [],
      suggestedCategories: ['Other'],
      confidence: 0.1
    };
  }

  /**
   * Fallback categorization using keyword matching
   */
  private fallbackCategorization(description: string): ItemCategorizationResult {
    const categories = {
      'Electronics': ['phone', 'computer', 'laptop', 'tablet', 'tv', 'television', 'camera', 'headphones', 'speaker', 'monitor', 'keyboard', 'mouse'],
      'Furniture': ['chair', 'table', 'desk', 'bed', 'sofa', 'couch', 'shelf', 'cabinet', 'dresser', 'bookcase'],
      'Clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'hat', 'sweater', 'jeans', 'boots'],
      'Books': ['book', 'novel', 'textbook', 'magazine', 'journal', 'comic', 'manual'],
      'Toys': ['toy', 'game', 'puzzle', 'doll', 'action figure', 'lego', 'board game'],
      'Sports': ['ball', 'bike', 'bicycle', 'equipment', 'fitness', 'exercise', 'weights', 'yoga'],
      'Kitchen': ['pot', 'pan', 'dish', 'cup', 'plate', 'utensil', 'blender', 'microwave', 'toaster'],
      'Garden': ['plant', 'pot', 'tool', 'seed', 'fertilizer', 'lawn', 'mower', 'hose'],
      'Tools': ['hammer', 'screwdriver', 'drill', 'saw', 'wrench', 'toolbox', 'ladder'],
      'Art': ['painting', 'canvas', 'frame', 'sculpture', 'craft', 'supplies'],
      'Music': ['guitar', 'piano', 'instrument', 'vinyl', 'record', 'cd', 'speaker']
    };

    const lowerDescription = description.toLowerCase();
    let primaryCategory = 'Other';
    let maxMatches = 0;
    const matchedKeywords: string[] = [];

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => {
        if (lowerDescription.includes(keyword)) {
          matchedKeywords.push(keyword);
          return true;
        }
        return false;
      }).length;

      if (matches > maxMatches) {
        maxMatches = matches;
        primaryCategory = category;
      }
    }

    const tags = this.extractKeywords(description);

    return {
      primaryCategory,
      secondaryCategories: [],
      tags,
      confidence: maxMatches > 0 ? 0.6 : 0.3
    };
  }

  /**
   * Fallback similarity search using simple keyword matching
   */
  private fallbackSimilaritySearch(
    itemDescription: string,
    itemCategories: string[],
    existingItems: Array<{ id: string; description: string; categories: string[] }>
  ): SimilarItemResult[] {
    const results: SimilarItemResult[] = [];
    const targetWords = new Set(
      itemDescription.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter(word => word.length > 2)
    );

    for (const item of existingItems) {
      let similarity = 0;
      
      // Category similarity (weighted 40%)
      const categoryMatches = item.categories.filter(cat =>
        itemCategories.some(targetCat => targetCat.toLowerCase() === cat.toLowerCase())
      ).length;
      
      if (itemCategories.length > 0) {
        similarity += (categoryMatches / itemCategories.length) * 0.4;
      }

      // Word similarity (weighted 60%)
      const itemWords = new Set(
        item.description.toLowerCase()
          .replace(/[^\w\s]/g, '')
          .split(/\s+/)
          .filter(word => word.length > 2)
      );

      let wordMatches = 0;
      for (const word of targetWords) {
        if (itemWords.has(word)) {
          wordMatches++;
        }
      }

      if (targetWords.size > 0) {
        similarity += (wordMatches / targetWords.size) * 0.6;
      }

      if (similarity > 0.2) {
        results.push({
          itemId: item.id,
          similarity: Math.min(similarity, 1.0),
          reason: `${categoryMatches} category matches, ${wordMatches} word matches`
        });
      }
    }

    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 5);
  }

  /**
   * Extract keywords from text
   */
  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);

    // Common stop words to filter out
    const stopWords = new Set([
      'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
      'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
      'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy',
      'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use', 'with', 'this',
      'that', 'from', 'have', 'been', 'were', 'they', 'what', 'when', 'your'
    ]);

    const uniqueWords = [...new Set(words.filter(word => !stopWords.has(word)))];
    return uniqueWords.slice(0, 10);
  }

  /**
   * Get circuit breaker statistics
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }
}
