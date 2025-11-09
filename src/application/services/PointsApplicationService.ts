import { User } from '../../domain/user/User';
import { UserId } from '../../domain/user/value-objects/UserId';
import { Badge, BadgeCategory } from '../../domain/points/Badge';
import { Achievement } from '../../domain/points/Achievement';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository';
import { IBadgeRepository } from '../../infrastructure/repositories/IBadgeRepository';
import { IAchievementRepository } from '../../infrastructure/repositories/IAchievementRepository';

export interface AwardPointsCommand {
  userId: string;
  points: number;
  reason: string;
}

export interface UnlockBadgeCommand {
  userId: string;
  badgeId: string;
}

export interface LeaderboardQuery {
  communityId?: string;
  limit?: number;
  includePrivateUsers?: boolean;
}

export interface LeaderboardEntry {
  userId: string;
  displayName: string;
  avatar?: string;
  ecoPoints: number;
  level: string;
  totalExchanges: number;
  rating: number;
  rank: number;
  isPrivate: boolean;
}

export interface UserAchievementSummary {
  userId: string;
  ecoPoints: number;
  level: string;
  unlockedBadges: Badge[];
  inProgressBadges: Array<{
    badge: Badge;
    progress: number;
  }>;
  totalExchanges: number;
  itemsPosted: number;
  rating: number;
}

export interface IPointsApplicationService {
  awardPoints(command: AwardPointsCommand): Promise<void>;
  awardPointsForItemPosting(userId: string, itemId: string): Promise<void>;
  awardPointsForExchange(giverId: string, receiverId: string, exchangeId: string): Promise<void>;
  checkAndUnlockBadges(userId: string): Promise<Badge[]>;
  unlockBadge(command: UnlockBadgeCommand): Promise<void>;
  getUserAchievements(userId: string): Promise<UserAchievementSummary>;
  getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardEntry[]>;
  getAllBadges(): Promise<Badge[]>;
  getBadgesByCategory(category: BadgeCategory): Promise<Badge[]>;
  initializeDefaultBadges(): Promise<void>;
}

export class PointsApplicationService implements IPointsApplicationService {
  // Points configuration based on requirements
  private readonly POINTS_FOR_ITEM_POSTING = 10;
  private readonly POINTS_FOR_EXCHANGE_GIVER = 25;
  private readonly POINTS_FOR_EXCHANGE_RECEIVER = 15;
  private readonly POINTS_FOR_VERIFICATION = 50;

  constructor(
    private readonly userRepository: IUserRepository,
    private readonly badgeRepository: IBadgeRepository,
    private readonly achievementRepository: IAchievementRepository
  ) {}

  async awardPoints(command: AwardPointsCommand): Promise<void> {
    const user = await this.getUserById(command.userId);
    user.awardPoints(command.points, command.reason);
    await this.userRepository.save(user);

    // Check if any badges should be unlocked
    await this.checkAndUnlockBadges(command.userId);
  }

  async awardPointsForItemPosting(userId: string, itemId: string): Promise<void> {
    await this.awardPoints({
      userId,
      points: this.POINTS_FOR_ITEM_POSTING,
      reason: `Posted item ${itemId}`
    });
  }

  async awardPointsForExchange(
    giverId: string,
    receiverId: string,
    exchangeId: string
  ): Promise<void> {
    // Award points to giver
    await this.awardPoints({
      userId: giverId,
      points: this.POINTS_FOR_EXCHANGE_GIVER,
      reason: `Completed exchange ${exchangeId} as giver`
    });

    // Award points to receiver
    await this.awardPoints({
      userId: receiverId,
      points: this.POINTS_FOR_EXCHANGE_RECEIVER,
      reason: `Completed exchange ${exchangeId} as receiver`
    });
  }

  async checkAndUnlockBadges(userId: string): Promise<Badge[]> {
    const user = await this.getUserById(userId);
    const allBadges = await this.badgeRepository.findAll();
    const userAchievements = await this.achievementRepository.findByUserId(userId);
    
    const unlockedBadgeIds = new Set(
      userAchievements
        .filter(a => a.isUnlocked())
        .map(a => a.badgeId)
    );

    const newlyUnlockedBadges: Badge[] = [];

    // Get user stats for badge eligibility check
    const userStats = await this.getUserStats(userId);

    for (const badge of allBadges) {
      // Skip if already unlocked
      if (unlockedBadgeIds.has(badge.id)) {
        continue;
      }

      // Check if user is eligible for this badge
      if (badge.checkEligibility(userStats)) {
        // Create or update achievement
        let achievement = await this.achievementRepository.findByUserIdAndBadgeId(
          userId,
          badge.id
        );

        if (!achievement) {
          achievement = Achievement.create(userId, badge.id);
        }

        achievement.updateProgress(100);
        await this.achievementRepository.save(achievement);

        // Award bonus points for unlocking badge
        user.awardPoints(badge.ecoPointsReward, `Unlocked badge: ${badge.name}`);
        
        newlyUnlockedBadges.push(badge);
      } else {
        // Update progress for badges in progress
        const progress = badge.calculateProgress(userStats);
        if (progress > 0) {
          let achievement = await this.achievementRepository.findByUserIdAndBadgeId(
            userId,
            badge.id
          );

          if (!achievement) {
            achievement = Achievement.create(userId, badge.id);
          }

          achievement.updateProgress(progress);
          await this.achievementRepository.save(achievement);
        }
      }
    }

    // Save user with any bonus points awarded
    if (newlyUnlockedBadges.length > 0) {
      await this.userRepository.save(user);
    }

    return newlyUnlockedBadges;
  }

  async unlockBadge(command: UnlockBadgeCommand): Promise<void> {
    const badge = await this.badgeRepository.findById(command.badgeId);
    if (!badge) {
      throw new Error('Badge not found');
    }

    const user = await this.getUserById(command.userId);

    // Check if already unlocked
    const existingAchievement = await this.achievementRepository.findByUserIdAndBadgeId(
      command.userId,
      command.badgeId
    );

    if (existingAchievement && existingAchievement.isUnlocked()) {
      throw new Error('Badge already unlocked');
    }

    // Create achievement
    const achievement = Achievement.create(command.userId, command.badgeId);
    achievement.updateProgress(100);
    await this.achievementRepository.save(achievement);

    // Award bonus points
    user.awardPoints(badge.ecoPointsReward, `Unlocked badge: ${badge.name}`);
    await this.userRepository.save(user);
  }

  async getUserAchievements(userId: string): Promise<UserAchievementSummary> {
    const user = await this.getUserById(userId);
    const achievements = await this.achievementRepository.findByUserId(userId);
    const allBadges = await this.badgeRepository.findAll();
    const userStats = await this.getUserStats(userId);

    const badgeMap = new Map(allBadges.map(b => [b.id, b]));
    
    const unlockedBadges: Badge[] = [];
    const inProgressBadges: Array<{ badge: Badge; progress: number }> = [];

    for (const achievement of achievements) {
      const badge = badgeMap.get(achievement.badgeId);
      if (!badge) continue;

      if (achievement.isUnlocked()) {
        unlockedBadges.push(badge);
      } else if (achievement.progress > 0) {
        inProgressBadges.push({
          badge,
          progress: achievement.progress
        });
      }
    }

    // Add badges that haven't been started yet but have progress
    for (const badge of allBadges) {
      const hasAchievement = achievements.some(a => a.badgeId === badge.id);
      if (!hasAchievement) {
        const progress = badge.calculateProgress(userStats);
        if (progress > 0 && progress < 100) {
          inProgressBadges.push({ badge, progress });
        }
      }
    }

    return {
      userId,
      ecoPoints: user.ecoPoints.value,
      level: user.ecoPoints.getLevel(),
      unlockedBadges,
      inProgressBadges,
      totalExchanges: user.totalExchanges,
      itemsPosted: userStats.itemsPosted,
      rating: user.rating
    };
  }

  async getLeaderboard(query: LeaderboardQuery): Promise<LeaderboardEntry[]> {
    const limit = query.limit || 100;
    
    // Get all users sorted by eco points
    const allUsers = await this.userRepository.findAll();
    
    // Sort by eco points descending
    const sortedUsers = allUsers
      .sort((a, b) => b.ecoPoints.value - a.ecoPoints.value)
      .slice(0, limit);

    const leaderboard: LeaderboardEntry[] = [];
    let rank = 1;

    for (const user of sortedUsers) {
      // Check privacy settings (for now, we'll assume all users are public)
      // In a real implementation, you'd check user privacy preferences
      const isPrivate = false;

      leaderboard.push({
        userId: user.id.value,
        displayName: isPrivate ? 'Anonymous User' : user.profile.displayName,
        avatar: isPrivate ? undefined : user.profile.avatar,
        ecoPoints: user.ecoPoints.value,
        level: user.ecoPoints.getLevel(),
        totalExchanges: user.totalExchanges,
        rating: user.rating,
        rank,
        isPrivate
      });

      rank++;
    }

    return leaderboard;
  }

  async getAllBadges(): Promise<Badge[]> {
    return await this.badgeRepository.findAll();
  }

  async getBadgesByCategory(category: BadgeCategory): Promise<Badge[]> {
    return await this.badgeRepository.findByCategory(category);
  }

  async initializeDefaultBadges(): Promise<void> {
    const existingBadges = await this.badgeRepository.findAll();
    if (existingBadges.length > 0) {
      // Badges already initialized
      return;
    }

    const defaultBadges = this.getDefaultBadges();
    
    for (const badgeData of defaultBadges) {
      const badge = Badge.create(badgeData);
      await this.badgeRepository.save(badge);
    }
  }

  private getDefaultBadges() {
    return [
      // Milestone badges based on eco-points
      {
        name: 'Newcomer',
        description: 'Welcome to Re:UseNet! Start your reuse journey.',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 0,
          description: 'Join Re:UseNet'
        },
        ecoPointsReward: 10
      },
      {
        name: 'Beginner',
        description: 'Earned your first 100 eco-points!',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 100,
          description: 'Reach 100 eco-points'
        },
        ecoPointsReward: 25
      },
      {
        name: 'Intermediate',
        description: 'Reached 500 eco-points. You\'re making a difference!',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 500,
          description: 'Reach 500 eco-points'
        },
        ecoPointsReward: 50
      },
      {
        name: 'Advanced',
        description: 'Impressive! 2000 eco-points achieved.',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 2000,
          description: 'Reach 2000 eco-points'
        },
        ecoPointsReward: 100
      },
      {
        name: 'Expert',
        description: 'You\'re a reuse expert with 5000 eco-points!',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 5000,
          description: 'Reach 5000 eco-points'
        },
        ecoPointsReward: 250
      },
      {
        name: 'Champion',
        description: 'Legendary! 10000 eco-points and counting.',
        category: 'milestone' as BadgeCategory,
        requirement: {
          type: 'eco_points' as const,
          threshold: 10000,
          description: 'Reach 10000 eco-points'
        },
        ecoPointsReward: 500
      },
      // Exchange badges
      {
        name: 'First Exchange',
        description: 'Completed your first item exchange!',
        category: 'exchanging' as BadgeCategory,
        requirement: {
          type: 'exchanges' as const,
          threshold: 1,
          description: 'Complete 1 exchange'
        },
        ecoPointsReward: 20
      },
      {
        name: 'Active Exchanger',
        description: 'Completed 10 exchanges. Keep it up!',
        category: 'exchanging' as BadgeCategory,
        requirement: {
          type: 'exchanges' as const,
          threshold: 10,
          description: 'Complete 10 exchanges'
        },
        ecoPointsReward: 75
      },
      {
        name: 'Exchange Master',
        description: 'Wow! 50 successful exchanges.',
        category: 'exchanging' as BadgeCategory,
        requirement: {
          type: 'exchanges' as const,
          threshold: 50,
          description: 'Complete 50 exchanges'
        },
        ecoPointsReward: 200
      },
      {
        name: 'Community Hero',
        description: 'Amazing! 100 exchanges completed.',
        category: 'exchanging' as BadgeCategory,
        requirement: {
          type: 'exchanges' as const,
          threshold: 100,
          description: 'Complete 100 exchanges'
        },
        ecoPointsReward: 500
      },
      // Rating badges
      {
        name: 'Trusted Member',
        description: 'Maintained a 4.0+ rating. Great work!',
        category: 'community' as BadgeCategory,
        requirement: {
          type: 'rating' as const,
          threshold: 4.0,
          description: 'Achieve 4.0+ rating'
        },
        ecoPointsReward: 100
      },
      {
        name: 'Five Star Member',
        description: 'Perfect 5.0 rating! You\'re exceptional.',
        category: 'community' as BadgeCategory,
        requirement: {
          type: 'rating' as const,
          threshold: 5.0,
          description: 'Achieve 5.0 rating'
        },
        ecoPointsReward: 250
      }
    ];
  }

  private async getUserById(userId: string): Promise<User> {
    const user = await this.userRepository.findById(new UserId(userId));
    if (!user) {
      throw new Error('User not found');
    }
    return user;
  }

  private async getUserStats(userId: string): Promise<{
    ecoPoints: number;
    totalExchanges: number;
    itemsPosted: number;
    rating: number;
  }> {
    const user = await this.getUserById(userId);
    
    // For items posted, we would need to query the item repository
    // For now, we'll estimate based on eco points (10 points per item)
    const estimatedItemsPosted = Math.floor(
      user.ecoPoints.transactions.filter(t => t.reason.includes('Posted item')).length
    );

    return {
      ecoPoints: user.ecoPoints.value,
      totalExchanges: user.totalExchanges,
      itemsPosted: estimatedItemsPosted,
      rating: user.rating
    };
  }
}
