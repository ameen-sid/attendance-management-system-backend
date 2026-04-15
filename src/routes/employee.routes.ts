import { Router } from 'express';
import { 
	getAllEmployees, 
	createEmployee, 
	updateEmployee, 
	deleteEmployee 
} from '../controllers/employee.controller.js';
import { authenticate } from '../middlewares/auth.middleware.js';

const router = Router();

router.use(authenticate);

router.get('/', getAllEmployees);
router.post('/', createEmployee);
router.put('/:id', updateEmployee);
router.delete('/:id', deleteEmployee);

export default router;