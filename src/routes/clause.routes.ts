import { Router } from 'express';
import { authenticate } from '../middlewares/auth.middleware.js';
import * as clauseController from '../controllers/clause.controller.js';

const router = Router();

// Apply authentication to all routes
router.use(authenticate);

// Category Routes
router.get('/categories', clauseController.getAllCategoriesWithClauses);
router.post('/categories', clauseController.createCategory);
router.put('/categories/:id', clauseController.updateCategory);
router.delete('/categories/:id', clauseController.deleteCategory);

// Clause Routes
router.post('/', clauseController.createClause);
router.put('/:id', clauseController.updateClause);
router.delete('/:id', clauseController.deleteClause);

export default router;
