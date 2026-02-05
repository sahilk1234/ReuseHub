import { Exchange, CreateExchangeData } from '../../domain/exchange/Exchange';
import { ExchangeId } from '../../domain/exchange/value-objects/ExchangeId';
import { ExchangeStatusValue } from '../../domain/exchange/value-objects/ExchangeStatus';
import { RatingData } from '../../domain/exchange/value-objects/Rating';
import { UserId } from '../../domain/user/value-objects/UserId';
import { ItemId } from '../../domain/item/value-objects/ItemId';
import { IExchangeRepository, ExchangeSearchResult } from '../../infrastructure/repositories/IExchangeRepository';
import { IItemRepository } from '../../infrastructure/repositories/IItemRepository';
import { IUserRepository } from '../../infrastructure/repositories/IUserRepository';
import { INotificationService } from '../../infrastructure/services/INotificationService';

export interface InitiateExchangeCommand {
  itemId: string;
  giverId: string;
  receiverId: string;
  message?: string;
  scheduledPickup?: Date;
}

export interface AcceptExchangeCommand {
  exchangeId: string;
  userId: string; // Must be the receiver
  scheduledPickup?: Date;
}

export interface CompleteExchangeCommand {
  exchangeId: string;
  userId: string; // Must be a participant
  ecoPointsAwarded?: number;
}

export interface CompleteExchangeResult {
  completed: boolean;
}

export interface CancelExchangeCommand {
  exchangeId: string;
  userId: string; // Must be a participant
  reason: string;
}

export interface RateExchangeCommand {
  exchangeId: string;
  raterId: string;
  rating: number; // 1-5
  review?: string;
}

export interface GetExchangeHistoryQuery {
  userId: string;
  status?: ExchangeStatusValue;
  asGiver?: boolean;
  asReceiver?: boolean;
  limit?: number;
  offset?: number;
}

export interface ExchangeInitiationResult {
  exchangeId: string;
  notificationSent: boolean;
}

export interface IExchangeApplicationService {
  initiateExchange(command: InitiateExchangeCommand): Promise<ExchangeInitiationResult>;
  acceptExchange(command: AcceptExchangeCommand): Promise<void>;
  completeExchange(command: CompleteExchangeCommand): Promise<CompleteExchangeResult>;
  cancelExchange(command: CancelExchangeCommand): Promise<void>;
  rateExchange(command: RateExchangeCommand): Promise<void>;
  getExchangeDetails(exchangeId: string): Promise<Exchange>;
  getExchangeHistory(query: GetExchangeHistoryQuery): Promise<ExchangeSearchResult>;
  getUserActiveExchanges(userId: string): Promise<Exchange[]>;
  getUserCompletedExchanges(userId: string): Promise<Exchange[]>;
  getOverdueExchanges(): Promise<Exchange[]>;
  getUnratedExchanges(userId: string): Promise<Exchange[]>;
}

export class ExchangeApplicationService implements IExchangeApplicationService {
  constructor(
    private readonly exchangeRepository: IExchangeRepository,
    private readonly itemRepository: IItemRepository,
    private readonly userRepository: IUserRepository,
    private readonly notificationService: INotificationService
  ) {}

  async initiateExchange(command: InitiateExchangeCommand): Promise<ExchangeInitiationResult> {
    // Validate item exists and is available
    const item = await this.itemRepository.findById(new ItemId(command.itemId));
    if (!item) {
      throw new Error('Item not found');
    }
    if (!item.isAvailableForExchange()) {
      throw new Error('Item is not available for exchange');
    }

    // Validate users exist and are verified
    const giver = await this.userRepository.findById(new UserId(command.giverId));
    const receiver = await this.userRepository.findById(new UserId(command.receiverId));
    
    if (!giver || !receiver) {
      throw new Error('One or both users not found');
    }
    if (!giver.profile.isVerified || !receiver.profile.isVerified) {
      throw new Error('Both users must be verified to exchange items');
    }

    // Verify the giver owns the item
    if (!item.belongsToUser(new UserId(command.giverId))) {
      throw new Error('Only the item owner can initiate exchanges');
    }

    // Verify users can exchange with each other
    if (!giver.canExchangeWith(receiver)) {
      throw new Error('Users cannot exchange with each other');
    }

    // Check if there's already an active exchange for this item
    const existingExchange = await this.exchangeRepository.findExchangeForItem(
      new ItemId(command.itemId)
    );
    if (existingExchange && (existingExchange.status.value === 'requested' || existingExchange.status.value === 'accepted')) {
      throw new Error('There is already an active exchange for this item');
    }

    // Create exchange
    const exchangeData: CreateExchangeData = {
      itemId: command.itemId,
      giverId: command.giverId,
      receiverId: command.receiverId,
      scheduledPickup: command.scheduledPickup
    };

    const exchange = Exchange.create(exchangeData);
    try {
      await this.exchangeRepository.save(exchange);
    } catch (error: any) {
      if (error?.code === '23505') {
        throw new Error('There is already an active exchange for this item');
      }
      throw error;
    }

    // Update item status to pending
    item.markAsPending();
    await this.itemRepository.save(item);

    // Send notification to receiver
    let notificationSent = false;
    try {
      await this.sendExchangeRequestNotification(exchange, giver, receiver, command.message);
      notificationSent = true;
    } catch (error) {
      console.error('Failed to send exchange request notification:', error);
    }

    return {
      exchangeId: exchange.id.value,
      notificationSent
    };
  }

  async acceptExchange(command: AcceptExchangeCommand): Promise<void> {
    const exchange = await this.getExchangeById(command.exchangeId);
    
    // Verify the user is the receiver
    if (!exchange.isReceiver(new UserId(command.userId))) {
      throw new Error('Only the receiver can accept an exchange');
    }

    exchange.accept(command.scheduledPickup);
    await this.exchangeRepository.save(exchange);

    // Send notification to giver
    try {
      const giver = await this.userRepository.findById(exchange.giverId);
      const receiver = await this.userRepository.findById(exchange.receiverId);
      if (giver && receiver) {
        await this.sendExchangeAcceptedNotification(exchange, giver, receiver);
      }
    } catch (error) {
      console.error('Failed to send exchange accepted notification:', error);
    }
  }

  async completeExchange(command: CompleteExchangeCommand): Promise<CompleteExchangeResult> {
    const exchange = await this.getExchangeById(command.exchangeId);
    
    // Verify the user is a participant
    if (!exchange.isParticipant(new UserId(command.userId))) {
      throw new Error('Only exchange participants can complete an exchange');
    }

    const bothConfirmed = exchange.confirmHandoffBy(new UserId(command.userId));
    await this.exchangeRepository.save(exchange);

    if (!bothConfirmed) {
      return { completed: false };
    }

    // Calculate eco points (base points + bonus for quick completion)
    const basePoints = 100;
    const daysToComplete = exchange.getDurationInDays();
    const quickCompletionBonus = daysToComplete <= 3 ? 25 : 0;
    const totalPoints = command.ecoPointsAwarded || (basePoints + quickCompletionBonus);

    exchange.complete(totalPoints);
    await this.exchangeRepository.save(exchange);

    // Update item status to exchanged
    const item = await this.itemRepository.findById(exchange.itemId);
    if (item) {
      item.markAsExchanged();
      await this.itemRepository.save(item);
    }

    // Award eco points to both users
    const giver = await this.userRepository.findById(exchange.giverId);
    const receiver = await this.userRepository.findById(exchange.receiverId);
    
    if (giver) {
      giver.awardPoints(totalPoints, `Exchange completed - gave away ${item?.details.toData().title || 'item'}`);
      await this.userRepository.save(giver);
    }
    
    if (receiver) {
      receiver.awardPoints(Math.floor(totalPoints * 0.5), `Exchange completed - received ${item?.details.toData().title || 'item'}`);
      await this.userRepository.save(receiver);
    }

    // Send completion notifications
    try {
      if (giver && receiver) {
        await this.sendExchangeCompletedNotification(exchange, giver, receiver, totalPoints);
      }
    } catch (error) {
      console.error('Failed to send exchange completed notification:', error);
    }

    return { completed: true };
  }

  async cancelExchange(command: CancelExchangeCommand): Promise<void> {
    const exchange = await this.getExchangeById(command.exchangeId);
    
    // Verify the user is a participant
    if (!exchange.isParticipant(new UserId(command.userId))) {
      throw new Error('Only exchange participants can cancel an exchange');
    }

    exchange.cancel(command.reason);
    await this.exchangeRepository.save(exchange);

    // Update item status back to available
    const item = await this.itemRepository.findById(exchange.itemId);
    if (item) {
      item.makeAvailable();
      await this.itemRepository.save(item);
    }

    // Send notification to the other participant
    try {
      const giver = await this.userRepository.findById(exchange.giverId);
      const receiver = await this.userRepository.findById(exchange.receiverId);
      const canceller = exchange.isGiver(new UserId(command.userId)) ? giver : receiver;
      const otherParty = exchange.isGiver(new UserId(command.userId)) ? receiver : giver;
      
      if (canceller && otherParty) {
        await this.sendExchangeCancelledNotification(exchange, canceller, otherParty, command.reason);
      }
    } catch (error) {
      console.error('Failed to send exchange cancelled notification:', error);
    }
  }

  async rateExchange(command: RateExchangeCommand): Promise<void> {
    if (command.rating < 1 || command.rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const exchange = await this.getExchangeById(command.exchangeId);
    
    // Verify the user can rate this exchange
    if (!exchange.canBeRatedBy(new UserId(command.raterId))) {
      throw new Error('You cannot rate this exchange');
    }

    const ratingData: Omit<RatingData, 'ratedBy' | 'ratedAt'> = {
      score: command.rating,
      review: command.review
    };

    // Determine if rating the giver or receiver
    if (exchange.isReceiver(new UserId(command.raterId))) {
      // Receiver is rating the giver
      exchange.rateGiver(ratingData);
    } else {
      // Giver is rating the receiver
      exchange.rateReceiver(ratingData);
    }

    await this.exchangeRepository.save(exchange);

    // Update user ratings if both parties have been rated
    if (exchange.hasBeenRated()) {
      await this.updateUserRatings(exchange);
    }
  }

  async getExchangeDetails(exchangeId: string): Promise<Exchange> {
    return await this.getExchangeById(exchangeId);
  }

  async getExchangeHistory(query: GetExchangeHistoryQuery): Promise<ExchangeSearchResult> {
    const userId = new UserId(query.userId);
    
    if (query.asGiver && query.asReceiver) {
      // Get all exchanges for user
      return await this.exchangeRepository.findUserExchangeHistory(userId, query.limit, query.offset);
    } else if (query.asGiver) {
      // Get exchanges where user is giver
      const exchanges = await this.exchangeRepository.findUserAsGiver(userId);
      return {
        exchanges: exchanges.slice(query.offset || 0, (query.offset || 0) + (query.limit || 20)),
        totalCount: exchanges.length,
        hasMore: exchanges.length > (query.offset || 0) + (query.limit || 20)
      };
    } else if (query.asReceiver) {
      // Get exchanges where user is receiver
      const exchanges = await this.exchangeRepository.findUserAsReceiver(userId);
      return {
        exchanges: exchanges.slice(query.offset || 0, (query.offset || 0) + (query.limit || 20)),
        totalCount: exchanges.length,
        hasMore: exchanges.length > (query.offset || 0) + (query.limit || 20)
      };
    } else {
      // Get all exchanges for user
      return await this.exchangeRepository.findUserExchangeHistory(userId, query.limit, query.offset);
    }
  }

  async getUserActiveExchanges(userId: string): Promise<Exchange[]> {
    return await this.exchangeRepository.findUserPendingExchanges(new UserId(userId));
  }

  async getUserCompletedExchanges(userId: string): Promise<Exchange[]> {
    return await this.exchangeRepository.findUserCompletedExchanges(new UserId(userId));
  }

  async getOverdueExchanges(): Promise<Exchange[]> {
    return await this.exchangeRepository.findOverdueExchanges();
  }

  async getUnratedExchanges(userId: string): Promise<Exchange[]> {
    const completedExchanges = await this.exchangeRepository.findUserCompletedExchanges(new UserId(userId));
    return completedExchanges.filter(exchange => exchange.canBeRatedBy(new UserId(userId)));
  }

  private async getExchangeById(exchangeId: string): Promise<Exchange> {
    const exchange = await this.exchangeRepository.findById(new ExchangeId(exchangeId));
    if (!exchange) {
      throw new Error('Exchange not found');
    }
    return exchange;
  }

  private async updateUserRatings(exchange: Exchange): Promise<void> {
    // Update giver's rating
    const giverRating = await this.exchangeRepository.getAverageRatingForUser(exchange.giverId);
    const giver = await this.userRepository.findById(exchange.giverId);
    if (giver) {
      giver.updateRating(giverRating);
      await this.userRepository.save(giver);
    }

    // Update receiver's rating
    const receiverRating = await this.exchangeRepository.getAverageRatingForUser(exchange.receiverId);
    const receiver = await this.userRepository.findById(exchange.receiverId);
    if (receiver) {
      receiver.updateRating(receiverRating);
      await this.userRepository.save(receiver);
    }
  }

  private async sendExchangeRequestNotification(exchange: Exchange, giver: any, receiver: any, message?: string): Promise<void> {
    const item = await this.itemRepository.findById(exchange.itemId);
    const itemTitle = item?.details.toData().title || 'an item';

    const subject = `New Exchange Request - ${itemTitle}`;
    const body = `
      <h2>You have a new exchange request!</h2>
      <p>Hi ${receiver.profile.displayName},</p>
      <p><strong>${giver.profile.displayName}</strong> would like to give you <strong>${itemTitle}</strong>.</p>
      ${message ? `<p><strong>Message:</strong> ${message}</p>` : ''}
      <p>You can view the item details and accept or decline this request in your Re:UseNet dashboard.</p>
      <p><a href="${process.env.FRONTEND_URL}/exchanges/${exchange.id.value}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Exchange Request</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await this.notificationService.sendEmail(receiver.email.value, subject, body, true);
  }

  private async sendExchangeAcceptedNotification(exchange: Exchange, giver: any, receiver: any): Promise<void> {
    const item = await this.itemRepository.findById(exchange.itemId);
    const itemTitle = item?.details.toData().title || 'your item';

    const subject = `Exchange Request Accepted - ${itemTitle}`;
    const body = `
      <h2>Great news! Your exchange request has been accepted.</h2>
      <p>Hi ${giver.profile.displayName},</p>
      <p><strong>${receiver.profile.displayName}</strong> has accepted your offer to give them <strong>${itemTitle}</strong>.</p>
      ${exchange.scheduledPickup ? `<p><strong>Scheduled pickup:</strong> ${exchange.scheduledPickup.toLocaleDateString()}</p>` : ''}
      <p>You can coordinate the pickup details through your Re:UseNet dashboard.</p>
      <p><a href="${process.env.FRONTEND_URL}/exchanges/${exchange.id.value}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Exchange Details</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await this.notificationService.sendEmail(giver.email.value, subject, body, true);
  }

  private async sendExchangeCompletedNotification(exchange: Exchange, giver: any, receiver: any, pointsAwarded: number): Promise<void> {
    const item = await this.itemRepository.findById(exchange.itemId);
    const itemTitle = item?.details.toData().title || 'the item';

    // Send to giver
    const giverSubject = `Exchange Completed - ${itemTitle}`;
    const giverBody = `
      <h2>Exchange completed successfully!</h2>
      <p>Hi ${giver.profile.displayName},</p>
      <p>Your exchange of <strong>${itemTitle}</strong> with <strong>${receiver.profile.displayName}</strong> has been completed.</p>
      <p>You've earned <strong>${pointsAwarded} Eco-Points</strong> for this exchange!</p>
      <p>Don't forget to rate your exchange experience to help build trust in our community.</p>
      <p><a href="${process.env.FRONTEND_URL}/exchanges/${exchange.id.value}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Rate Exchange</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    // Send to receiver
    const receiverSubject = `Exchange Completed - ${itemTitle}`;
    const receiverBody = `
      <h2>Exchange completed successfully!</h2>
      <p>Hi ${receiver.profile.displayName},</p>
      <p>Your exchange to receive <strong>${itemTitle}</strong> from <strong>${giver.profile.displayName}</strong> has been completed.</p>
      <p>You've earned <strong>${Math.floor(pointsAwarded * 0.5)} Eco-Points</strong> for this exchange!</p>
      <p>Don't forget to rate your exchange experience to help build trust in our community.</p>
      <p><a href="${process.env.FRONTEND_URL}/exchanges/${exchange.id.value}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Rate Exchange</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await Promise.all([
      this.notificationService.sendEmail(giver.email.value, giverSubject, giverBody, true),
      this.notificationService.sendEmail(receiver.email.value, receiverSubject, receiverBody, true)
    ]);
  }

  private async sendExchangeCancelledNotification(exchange: Exchange, canceller: any, otherParty: any, reason: string): Promise<void> {
    const item = await this.itemRepository.findById(exchange.itemId);
    const itemTitle = item?.details.toData().title || 'the item';

    const subject = `Exchange Cancelled - ${itemTitle}`;
    const body = `
      <h2>Exchange has been cancelled</h2>
      <p>Hi ${otherParty.profile.displayName},</p>
      <p>Unfortunately, <strong>${canceller.profile.displayName}</strong> has cancelled the exchange for <strong>${itemTitle}</strong>.</p>
      <p><strong>Reason:</strong> ${reason}</p>
      <p>The item is now available again for other exchange requests.</p>
      <p><a href="${process.env.FRONTEND_URL}/items/${exchange.itemId.value}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">View Item</a></p>
      <p>Happy reusing!<br>The Re:UseNet Team</p>
    `;

    await this.notificationService.sendEmail(otherParty.email.value, subject, body, true);
  }
}
