import { Router } from 'express';
import { getDashboardStats, getRecentActivity } from '../controllers/dashboard.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/stats', authenticate, getDashboardStats);
router.get('/activity', authenticate, getRecentActivity);

export default router;