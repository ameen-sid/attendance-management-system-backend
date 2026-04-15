import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { 
    getEvents, 
    createEvent, 
    updateEvent, 
    deleteEvent 
} from '../controllers/event.controller.js';

const router = Router();

// Secure all routes
router.use(authenticate);

router.get('/', getEvents);
router.post('/', createEvent);
router.patch('/:id', updateEvent);
router.delete('/:id', deleteEvent);

export default router;