import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

export async function getBudgets(userId: string, month: number, year: number) {
  return prisma.budget.findMany({
    where: { userId, month, year },
    include: {
      category: { select: { id: true, name: true, icon: true, color: true, type: true } },
    },
    orderBy: { category: { name: 'asc' } },
  });
}

export async function getBudgetById(id: string, userId: string) {
  const budget = await prisma.budget.findFirst({
    where: { id, userId },
    include: { category: true },
  });

  if (!budget) {
    throw new AppError(404, 'Budget not found');
  }

  return budget;
}

export async function createBudget(
  userId: string,
  data: { categoryId?: string; amount: number; month: number; year: number }
) {
  const existing = await prisma.budget.findFirst({
    where: { userId, categoryId: data.categoryId || null, month: data.month, year: data.year },
  });

  if (data.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: data.categoryId, OR: [{ userId }, { userId: null }] },
    });
    if (!category) throw new AppError(400, 'Invalid category');
  }

  if (existing) {
    const budget = await prisma.budget.update({
      where: { id: existing.id },
      data: { amount: data.amount },
      include: { category: true },
    });
    return { budget, created: false };
  }

  const budget = await prisma.budget.create({
    data: { ...data, userId },
    include: { category: true },
  });
  return { budget, created: true };
}

export async function updateBudget(
  id: string,
  userId: string,
  data: { amount?: number; categoryId?: string }
) {
  const budget = await getBudgetById(id, userId);

  if (data.categoryId && data.categoryId !== budget.categoryId) {
    const existing = await prisma.budget.findFirst({
      where: { userId, categoryId: data.categoryId, month: budget.month, year: budget.year },
    });
    if (existing) throw new AppError(409, 'Budget already exists for this category/month');
  }

  return prisma.budget.update({
    where: { id },
    data,
    include: { category: true },
  });
}

export async function deleteBudget(id: string, userId: string) {
  await getBudgetById(id, userId);
  await prisma.budget.delete({ where: { id } });
  return { success: true };
}

export async function getBudgetUtilization(userId: string, month: number, year: number) {
  const budgets = await getBudgets(userId, month, year);

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  // Get expenses for this month
  const expenses = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type: 'EXPENSE',
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  const expenseMap = new Map(
    expenses.map(e => [e.categoryId, e._sum.amount?.toNumber() || 0])
  );

  return budgets.map(budget => {
    const spent = expenseMap.get(budget.categoryId || 'overall') || 0;
    const limit = budget.amount.toNumber();
    const percent = limit > 0 ? (spent / limit) * 100 : 0;

    return {
      ...budget,
      amount: limit,
      spent,
      remaining: Math.max(0, limit - spent),
      percent: Math.round(percent * 10) / 10,
      isOverBudget: spent > limit,
    };
  });
}

export async function getOverallBudgetStatus(userId: string) {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();

  // Get overall budget (categoryId = null)
  const overallBudget = await prisma.budget.findFirst({
    where: { userId, categoryId: null, month, year },
  });

  if (!overallBudget) return null;

  const startDate = new Date(year, month - 1, 1);
  const endDate = new Date(year, month, 0, 23, 59, 59);

  const totalExpenses = await prisma.transaction.aggregate({
    where: {
      userId,
      type: 'EXPENSE',
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
  });

  const spent = totalExpenses._sum.amount?.toNumber() || 0;
  const limit = overallBudget.amount.toNumber();

  return {
    budget: overallBudget,
    limit,
    spent,
    remaining: Math.max(0, limit - spent),
    percent: limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0,
    isOverBudget: spent > limit,
  };
}