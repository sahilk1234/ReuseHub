import { Router } from 'express';
import authRoutes from './auth.routes';
import itemRoutes from './item.routes';
import userRoutes from './user.routes';
import exchangeRoutes from './exchange.routes';
import matchingRoutes from './matching.routes';
import pointsRoutes from './points.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/users', userRoutes);
router.use('/exchanges', exchangeRoutes);
router.use('/matching', matchingRoutes);
router.use('/points', pointsRoutes);

export default router;
