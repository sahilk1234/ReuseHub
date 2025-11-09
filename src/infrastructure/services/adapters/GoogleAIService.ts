import { GoogleGenerativeAI } from '@google/generative-ai';
import {
  IAIService,
  ImageAnalysisResult,
  SimilarItemResult,
  ItemCategorizationResult,
} from '../IAIService';

export interface GoogleAIConfig {
  apiKey: string;
  model?: string;
  visionModel?: string;
  maxTokens?: number;
  temperature?: number;
}

export class GoogleAIService implements IAIService {
  private genAI: GoogleGenerativeAI;
  private model: string;
  private visionModel: string;
  private maxTokens: number;
  private temperature: number;

  constructor(private config: GoogleAIConfig) {
    this.genAI = new GoogleGenerativeAI(config.apiKey);
    this.model = config.model || 'gemini-1.5-flash';
    this.visionModel = config.visionModel || 'gemini-1.5-flash';
    this.maxTokens = config.maxTokens || 1000;
    this.temperature = config.temperature || 0.3;
  }

  async analyzeImage(imageUrl: string): Promise<ImageAnalysisResult> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.visionModel });

      // Fetch the image
      const imageResponse = await fetch(imageUrl);
      const imageBuffer = await imageResponse.arrayBuffer();
      const imageBase64 = Buffer.from(imageBuffer).toString('base64');

      const prompt = `Analyze this image of an item that someone wants to exchange or donate. Provide:
1. A detailed description of the item
2. List of objects/components you can detect
3. Suggested categories for classification
4. Estimated condition (new, like-new, good, fair, poor)
5. Your confidence level (0-1)

Format your response as JSON with the following structure:
{
  "description": "detailed description",
  "detectedObjects": ["object1", "object2"],
  "suggestedCategories": ["category1", "category2"],
  "condition": "condition",
  "confidence": 0.85
}`;

      const result = await model.generateContent([
        prompt,
        {
          inlineData: {
            data: imageBase64,
            mimeType: imageResponse.headers.get('content-type') || 'image/jpeg',
          },
        },
      ]);

      const response = await result.response;
      const text = response.text();

      // Extract JSON from response (Gemini sometimes wraps it in markdown)
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        description: parsed.description || '',
        detectedObjects: parsed.detectedObjects || [],
        suggestedCategories: parsed.suggestedCategories || [],
        condition: parsed.condition || 'good',
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      throw new Error(`Image analysis failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async categorizeItem(description: string, imageAnalysis?: ImageAnalysisResult): Promise<ItemCategorizationResult> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
        },
      });

      const prompt = `Categorize this item for a reuse/exchange platform:

Item Description: ${description}
${imageAnalysis ? `Image Analysis: ${JSON.stringify(imageAnalysis)}` : ''}

Provide categorization in the following JSON format:
{
  "primaryCategory": "main category",
  "secondaryCategories": ["secondary1", "secondary2"],
  "tags": ["tag1", "tag2", "tag3"],
  "confidence": 0.9
}

Use these main categories: Electronics, Furniture, Clothing, Books, Toys, Sports, Kitchen, Garden, Tools, Art, Music, Other`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackCategorization(description);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return {
        primaryCategory: parsed.primaryCategory || 'Other',
        secondaryCategories: parsed.secondaryCategories || [],
        tags: parsed.tags || [],
        confidence: parsed.confidence || 0.5,
      };
    } catch (error) {
      // Fallback to manual categorization
      return this.fallbackCategorization(description);
    }
  }

  async findSimilarItems(
    itemDescription: string,
    itemCategories: string[],
    existingItemDescriptions: Array<{ id: string; description: string; categories: string[] }>
  ): Promise<SimilarItemResult[]> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          maxOutputTokens: this.maxTokens,
          temperature: this.temperature,
        },
      });

      const prompt = `Find similar items from the existing items list:

Target Item:
Description: ${itemDescription}
Categories: ${itemCategories.join(', ')}

Existing Items:
${existingItemDescriptions.map((item, index) => 
  `${index + 1}. ID: ${item.id}, Description: ${item.description}, Categories: ${item.categories.join(', ')}`
).join('\n')}

Return the top 5 most similar items in JSON format:
{
  "similarItems": [
    {
      "itemId": "item_id",
      "similarity": 0.85,
      "reason": "explanation of similarity"
    }
  ]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.fallbackSimilaritySearch(itemDescription, itemCategories, existingItemDescriptions);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.similarItems || [];
    } catch (error) {
      // Fallback to simple keyword matching
      return this.fallbackSimilaritySearch(itemDescription, itemCategories, existingItemDescriptions);
    }
  }

  async generateTags(description: string, imageAnalysis?: ImageAnalysisResult): Promise<string[]> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.model,
        generationConfig: {
          maxOutputTokens: 300,
          temperature: this.temperature,
        },
      });

      const prompt = `Generate relevant tags for this item on a reuse/exchange platform:

Description: ${description}
${imageAnalysis ? `Image Analysis: ${JSON.stringify(imageAnalysis)}` : ''}

Generate 5-10 relevant tags that would help users find this item. Return as JSON array:
{
  "tags": ["tag1", "tag2", "tag3"]
}`;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      // Extract JSON from response
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return this.extractKeywords(description);
      }

      const parsed = JSON.parse(jsonMatch[0]);
      return parsed.tags || [];
    } catch (error) {
      // Fallback to simple keyword extraction
      return this.extractKeywords(description);
    }
  }

  async isAvailable(): Promise<boolean> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.model });
      const result = await model.generateContent('Hello');
      const response = await result.response;
      return !!response.text();
    } catch {
      return false;
    }
  }

  private fallbackCategorization(description: string): ItemCategorizationResult {
    const categories = {
      'Electronics': ['phone', 'computer', 'laptop', 'tablet', 'tv', 'camera', 'headphones'],
      'Furniture': ['chair', 'table', 'desk', 'bed', 'sofa', 'shelf', 'cabinet'],
      'Clothing': ['shirt', 'pants', 'dress', 'shoes', 'jacket', 'coat', 'hat'],
      'Books': ['book', 'novel', 'textbook', 'magazine', 'journal'],
      'Toys': ['toy', 'game', 'puzzle', 'doll', 'action figure'],
      'Sports': ['ball', 'bike', 'equipment', 'fitness', 'exercise'],
      'Kitchen': ['pot', 'pan', 'dish', 'cup', 'plate', 'utensil'],
      'Garden': ['plant', 'pot', 'tool', 'seed', 'fertilizer'],
      'Tools': ['hammer', 'screwdriver', 'drill', 'saw', 'wrench'],
    };

    const lowerDescription = description.toLowerCase();
    let primaryCategory = 'Other';
    let maxMatches = 0;

    for (const [category, keywords] of Object.entries(categories)) {
      const matches = keywords.filter(keyword => lowerDescription.includes(keyword)).length;
      if (matches > maxMatches) {
        maxMatches = matches;
        primaryCategory = category;
      }
    }

    return {
      primaryCategory,
      secondaryCategories: [],
      tags: this.extractKeywords(description),
      confidence: maxMatches > 0 ? 0.6 : 0.3,
    };
  }

  private fallbackSimilaritySearch(
    itemDescription: string,
    itemCategories: string[],
    existingItems: Array<{ id: string; description: string; categories: string[] }>
  ): SimilarItemResult[] {
    const results: SimilarItemResult[] = [];
    const targetWords = itemDescription.toLowerCase().split(/\s+/);

    for (const item of existingItems) {
      let similarity = 0;
      const itemWords = item.description.toLowerCase().split(/\s+/);
      
      // Category similarity
      const categoryMatches = item.categories.filter(cat => 
        itemCategories.some(targetCat => targetCat.toLowerCase() === cat.toLowerCase())
      ).length;
      similarity += categoryMatches * 0.3;

      // Word similarity
      const wordMatches = targetWords.filter(word => 
        itemWords.some(itemWord => itemWord.includes(word) || word.includes(itemWord))
      ).length;
      similarity += (wordMatches / Math.max(targetWords.length, itemWords.length)) * 0.7;

      if (similarity > 0.2) {
        results.push({
          itemId: item.id,
          similarity,
          reason: `${categoryMatches} category matches, ${wordMatches} word matches`,
        });
      }
    }

    return results.sort((a, b) => b.similarity - a.similarity).slice(0, 5);
  }

  private extractKeywords(text: string): string[] {
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2);
    
    // Remove common words
    const stopWords = ['the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had', 'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his', 'how', 'man', 'new', 'now', 'old', 'see', 'two', 'way', 'who', 'boy', 'did', 'its', 'let', 'put', 'say', 'she', 'too', 'use'];
    
    const uniqueWords = new Set(words.filter(word => !stopWords.includes(word)));
    return Array.from(uniqueWords).slice(0, 10);
  }
}
