import { Router } from 'express';
import authRoutes from './auth.routes';
import itemRoutes from './item.routes';
import userRoutes from './user.routes';
import exchangeRoutes from './exchange.routes';
import matchingRoutes from './matching.routes';

const router = Router();

// Mount route modules
router.use('/auth', authRoutes);
router.use('/items', itemRoutes);
router.use('/users', userRoutes);
router.use('/exchanges', exchangeRoutes);
router.use('/matching', matchingRoutes);

export default router;
