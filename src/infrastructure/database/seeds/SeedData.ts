import { DatabaseConnection } from '../DatabaseConnection';
import { User, CreateUserData } from '../../../domain/user/User';
import { Item, CreateItemData } from '../../../domain/item/Item';
import { Exchange, CreateExchangeData } from '../../../domain/exchange/Exchange';

export class SeedData {
  constructor(private db: DatabaseConnection) {}

  async seedUsers(): Promise<User[]> {
    console.log('Seeding users...');

    const usersData: CreateUserData[] = [
      {
        email: 'alice@example.com',
        profile: {
          displayName: 'Alice Johnson',
          phone: '+1-555-0101',
          isVerified: true,
          accountType: 'individual'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St, New York, NY 10001'
        }
      },
      {
        email: 'bob@example.com',
        profile: {
          displayName: 'Bob Smith',
          phone: '+1-555-0102',
          isVerified: true,
          accountType: 'individual'
        },
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '456 Broadway, New York, NY 10013'
        }
      },
      {
        email: 'carol@example.com',
        profile: {
          displayName: 'Carol Davis',
          phone: '+1-555-0103',
          isVerified: true,
          accountType: 'individual'
        },
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: '789 Park Ave, New York, NY 10021'
        }
      },
      {
        email: 'greenorg@example.com',
        profile: {
          displayName: 'Green Community Org',
          phone: '+1-555-0200',
          isVerified: true,
          accountType: 'organization'
        },
        location: {
          latitude: 40.7282,
          longitude: -73.7949,
          address: '100 Community Center Dr, Queens, NY 11375'
        }
      },
      {
        email: 'david@example.com',
        profile: {
          displayName: 'David Wilson',
          isVerified: false,
          accountType: 'individual'
        },
        location: {
          latitude: 40.6782,
          longitude: -73.9442,
          address: '321 Brooklyn Ave, Brooklyn, NY 11201'
        }
      }
    ];

    const users: User[] = [];
    
    for (const userData of usersData) {
      const user = User.create(userData);
      
      // Award some eco points to verified users
      if (user.profile.isVerified) {
        user.awardPoints(Math.floor(Math.random() * 500) + 100, 'Initial seed points');
        user.updateRating(Math.random() * 2 + 3); // Rating between 3-5
      }

      users.push(user);

      // Insert user into database
      const userDataForDb = user.toData();
      const query = `
        INSERT INTO users (
          id, email, display_name, phone, avatar, is_verified, account_type,
          latitude, longitude, address, eco_points, eco_points_transactions,
          rating, total_exchanges, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `;

      const params = [
        userDataForDb.id,
        userDataForDb.email,
        userDataForDb.profile.displayName,
        userDataForDb.profile.phone || null,
        userDataForDb.profile.avatar || null,
        userDataForDb.profile.isVerified,
        userDataForDb.profile.accountType,
        userDataForDb.location.latitude,
        userDataForDb.location.longitude,
        userDataForDb.location.address,
        userDataForDb.ecoPoints,
        JSON.stringify(userDataForDb.ecoPointsTransactions || []),
        userDataForDb.rating,
        userDataForDb.totalExchanges,
        userDataForDb.createdAt,
        userDataForDb.updatedAt
      ];

      await this.db.query(query, params);
    }

    console.log(`✓ Seeded ${users.length} users`);
    return users;
  }

  async seedItems(users: User[]): Promise<Item[]> {
    console.log('Seeding items...');

    const itemsData: Array<CreateItemData & { userIndex: number }> = [
      {
        userIndex: 0, // Alice
        userId: '',
        details: {
          title: 'Vintage Wooden Chair',
          description: 'Beautiful vintage wooden chair in good condition. Perfect for dining room or office.',
          category: 'Furniture',
          tags: ['vintage', 'wooden', 'chair', 'dining'],
          images: ['chair1.jpg', 'chair2.jpg'],
          condition: 'good',
          pickupInstructions: 'Available for pickup weekends only'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St, New York, NY 10001'
        }
      },
      {
        userIndex: 1, // Bob
        userId: '',
        details: {
          title: 'Electric Kettle',
          description: 'Barely used electric kettle, works perfectly. Great for tea and coffee lovers.',
          category: 'Kitchen',
          tags: ['electric', 'kettle', 'kitchen', 'appliance'],
          images: ['kettle1.jpg'],
          condition: 'like-new'
        },
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '456 Broadway, New York, NY 10013'
        }
      },
      {
        userIndex: 2, // Carol
        userId: '',
        details: {
          title: 'Stack of Programming Books',
          description: 'Collection of programming books including JavaScript, Python, and React. Great for beginners.',
          category: 'Books',
          tags: ['programming', 'books', 'javascript', 'python', 'react', 'education'],
          images: ['books1.jpg', 'books2.jpg'],
          condition: 'good'
        },
        location: {
          latitude: 40.7505,
          longitude: -73.9934,
          address: '789 Park Ave, New York, NY 10021'
        }
      },
      {
        userIndex: 3, // Green Org
        userId: '',
        details: {
          title: 'Office Supplies Bundle',
          description: 'Large collection of office supplies including pens, paper, folders, and organizers.',
          category: 'Office',
          tags: ['office', 'supplies', 'stationery', 'bulk'],
          images: ['office1.jpg'],
          condition: 'new',
          pickupInstructions: 'Pickup available Monday-Friday 9AM-5PM'
        },
        location: {
          latitude: 40.7282,
          longitude: -73.7949,
          address: '100 Community Center Dr, Queens, NY 11375'
        }
      },
      {
        userIndex: 0, // Alice
        userId: '',
        details: {
          title: 'Yoga Mat',
          description: 'Lightly used yoga mat, perfect for home workouts or yoga classes.',
          category: 'Sports',
          tags: ['yoga', 'fitness', 'exercise', 'mat'],
          images: ['yoga1.jpg'],
          condition: 'good'
        },
        location: {
          latitude: 40.7128,
          longitude: -74.0060,
          address: '123 Main St, New York, NY 10001'
        }
      },
      {
        userIndex: 1, // Bob
        userId: '',
        details: {
          title: 'Potted Plants',
          description: 'Three small potted plants - snake plant, pothos, and spider plant. Great for beginners.',
          category: 'Garden',
          tags: ['plants', 'indoor', 'garden', 'green', 'air-purifying'],
          images: ['plants1.jpg', 'plants2.jpg'],
          condition: 'good',
          pickupInstructions: 'Handle with care, bring your own containers'
        },
        location: {
          latitude: 40.7589,
          longitude: -73.9851,
          address: '456 Broadway, New York, NY 10013'
        }
      }
    ];

    const items: Item[] = [];
    
    for (const itemData of itemsData) {
      const user = users[itemData.userIndex];
      itemData.userId = user.id.value;
      
      const item = Item.create(itemData);
      items.push(item);

      // Insert item into database
      const itemDataForDb = item.toData();
      const query = `
        INSERT INTO items (
          id, user_id, title, description, category, tags, images, condition,
          status, latitude, longitude, address, dimensions, pickup_instructions,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
      `;

      const params = [
        itemDataForDb.id,
        itemDataForDb.userId,
        itemDataForDb.details.title,
        itemDataForDb.details.description,
        itemDataForDb.details.category,
        JSON.stringify(itemDataForDb.details.tags),
        JSON.stringify(itemDataForDb.details.images),
        itemDataForDb.details.condition,
        itemDataForDb.status,
        itemDataForDb.location.latitude,
        itemDataForDb.location.longitude,
        itemDataForDb.location.address,
        itemDataForDb.details.dimensions ? JSON.stringify(itemDataForDb.details.dimensions) : null,
        itemDataForDb.details.pickupInstructions || null,
        itemDataForDb.createdAt,
        itemDataForDb.updatedAt
      ];

      await this.db.query(query, params);
    }

    console.log(`✓ Seeded ${items.length} items`);
    return items;
  }

  async seedExchanges(users: User[], items: Item[]): Promise<Exchange[]> {
    console.log('Seeding exchanges...');

    const exchangesData: Array<CreateExchangeData & { giverIndex: number; receiverIndex: number; itemIndex: number }> = [
      {
        giverIndex: 0, // Alice
        receiverIndex: 1, // Bob
        itemIndex: 0, // Vintage Chair
        itemId: '',
        giverId: '',
        receiverId: '',
        scheduledPickup: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) // 2 days from now
      },
      {
        giverIndex: 1, // Bob
        receiverIndex: 2, // Carol
        itemIndex: 1, // Electric Kettle
        itemId: '',
        giverId: '',
        receiverId: ''
      }
    ];

    const exchanges: Exchange[] = [];
    
    for (const exchangeData of exchangesData) {
      const giver = users[exchangeData.giverIndex];
      const receiver = users[exchangeData.receiverIndex];
      const item = items[exchangeData.itemIndex];
      
      exchangeData.giverId = giver.id.value;
      exchangeData.receiverId = receiver.id.value;
      exchangeData.itemId = item.id.value;
      
      const exchange = Exchange.create(exchangeData);
      
      // Accept the first exchange and complete it with ratings
      if (exchangeData.giverIndex === 0) {
        exchange.accept(exchangeData.scheduledPickup);
        exchange.complete(50); // Award 50 eco points
        
        // Add ratings
        exchange.rateGiver({
          score: 5,
          review: 'Great item, exactly as described!'
        });
        
        exchange.rateReceiver({
          score: 4,
          review: 'Smooth pickup, very polite.'
        });
        
        // Update item status
        item.markAsExchanged();
        
        // Update user stats
        giver.incrementExchangeCount();
        receiver.incrementExchangeCount();
        giver.awardPoints(50, 'Completed exchange');
        receiver.awardPoints(25, 'Received item');
      }
      
      exchanges.push(exchange);

      // Insert exchange into database
      const exchangeDataForDb = exchange.toData();
      const query = `
        INSERT INTO exchanges (
          id, item_id, giver_id, receiver_id, status, scheduled_pickup,
          completed_at, giver_rating_score, giver_rating_review, giver_rating_rated_by, giver_rating_rated_at,
          receiver_rating_score, receiver_rating_review, receiver_rating_rated_by, receiver_rating_rated_at,
          eco_points_awarded, cancellation_reason, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
        )
      `;

      const params = [
        exchangeDataForDb.id,
        exchangeDataForDb.itemId,
        exchangeDataForDb.giverId,
        exchangeDataForDb.receiverId,
        exchangeDataForDb.status,
        exchangeDataForDb.scheduledPickup || null,
        exchangeDataForDb.completedAt || null,
        exchangeDataForDb.giverRating?.score || null,
        exchangeDataForDb.giverRating?.review || null,
        exchangeDataForDb.giverRating?.ratedBy || null,
        exchangeDataForDb.giverRating?.ratedAt || null,
        exchangeDataForDb.receiverRating?.score || null,
        exchangeDataForDb.receiverRating?.review || null,
        exchangeDataForDb.receiverRating?.ratedBy || null,
        exchangeDataForDb.receiverRating?.ratedAt || null,
        exchangeDataForDb.ecoPointsAwarded,
        exchangeDataForDb.cancellationReason || null,
        exchangeDataForDb.createdAt,
        exchangeDataForDb.updatedAt
      ];

      await this.db.query(query, params);
    }

    console.log(`✓ Seeded ${exchanges.length} exchanges`);
    return exchanges;
  }

  async seedAll(): Promise<void> {
    console.log('Starting database seeding...');
    
    try {
      const users = await this.seedUsers();
      const items = await this.seedItems(users);
      const exchanges = await this.seedExchanges(users, items);
      
      console.log('✓ Database seeding completed successfully!');
      console.log(`  - ${users.length} users`);
      console.log(`  - ${items.length} items`);
      console.log(`  - ${exchanges.length} exchanges`);
    } catch (error) {
      console.error('✗ Database seeding failed:', error);
      throw error;
    }
  }

  async clearAll(): Promise<void> {
    console.log('Clearing all seed data...');
    
    // Delete in reverse order of dependencies
    await this.db.query('DELETE FROM exchanges');
    await this.db.query('DELETE FROM items');
    await this.db.query('DELETE FROM users');
    
    console.log('✓ All seed data cleared');
  }
}