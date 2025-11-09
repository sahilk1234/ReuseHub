export interface ItemDimensions {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export type ItemCondition = 'new' | 'like-new' | 'good' | 'fair' | 'poor';

export interface ItemDetailsData {
  title: string;
  description: string;
  category: string;
  tags: string[];
  images: string[];
  condition: ItemCondition;
  dimensions?: ItemDimensions;
  pickupInstructions?: string;
}

export class ItemDetails {
  private readonly _title: string;
  private readonly _description: string;
  private readonly _category: string;
  private readonly _tags: string[];
  private readonly _images: string[];
  private readonly _condition: ItemCondition;
  private readonly _dimensions?: ItemDimensions;
  private readonly _pickupInstructions?: string;

  constructor(data: ItemDetailsData) {
    if (!data.title || data.title.trim().length === 0) {
      throw new Error('Item title cannot be empty');
    }
    if (data.title.trim().length > 200) {
      throw new Error('Item title cannot exceed 200 characters');
    }
    if (!data.description || data.description.trim().length === 0) {
      throw new Error('Item description cannot be empty');
    }
    if (data.description.trim().length > 2000) {
      throw new Error('Item description cannot exceed 2000 characters');
    }
    if (!data.category || data.category.trim().length === 0) {
      throw new Error('Item category cannot be empty');
    }
    if (data.images.length === 0) {
      throw new Error('At least one image is required');
    }
    if (data.images.length > 10) {
      throw new Error('Cannot have more than 10 images');
    }

    // Validate dimensions if provided
    if (data.dimensions) {
      if (data.dimensions.length <= 0 || data.dimensions.width <= 0 || 
          data.dimensions.height <= 0 || data.dimensions.weight <= 0) {
        throw new Error('All dimensions must be positive numbers');
      }
    }

    this._title = data.title.trim();
    this._description = data.description.trim();
    this._category = data.category.trim().toLowerCase();
    this._tags = data.tags.map(tag => tag.trim().toLowerCase()).filter(tag => tag.length > 0);
    this._images = [...data.images];
    this._condition = data.condition;
    this._dimensions = data.dimensions ? { ...data.dimensions } : undefined;
    this._pickupInstructions = data.pickupInstructions?.trim();
  }

  get title(): string {
    return this._title;
  }

  get description(): string {
    return this._description;
  }

  get category(): string {
    return this._category;
  }

  get tags(): readonly string[] {
    return this._tags;
  }

  get images(): readonly string[] {
    return this._images;
  }

  get condition(): ItemCondition {
    return this._condition;
  }

  get dimensions(): ItemDimensions | undefined {
    return this._dimensions ? { ...this._dimensions } : undefined;
  }

  get pickupInstructions(): string | undefined {
    return this._pickupInstructions;
  }

  hasTag(tag: string): boolean {
    return this._tags.includes(tag.toLowerCase());
  }

  matchesCategory(category: string): boolean {
    return this._category === category.toLowerCase();
  }

  matchesSearchTerm(searchTerm: string): boolean {
    const term = searchTerm.toLowerCase();
    return (
      this._title.toLowerCase().includes(term) ||
      this._description.toLowerCase().includes(term) ||
      this._category.includes(term) ||
      this._tags.some(tag => tag.includes(term))
    );
  }

  getConditionScore(): number {
    const scores: Record<ItemCondition, number> = {
      'new': 5,
      'like-new': 4,
      'good': 3,
      'fair': 2,
      'poor': 1
    };
    return scores[this._condition];
  }

  toData(): ItemDetailsData {
    return {
      title: this._title,
      description: this._description,
      category: this._category,
      tags: [...this._tags],
      images: [...this._images],
      condition: this._condition,
      dimensions: this._dimensions ? { ...this._dimensions } : undefined,
      pickupInstructions: this._pickupInstructions
    };
  }
}