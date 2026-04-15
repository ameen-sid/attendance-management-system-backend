import { Router } from 'express';
import { 
    getTodayStatus, 
    clockIn, 
    clockOut, 
    getDailyAttendance, 
    getEmployeeMonthlyHistory, 
    getClientMonthlyHistory 
} from '../controllers/attendance.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.get('/status/:userId', authenticate, getTodayStatus);
router.post('/clock-in', authenticate, clockIn);
router.post('/clock-out', authenticate, clockOut);

router.get('/daily', authenticate, getDailyAttendance);
router.get('/employee/:id', authenticate, getEmployeeMonthlyHistory);
router.get('/client/:id', authenticate, getClientMonthlyHistory);

export default router;