export interface LeaderboardQueryDto {
  communityId?: string;
  limit?: number;
}

export interface LeaderboardEntryDto {
  userId: string;
  displayName: string;
  avatar?: string;
  ecoPoints: number;
  level: string;
  totalExchanges: number;
  rating: number;
  rank: number;
}

export interface BadgeDto {
  id: string;
  name: string;
  description: string;
  category: string;
  requirement: {
    type: string;
    threshold: number;
    description: string;
  };
  ecoPointsReward: number;
  iconUrl?: string;
}

export interface UserAchievementSummaryDto {
  userId: string;
  ecoPoints: number;
  level: string;
  unlockedBadges: BadgeDto[];
  inProgressBadges: Array<{
    badge: BadgeDto;
    progress: number;
  }>;
  totalExchanges: number;
  itemsPosted: number;
  rating: number;
}
