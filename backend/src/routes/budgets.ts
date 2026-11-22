import { Router } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, validateQuery, createBudgetSchema, updateBudgetSchema } from '../middleware/validation';
import { getBudgets, getBudgetById, createBudget, updateBudget, deleteBudget, getBudgetUtilization, getOverallBudgetStatus } from '../services/budgetService';

const router = Router();

router.use(authMiddleware);

router.get('/', validateQuery(z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
})), async (req: AuthenticatedRequest, res) => {
  const { month, year } = req.query;
  const budgets = await getBudgets(req.user!.id, Number(month), Number(year));
  res.json(budgets);
});

router.get('/utilization', validateQuery(z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
})), async (req: AuthenticatedRequest, res) => {
  const { month, year } = req.query;
  const utilization = await getBudgetUtilization(req.user!.id, Number(month), Number(year));
  res.json(utilization);
});

router.get('/current', async (req: AuthenticatedRequest, res) => {
  const status = await getOverallBudgetStatus(req.user!.id);
  res.json(status);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const budget = await getBudgetById(req.params.id, req.user!.id);
  res.json(budget);
});

router.post('/', validate(createBudgetSchema), async (req: AuthenticatedRequest, res) => {
  const budget = await createBudget(req.user!.id, req.body);
  res.status(201).json(budget);
});

router.put('/:id', validate(updateBudgetSchema), async (req: AuthenticatedRequest, res) => {
  const budget = await updateBudget(req.params.id, req.user!.id, req.body);
  res.json(budget);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await deleteBudget(req.params.id, req.user!.id);
  res.json({ success: true });
});

export default router;