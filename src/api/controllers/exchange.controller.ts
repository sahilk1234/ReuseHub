import { Request, Response } from 'express';
import { injectable, inject } from 'inversify';
import { TYPES } from '@/container/types';
import { IExchangeApplicationService, InitiateExchangeCommand, AcceptExchangeCommand, CompleteExchangeCommand, CancelExchangeCommand, RateExchangeCommand, GetExchangeHistoryQuery } from '@/application/services/ExchangeApplicationService';
import { InitiateExchangeDto, AcceptExchangeDto, CompleteExchangeDto, CancelExchangeDto, RateExchangeDto, GetExchangeHistoryDto } from '../dtos/exchange.dto';
import { AppError } from '../errors/AppError';

@injectable()
export class ExchangeController {
  constructor(
    @inject(TYPES.IExchangeApplicationService)
    private readonly exchangeService: IExchangeApplicationService
  ) {}

  /**
   * POST /api/exchanges - Initiate a new exchange
   * Requirements: 2.4
   */
  public initiateExchange = async (req: Request, res: Response): Promise<void> => {
    try {
      const dto: InitiateExchangeDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: InitiateExchangeCommand = {
        itemId: dto.itemId,
        giverId: req.userId,
        receiverId: dto.receiverId,
        message: dto.message,
        scheduledPickup: dto.scheduledPickup ? new Date(dto.scheduledPickup) : undefined
      };

      const result = await this.exchangeService.initiateExchange(command);

      res.status(201).json({
        success: true,
        data: {
          exchangeId: result.exchangeId,
          notificationSent: result.notificationSent,
          message: 'Exchange request sent successfully'
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'EXCHANGE_INITIATION_FAILED',
        error.message || 'Failed to initiate exchange'
      );
    }
  };

  /**
   * PUT /api/exchanges/:id/accept - Accept an exchange request
   * Requirements: 2.5
   */
  public acceptExchange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: AcceptExchangeDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: AcceptExchangeCommand = {
        exchangeId: id,
        userId: req.userId,
        scheduledPickup: dto.scheduledPickup ? new Date(dto.scheduledPickup) : undefined
      };

      await this.exchangeService.acceptExchange(command);

      res.status(200).json({
        success: true,
        message: 'Exchange request accepted successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'ACCEPT_FAILED',
        error.message || 'Failed to accept exchange'
      );
    }
  };

  /**
   * POST /api/exchanges/:id/complete - Complete an exchange
   * Requirements: 2.5, 4.2
   */
  public completeExchange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: CompleteExchangeDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: CompleteExchangeCommand = {
        exchangeId: id,
        userId: req.userId,
        ecoPointsAwarded: dto.ecoPointsAwarded
      };

      await this.exchangeService.completeExchange(command);

      res.status(200).json({
        success: true,
        message: 'Exchange completed successfully. Eco-points have been awarded!',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'COMPLETE_FAILED',
        error.message || 'Failed to complete exchange'
      );
    }
  };

  /**
   * POST /api/exchanges/:id/cancel - Cancel an exchange
   * Requirements: 2.5
   */
  public cancelExchange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: CancelExchangeDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: CancelExchangeCommand = {
        exchangeId: id,
        userId: req.userId,
        reason: dto.reason
      };

      await this.exchangeService.cancelExchange(command);

      res.status(200).json({
        success: true,
        message: 'Exchange cancelled successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'CANCEL_FAILED',
        error.message || 'Failed to cancel exchange'
      );
    }
  };

  /**
   * POST /api/exchanges/:id/rate - Rate an exchange
   * Requirements: 5.4
   */
  public rateExchange = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const dto: RateExchangeDto = req.body;

      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const command: RateExchangeCommand = {
        exchangeId: id,
        raterId: req.userId,
        rating: dto.rating,
        review: dto.review
      };

      await this.exchangeService.rateExchange(command);

      res.status(200).json({
        success: true,
        message: 'Exchange rated successfully',
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'RATING_FAILED',
        error.message || 'Failed to rate exchange'
      );
    }
  };

  /**
   * GET /api/exchanges/:id - Get exchange details
   */
  public getExchangeDetails = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const exchange = await this.exchangeService.getExchangeDetails(id);

      res.status(200).json({
        success: true,
        data: {
          id: exchange.id.value,
          itemId: exchange.itemId.value,
          giverId: exchange.giverId.value,
          receiverId: exchange.receiverId.value,
          status: exchange.status.value,
          scheduledPickup: exchange.scheduledPickup,
          completedAt: exchange.completedAt,
          giverRating: exchange.giverRating?.toData(),
          receiverRating: exchange.receiverRating?.toData(),
          ecoPointsAwarded: exchange.ecoPointsAwarded,
          createdAt: exchange.createdAt,
          updatedAt: exchange.updatedAt
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 404,
        error.code || 'EXCHANGE_NOT_FOUND',
        error.message || 'Exchange not found'
      );
    }
  };

  /**
   * GET /api/exchanges/history - Get user's exchange history
   */
  public getExchangeHistory = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const dto: GetExchangeHistoryDto = req.query as any;

      const query: GetExchangeHistoryQuery = {
        userId: req.userId,
        status: dto.status,
        asGiver: dto.asGiver,
        asReceiver: dto.asReceiver,
        limit: dto.limit || 20,
        offset: dto.offset || 0
      };

      const result = await this.exchangeService.getExchangeHistory(query);

      const exchanges = result.exchanges.map(exchange => ({
        id: exchange.id.value,
        itemId: exchange.itemId.value,
        giverId: exchange.giverId.value,
        receiverId: exchange.receiverId.value,
        status: exchange.status.value,
        scheduledPickup: exchange.scheduledPickup,
        completedAt: exchange.completedAt,
        ecoPointsAwarded: exchange.ecoPointsAwarded,
        createdAt: exchange.createdAt,
        updatedAt: exchange.updatedAt
      }));

      res.status(200).json({
        success: true,
        data: {
          exchanges,
          totalCount: result.totalCount,
          hasMore: result.hasMore,
          limit: query.limit,
          offset: query.offset
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'FETCH_FAILED',
        error.message || 'Failed to fetch exchange history'
      );
    }
  };

  /**
   * GET /api/exchanges/active - Get user's active exchanges
   */
  public getActiveExchanges = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const exchanges = await this.exchangeService.getUserActiveExchanges(req.userId);

      const exchangesData = exchanges.map(exchange => ({
        id: exchange.id.value,
        itemId: exchange.itemId.value,
        giverId: exchange.giverId.value,
        receiverId: exchange.receiverId.value,
        status: exchange.status.value,
        scheduledPickup: exchange.scheduledPickup,
        createdAt: exchange.createdAt,
        updatedAt: exchange.updatedAt
      }));

      res.status(200).json({
        success: true,
        data: {
          exchanges: exchangesData,
          count: exchangesData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'FETCH_FAILED',
        error.message || 'Failed to fetch active exchanges'
      );
    }
  };

  /**
   * GET /api/exchanges/unrated - Get user's unrated exchanges
   */
  public getUnratedExchanges = async (req: Request, res: Response): Promise<void> => {
    try {
      if (!req.userId) {
        throw new AppError(401, 'UNAUTHORIZED', 'User authentication required');
      }

      const exchanges = await this.exchangeService.getUnratedExchanges(req.userId);

      const exchangesData = exchanges.map(exchange => ({
        id: exchange.id.value,
        itemId: exchange.itemId.value,
        giverId: exchange.giverId.value,
        receiverId: exchange.receiverId.value,
        status: exchange.status.value,
        completedAt: exchange.completedAt,
        createdAt: exchange.createdAt
      }));

      res.status(200).json({
        success: true,
        data: {
          exchanges: exchangesData,
          count: exchangesData.length
        },
        timestamp: new Date().toISOString()
      });
    } catch (error: any) {
      throw new AppError(
        error.statusCode || 500,
        error.code || 'FETCH_FAILED',
        error.message || 'Failed to fetch unrated exchanges'
      );
    }
  };
}
