import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as taskController from '../controllers/task.controller.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Category Routes
router.get('/categories', taskController.getAllCategoriesWithTasks);
router.post('/categories', taskController.createCategory);
router.put('/categories/:id', taskController.updateCategory);
router.delete('/categories/:id', taskController.deleteCategory);

// Task Routes
router.post('/', taskController.createTask);
router.put('/:id', taskController.updateTask);
router.delete('/:id', taskController.deleteTask);

export default router;
