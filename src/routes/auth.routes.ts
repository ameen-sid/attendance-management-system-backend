import { Router } from 'express';
import { 
	loginMobile, 
	loginWeb, 
	logout, 
	updatePassword 
} from '../controllers/auth.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.post('/mobile/login', loginMobile);
router.post('/web/login', loginWeb);

router.post('/logout', authenticate, logout);
router.post('/update-password', authenticate, updatePassword);

export default router;