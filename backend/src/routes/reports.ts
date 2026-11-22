import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validateQuery } from '../middleware/validation';
import { getMonthlySummary, getMonthlySpendingHistory, getCategoryBreakdown, getBudgetUtilizationHistory, getIncomeGoalProgress, getCurrentMonthDashboard, exportTransactions } from '../services/reportService';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

router.get('/dashboard', async (req: AuthenticatedRequest, res) => {
  const dashboard = await getCurrentMonthDashboard(req.user!.id);
  res.json(dashboard);
});

router.get('/monthly-history', validateQuery(z.object({
  month: z.coerce.number().min(1).max(12),
  year: z.coerce.number().min(2020).max(2100),
})), async (req: AuthenticatedRequest, res) => {
  const { month, year } = req.query;
  const history = await getMonthlySpendingHistory(req.user!.id, Number(month), Number(year));
  res.json(history);
});

router.get('/monthly', validateQuery(z.object({
  months: z.coerce.number().positive().max(24).default(12),
})), async (req: AuthenticatedRequest, res) => {
  const { months } = req.query;
  const summary = await getMonthlySummary(req.user!.id, Number(months));
  res.json(summary);
});

router.get('/categories/:type', validateQuery(z.object({
  months: z.coerce.number().positive().max(24).default(12),
})), async (req: AuthenticatedRequest, res) => {
  const { type } = req.params;
  const { months } = req.query;
  const breakdown = await getCategoryBreakdown(req.user!.id, type as any, Number(months));
  res.json(breakdown);
});

router.get('/budgets', validateQuery(z.object({
  months: z.coerce.number().positive().max(24).default(12),
})), async (req: AuthenticatedRequest, res) => {
  const { months } = req.query;
  const utilization = await getBudgetUtilizationHistory(req.user!.id, Number(months));
  res.json(utilization);
});

router.get('/income-goals', validateQuery(z.object({
  months: z.coerce.number().positive().max(24).default(12),
})), async (req: AuthenticatedRequest, res) => {
  const { months } = req.query;
  const progress = await getIncomeGoalProgress(req.user!.id, Number(months));
  res.json(progress);
});

router.get('/export', validateQuery(z.object({
  format: z.enum(['csv', 'json']).default('csv'),
})), async (req: AuthenticatedRequest, res) => {
  const { format } = req.query;
  const data = await exportTransactions(req.user!.id, format as 'csv' | 'json');
  
  if (format === 'csv') {
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.csv"`);
    return res.send(data);
  }
  
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="transactions-${new Date().toISOString().split('T')[0]}.json"`);
  res.send(data);
});

export default router;