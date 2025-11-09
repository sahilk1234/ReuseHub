export interface ImageAnalysisResult {
  description: string;
  detectedObjects: string[];
  suggestedCategories: string[];
  condition?: 'new' | 'like-new' | 'good' | 'fair' | 'poor';
  confidence: number; // 0-1 confidence score
}

export interface SimilarItemResult {
  itemId: string;
  similarity: number; // 0-1 similarity score
  reason: string;
}

export interface ItemCategorizationResult {
  primaryCategory: string;
  secondaryCategories: string[];
  tags: string[];
  confidence: number;
}

export interface IAIService {
  /**
   * Analyze an image to extract information about the item
   * @param imageUrl - URL of the image to analyze
   * @returns Promise resolving to image analysis result
   */
  analyzeImage(imageUrl: string): Promise<ImageAnalysisResult>;

  /**
   * Categorize an item based on description and image analysis
   * @param description - Text description of the item
   * @param imageAnalysis - Optional image analysis result
   * @returns Promise resolving to categorization result
   */
  categorizeItem(description: string, imageAnalysis?: ImageAnalysisResult): Promise<ItemCategorizationResult>;

  /**
   * Find similar items based on an item's characteristics
   * @param itemDescription - Description of the item
   * @param itemCategories - Categories/tags of the item
   * @param existingItemDescriptions - Array of existing item descriptions to compare against
   * @returns Promise resolving to array of similar items
   */
  findSimilarItems(
    itemDescription: string,
    itemCategories: string[],
    existingItemDescriptions: Array<{ id: string; description: string; categories: string[] }>
  ): Promise<SimilarItemResult[]>;

  /**
   * Generate tags for an item based on description and image
   * @param description - Item description
   * @param imageAnalysis - Optional image analysis result
   * @returns Promise resolving to array of relevant tags
   */
  generateTags(description: string, imageAnalysis?: ImageAnalysisResult): Promise<string[]>;

  /**
   * Check if the AI service is available
   * @returns Promise resolving to true if service is available
   */
  isAvailable(): Promise<boolean>;
}