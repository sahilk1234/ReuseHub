# Points Application Service

The Points Application Service implements the gamification system for Re:UseNet, including eco-points calculation, badge management, and community leaderboards.

## Features

### 1. Eco-Points System
- Award points for various activities (posting items, completing exchanges, verification)
- Track point transactions with reasons and timestamps
- Automatic level calculation based on points

### 2. Badge System
- Multiple badge categories: posting, exchanging, community, milestone, special
- Automatic badge unlocking based on user achievements
- Progress tracking for badges in progress
- Bonus eco-points awarded when badges are unlocked

### 3. Achievement Tracking
- Track user progress towards badges
- View unlocked badges and badges in progress
- Automatic achievement updates when user stats change

### 4. Leaderboards
- Community-wide leaderboards sorted by eco-points
- Privacy controls for anonymous users
- Display user stats including level, exchanges, and rating

## Usage Examples

### Award Points for Item Posting

```typescript
const pointsService = new PointsApplicationService(
  userRepository,
  badgeRepository,
  achievementRepository
);

// Award points when user posts an item
await pointsService.awardPointsForItemPosting(userId, itemId);
```

### Award Points for Exchange Completion

```typescript
// Award points to both giver and receiver
await pointsService.awardPointsForExchange(giverId, receiverId, exchangeId);
```

### Check and Unlock Badges

```typescript
// Automatically check if user is eligible for any badges
const newlyUnlockedBadges = await pointsService.checkAndUnlockBadges(userId);

if (newlyUnlockedBadges.length > 0) {
  console.log(`User unlocked ${newlyUnlockedBadges.length} new badges!`);
}
```

### Get User Achievements

```typescript
const achievements = await pointsService.getUserAchievements(userId);

console.log(`User Level: ${achievements.level}`);
console.log(`Eco-Points: ${achievements.ecoPoints}`);
console.log(`Unlocked Badges: ${achievements.unlockedBadges.length}`);
console.log(`In Progress: ${achievements.inProgressBadges.length}`);
```

### Get Leaderboard

```typescript
const leaderboard = await pointsService.getLeaderboard({
  limit: 100,
  includePrivateUsers: false
});

leaderboard.forEach((entry, index) => {
  console.log(`${entry.rank}. ${entry.displayName} - ${entry.ecoPoints} points (${entry.level})`);
});
```

### Initialize Default Badges

```typescript
// Run once during application setup
await pointsService.initializeDefaultBadges();
```

## Points Configuration

The service uses the following point values (configurable):

- **Item Posting**: 10 points
- **Exchange (Giver)**: 25 points
- **Exchange (Receiver)**: 15 points
- **Account Verification**: 50 points

## Badge Categories

1. **Milestone**: Based on total eco-points (Newcomer, Beginner, Intermediate, Advanced, Expert, Champion)
2. **Exchanging**: Based on number of exchanges (First Exchange, Active Exchanger, Exchange Master, Community Hero)
3. **Community**: Based on user rating (Trusted Member, Five Star Member)
4. **Posting**: Based on items posted (future implementation)
5. **Special**: Custom badges for special achievements

## Level System

Users progress through levels based on eco-points:

- **Newcomer**: 0-99 points
- **Beginner**: 100-499 points
- **Intermediate**: 500-1,999 points
- **Advanced**: 2,000-4,999 points
- **Expert**: 5,000-9,999 points
- **Champion**: 10,000+ points

## Integration with Other Services

The Points Application Service integrates with:

- **UserApplicationService**: Award points for verification
- **ItemApplicationService**: Award points for posting items
- **ExchangeApplicationService**: Award points for completed exchanges

## Database Schema

### Badges Table
- Stores badge definitions with requirements and rewards
- Categories and requirement types are enforced with CHECK constraints

### Achievements Table
- Tracks user progress towards badges
- Unique constraint on (user_id, badge_id) to prevent duplicates
- Progress stored as percentage (0-100)

## Future Enhancements

1. Community-specific leaderboards
2. Time-based leaderboards (weekly, monthly)
3. Custom badge creation for organizations
4. Achievement notifications
5. Badge sharing on social media
6. Seasonal challenges and events
