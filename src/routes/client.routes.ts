import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import { 
    getAllClients, 
    getClientById, 
    createClient, 
    updateClient, 
    deleteClient 
} from '../controllers/client.controller.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllClients);
router.get('/:id', getClientById);
router.post('/', createClient);
router.put('/:id', updateClient);
router.delete('/:id', deleteClient);

export default router;
