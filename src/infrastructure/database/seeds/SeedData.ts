import { DatabaseConnection } from '../DatabaseConnection';
import { User, CreateUserData } from '../../../domain/user/User';
import { Item, CreateItemData } from '../../../domain/item/Item';
import { Exchange, CreateExchangeData } from '../../../domain/exchange/Exchange';

export class SeedData {
  constructor(private db: DatabaseConnection) {}

  async seedUsers(): Promise<User[]> {
    console.log('Seeding users...');

    const seedLocations = [
      { address: '123 Main St, New York, NY 10001', latitude: 40.7128, longitude: -74.0060 },
      { address: '456 Market St, San Francisco, CA 94103', latitude: 37.7749, longitude: -122.4194 },
      { address: '789 Pine St, Seattle, WA 98101', latitude: 47.6062, longitude: -122.3321 },
      { address: '200 W Madison St, Chicago, IL 60606', latitude: 41.8781, longitude: -87.6298 },
      { address: '500 Congress Ave, Austin, TX 78701', latitude: 30.2672, longitude: -97.7431 },
      { address: '1600 Larimer St, Denver, CO 80202', latitude: 39.7392, longitude: -104.9903 },
      { address: '1 Beacon St, Boston, MA 02108', latitude: 42.3601, longitude: -71.0589 },
      { address: '700 S Flower St, Los Angeles, CA 90017', latitude: 34.0522, longitude: -118.2437 },
      { address: '191 Peachtree St NE, Atlanta, GA 30303', latitude: 33.7490, longitude: -84.3880 },
      { address: '1122 SW Morrison St, Portland, OR 97205', latitude: 45.5152, longitude: -122.6784 }
    ];

    const usersData: CreateUserData[] = Array.from({ length: 10 }).map((_, i) => ({
      email: `demo${i + 1}@example.com`,
      profile: {
        displayName: `Demo User ${i + 1}`,
        phone: `+1-555-01${(i + 1).toString().padStart(2, '0')}`,
        isVerified: i % 2 === 0, // every other user verified
        accountType: i === 0 ? 'organization' : 'individual'
      },
      location: seedLocations[i]
    }));

    const users: User[] = [];
    
    for (const userData of usersData) {
      const user = User.create(userData);
      
      // Award some eco points to verified users
      if (user.profile.isVerified) {
        user.awardPoints(Math.floor(Math.random() * 500) + 100, 'Initial seed points');
        user.updateRating(Math.random() * 2 + 3); // Rating between 3-5
      }

      // Insert or update user idempotently on email, then fetch the persisted row to get stable id
      const userDataForDb = user.toData();
      const query = `
        INSERT INTO users (
          id, email, display_name, phone, avatar, is_verified, account_type,
          latitude, longitude, address, eco_points, eco_points_transactions,
          rating, total_exchanges, created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (email) DO UPDATE SET
          display_name = EXCLUDED.display_name,
          phone = EXCLUDED.phone,
          avatar = EXCLUDED.avatar,
          is_verified = EXCLUDED.is_verified,
          account_type = EXCLUDED.account_type,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          address = EXCLUDED.address,
          eco_points = EXCLUDED.eco_points,
          eco_points_transactions = EXCLUDED.eco_points_transactions,
          rating = EXCLUDED.rating,
          total_exchanges = EXCLUDED.total_exchanges,
          updated_at = EXCLUDED.updated_at
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
        JSON.stringify(userDataForDb.ecoPointsTransactions ? [...userDataForDb.ecoPointsTransactions] : []),
        userDataForDb.rating,
        userDataForDb.totalExchanges,
        userDataForDb.createdAt,
        userDataForDb.updatedAt
      ];

      await this.db.query(query, params);

      // Get persisted user id (existing or newly inserted)
      const row = await this.db.query<{ id: string }>('SELECT id FROM users WHERE email = $1', [userData.email]);
      const persistedId = row.rows[0]?.id || userDataForDb.id;
      const persisted = User.fromData({
        ...userDataForDb,
        id: persistedId,
        profile: user.profile,
        location: user.location.toData(),
        ecoPoints: user.ecoPoints.value,
        ecoPointsTransactions: [...user.ecoPoints.transactions],
        rating: user.rating,
        totalExchanges: user.totalExchanges
      });
      users.push(persisted);
    }

    console.log(`✓ Seeded ${users.length} users`);
    return users;
  }

  async seedItems(users: User[]): Promise<Item[]> {
    console.log('Seeding items...');

    const productTemplates = [
      {
        title: 'Vintage Wooden Chair',
        description: 'Classic solid-wood dining chair, minor scuffs, very sturdy.',
        category: 'Furniture',
        tags: ['vintage', 'chair', 'wood'],
        images: [
          'https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1523419400520-2234951cf4aa?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
        pickupInstructions: 'Weekends preferred',
      },
      {
        title: 'Electric Kettle',
        description: '1.7L stainless steel, auto shut-off, barely used.',
        category: 'Kitchen',
        tags: ['kettle', 'appliance'],
        images: [
          'https://images.unsplash.com/photo-1509475826633-fed577a2c71b?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Mountain Bike Helmet',
        description: 'MIPS medium size, no crashes, matte black.',
        category: 'Sports',
        tags: ['helmet', 'bike', 'mips'],
        images: [
          'https://images.unsplash.com/photo-1508609540374-0ef3c9e8ab78?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Coffee Maker',
        description: 'Drip coffee machine with reusable filter, works great.',
        category: 'Kitchen',
        tags: ['coffee', 'appliance'],
        images: [
          'https://images.unsplash.com/photo-1509042239860-f550ce710b93?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: '24” IPS Monitor',
        description: '1080p IPS, HDMI/DisplayPort, includes stand.',
        category: 'Electronics',
        tags: ['monitor', 'display'],
        images: [
          'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'DSLR Camera Backpack',
        description: 'Fits body + 3 lenses, rain cover included.',
        category: 'Accessories',
        tags: ['camera', 'bag'],
        images: [
          'https://images.unsplash.com/photo-1523419400520-2234951cf4aa?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Yoga Mat',
        description: '5mm thick, non-slip, teal color.',
        category: 'Sports',
        tags: ['yoga', 'fitness'],
        images: [
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Standing Desk Converter',
        description: 'Manual lift, fits dual monitors, black.',
        category: 'Furniture',
        tags: ['desk', 'standing'],
        images: [
          'https://images.unsplash.com/photo-1487014679447-9f8336841d58?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Bedside Table Lamp',
        description: 'Warm LED bulb included, fabric shade.',
        category: 'Home',
        tags: ['lamp', 'lighting'],
        images: [
          'https://images.unsplash.com/photo-1493663284031-b7e3aefcae8e?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Bluetooth Speaker',
        description: 'Portable, 12h battery, USB-C charge.',
        category: 'Electronics',
        tags: ['audio', 'speaker'],
        images: [
          'https://images.unsplash.com/photo-1519666213634-3493b6dcd82e?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Air Fryer 3.5qt',
        description: 'Non-stick basket, includes manual.',
        category: 'Kitchen',
        tags: ['air-fryer', 'appliance'],
        images: [
          'https://images.unsplash.com/photo-1510626176961-4b37d0b4e904?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Hiking Backpack 30L',
        description: 'Lightweight daypack with rain cover.',
        category: 'Outdoors',
        tags: ['backpack', 'hiking'],
        images: [
          'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Floor Pump for Road Bike',
        description: 'With gauge, Presta/Schrader compatible.',
        category: 'Sports',
        tags: ['bike', 'pump'],
        images: [
          'https://images.unsplash.com/photo-1508606572321-901ea443707f?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Box of Novels (5)',
        description: 'Assorted contemporary fiction, good condition.',
        category: 'Books',
        tags: ['books', 'fiction'],
        images: [
          'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Kids Toy Bundle',
        description: 'Wooden blocks, puzzle, small car set.',
        category: 'Kids',
        tags: ['toys', 'kids'],
        images: [
          'https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Stainless Cookware Set (3pc)',
        description: 'Saucepan, sauté pan, stock pot with lids.',
        category: 'Kitchen',
        tags: ['cookware', 'kitchen'],
        images: [
          'https://images.unsplash.com/photo-1475855581690-80accde3ae2b?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Potted Snake Plant',
        description: '12” tall, low maintenance, ceramic pot.',
        category: 'Home',
        tags: ['plant', 'indoor'],
        images: [
          'https://images.unsplash.com/photo-1501004318641-b39e6451bec6?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Power Drill + Bits',
        description: 'Cordless 18V, two batteries, bit set included.',
        category: 'Tools',
        tags: ['drill', 'tools'],
        images: [
          'https://images.unsplash.com/photo-1503389152951-9f343605f61e?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'good' as const,
      },
      {
        title: 'Patio String Lights',
        description: '48ft LED shatterproof bulbs, warm white.',
        category: 'Home',
        tags: ['lights', 'patio'],
        images: [
          'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
      {
        title: 'Foam Roller',
        description: '24” medium density, great for recovery.',
        category: 'Sports',
        tags: ['fitness', 'recovery'],
        images: [
          'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80'
        ],
        condition: 'like-new' as const,
      },
    ];

    // Create ~20 distinct items, distribute across users round-robin
    const itemsData: Array<CreateItemData & { userIndex: number }> = productTemplates.map((template, idx) => {
      const userIndex = idx % users.length;
      const userLoc = users[userIndex].location;
      return {
        userIndex,
        userId: '',
        details: {
          title: template.title,
          description: template.description,
          category: template.category,
          tags: template.tags,
          images: template.images,
          condition: template.condition,
          pickupInstructions: template.pickupInstructions,
        },
        location: {
          latitude: userLoc.latitude,
          longitude: userLoc.longitude,
          address: userLoc.address,
        },
      };
    });

    const items: Item[] = [];
    
    for (const itemData of itemsData) {
      const user = users[itemData.userIndex];
      itemData.userId = user.id.value;
      
      const item = Item.create(itemData);
      items.push(item);

      // Insert item into database (idempotent) — if already exists, update core fields
      const itemDataForDb = item.toData();
      const query = `
        INSERT INTO items (
          id, user_id, title, description, category, tags, images, condition,
          status, latitude, longitude, address, dimensions, pickup_instructions,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
        )
        ON CONFLICT (id) DO UPDATE SET
          user_id = EXCLUDED.user_id,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          tags = EXCLUDED.tags,
          images = EXCLUDED.images,
          condition = EXCLUDED.condition,
          status = EXCLUDED.status,
          latitude = EXCLUDED.latitude,
          longitude = EXCLUDED.longitude,
          address = EXCLUDED.address,
          dimensions = EXCLUDED.dimensions,
          pickup_instructions = EXCLUDED.pickup_instructions,
          updated_at = EXCLUDED.updated_at
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
        // valid transitions: available -> pending -> exchanged
        item.markAsPending();
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
