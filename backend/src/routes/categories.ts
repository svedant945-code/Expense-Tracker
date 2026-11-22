import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, createCategorySchema, updateCategorySchema } from '../middleware/validation';
import { getCategories, getCategoryById, createCategory, updateCategory, deleteCategory } from '../services/categoryService';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const { type } = req.query;
  const categories = await getCategories(req.user!.id, type as any);
  res.json(categories);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const category = await getCategoryById(req.params.id, req.user!.id);
  res.json(category);
});

router.post('/', validate(createCategorySchema), async (req: AuthenticatedRequest, res) => {
  const category = await createCategory(req.user!.id, req.body);
  res.status(201).json(category);
});

router.put('/:id', validate(updateCategorySchema), async (req: AuthenticatedRequest, res) => {
  const category = await updateCategory(req.params.id, req.user!.id, req.body);
  res.json(category);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await deleteCategory(req.params.id, req.user!.id);
  res.json({ success: true });
});

export default router;