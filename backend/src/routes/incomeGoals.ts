import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, validateQuery, createIncomeGoalSchema } from '../middleware/validation';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';
import { z } from 'zod';

const router = Router();

router.use(authMiddleware);

router.get('/', validateQuery(z.object({
  month: z.coerce.number().min(1).max(12).optional(),
  year: z.coerce.number().min(2020).max(2100).optional(),
})), async (req: AuthenticatedRequest, res) => {
  const { month, year } = req.query;
  const where: any = { userId: req.user!.id };
  if (month) where.month = month;
  if (year) where.year = year;

  const goals = await prisma.incomeGoal.findMany({
    where,
    orderBy: [{ year: 'desc' }, { month: 'desc' }],
  });
  res.json(goals);
});

router.get('/current', async (req: AuthenticatedRequest, res) => {
  const now = new Date();
  const goal = await prisma.incomeGoal.findFirst({
    where: {
      userId: req.user!.id,
      month: now.getMonth() + 1,
      year: now.getFullYear(),
    },
  });

  if (!goal) return res.json(null);

  // Get actual income for current month
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const actualIncome = await prisma.transaction.aggregate({
    where: {
      userId: req.user!.id,
      type: 'INCOME',
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  res.json({
    goal: goal.amount.toNumber(),
    actual: actualIncome._sum.amount?.toNumber() || 0,
    progress: goal.amount.toNumber() > 0
      ? Math.round(((actualIncome._sum.amount?.toNumber() || 0) / goal.amount.toNumber()) * 1000) / 10
      : 0,
    isGoalMet: (actualIncome._sum.amount?.toNumber() || 0) >= goal.amount.toNumber(),
  });
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const goal = await prisma.incomeGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!goal) throw new AppError(404, 'Income goal not found');
  res.json(goal);
});

router.post('/', validate(createIncomeGoalSchema), async (req: AuthenticatedRequest, res) => {
  const key = {
    userId: req.user!.id,
    month: req.body.month,
    year: req.body.year,
  };
  const existing = await prisma.incomeGoal.findUnique({
    where: { userId_month_year: key },
  });
  const goal = await prisma.incomeGoal.upsert({
    where: { userId_month_year: key },
    update: { amount: req.body.amount },
    create: { ...req.body, userId: req.user!.id },
  });
  res.status(existing ? 200 : 201).json(goal);
});

router.put('/:id', validate(createIncomeGoalSchema.partial()), async (req: AuthenticatedRequest, res) => {
  const goal = await prisma.incomeGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!goal) throw new AppError(404, 'Income goal not found');

  if (req.body.month && req.body.year) {
    const existing = await prisma.incomeGoal.findFirst({
      where: {
        userId: req.user!.id,
        month: req.body.month,
        year: req.body.year,
        id: { not: req.params.id },
      },
    });
    if (existing) throw new AppError(409, 'Income goal already exists for this month');
  }

  const updated = await prisma.incomeGoal.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const goal = await prisma.incomeGoal.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!goal) throw new AppError(404, 'Income goal not found');

  await prisma.incomeGoal.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

export default router;