import { Router } from 'express';
import { getDashboardStats, getDailyExpenses } from '../controllers/dashboardController.js';

const router = Router();

router.get('/stats', getDashboardStats);
router.get('/daily-expenses', getDailyExpenses);

export default router;
