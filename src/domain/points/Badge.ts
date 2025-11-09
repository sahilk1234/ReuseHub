export type BadgeCategory = 'posting' | 'exchanging' | 'community' | 'milestone' | 'special';

export interface BadgeRequirement {
  type: 'eco_points' | 'exchanges' | 'items_posted' | 'rating' | 'custom';
  threshold: number;
  description: string;
}

export interface BadgeData {
  id: string;
  name: string;
  description: string;
  category: BadgeCategory;
  iconUrl?: string;
  requirement: BadgeRequirement;
  ecoPointsReward: number;
}

export class Badge {
  private constructor(
    private readonly _id: string,
    private readonly _name: string,
    private readonly _description: string,
    private readonly _category: BadgeCategory,
    private readonly _iconUrl: string | undefined,
    private readonly _requirement: BadgeRequirement,
    private readonly _ecoPointsReward: number
  ) {}

  static create(data: Omit<BadgeData, 'id'>): Badge {
    const id = `badge-${data.name.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    return new Badge(
      id,
      data.name,
      data.description,
      data.category,
      data.iconUrl,
      data.requirement,
      data.ecoPointsReward
    );
  }

  static fromData(data: BadgeData): Badge {
    return new Badge(
      data.id,
      data.name,
      data.description,
      data.category,
      data.iconUrl,
      data.requirement,
      data.ecoPointsReward
    );
  }

  get id(): string {
    return this._id;
  }

  get name(): string {
    return this._name;
  }

  get description(): string {
    return this._description;
  }

  get category(): BadgeCategory {
    return this._category;
  }

  get iconUrl(): string | undefined {
    return this._iconUrl;
  }

  get requirement(): BadgeRequirement {
    return { ...this._requirement };
  }

  get ecoPointsReward(): number {
    return this._ecoPointsReward;
  }

  checkEligibility(userStats: {
    ecoPoints: number;
    totalExchanges: number;
    itemsPosted: number;
    rating: number;
  }): boolean {
    switch (this._requirement.type) {
      case 'eco_points':
        return userStats.ecoPoints >= this._requirement.threshold;
      case 'exchanges':
        return userStats.totalExchanges >= this._requirement.threshold;
      case 'items_posted':
        return userStats.itemsPosted >= this._requirement.threshold;
      case 'rating':
        return userStats.rating >= this._requirement.threshold;
      case 'custom':
        // Custom badges require manual unlocking
        return false;
      default:
        return false;
    }
  }

  calculateProgress(userStats: {
    ecoPoints: number;
    totalExchanges: number;
    itemsPosted: number;
    rating: number;
  }): number {
    let current = 0;
    
    switch (this._requirement.type) {
      case 'eco_points':
        current = userStats.ecoPoints;
        break;
      case 'exchanges':
        current = userStats.totalExchanges;
        break;
      case 'items_posted':
        current = userStats.itemsPosted;
        break;
      case 'rating':
        current = userStats.rating;
        break;
      case 'custom':
        return 0;
    }

    const progress = (current / this._requirement.threshold) * 100;
    return Math.min(progress, 100);
  }

  toData(): BadgeData {
    return {
      id: this._id,
      name: this._name,
      description: this._description,
      category: this._category,
      iconUrl: this._iconUrl,
      requirement: { ...this._requirement },
      ecoPointsReward: this._ecoPointsReward
    };
  }
}
