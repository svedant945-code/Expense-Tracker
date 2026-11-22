import { prisma } from '../config/prisma';
import { TransactionType } from '@prisma/client';

export async function getMonthlySummary(userId: string, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const monthlyData = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', "transactionDate")::date AS month,
      SUM(CASE WHEN type = 'INCOME' THEN amount ELSE 0 END)::numeric(12,2) AS income,
      SUM(CASE WHEN type = 'EXPENSE' THEN amount ELSE 0 END)::numeric(12,2) AS expenses
    FROM "Transaction"
    WHERE "userId" = ${userId}
      AND "transactionDate" >= ${startDate}
    GROUP BY DATE_TRUNC('month', "transactionDate")
    ORDER BY month DESC
  `;

  return monthlyData;
}

export async function getCategoryBreakdown(
  userId: string,
  type: TransactionType,
  months = 12
) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const breakdown = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', t."transactionDate")::date AS month,
      c.name AS category,
      c.icon,
      c.color,
      SUM(t.amount)::numeric(12,2) AS total
    FROM "Transaction" t
    JOIN "Category" c ON t."categoryId" = c.id
    WHERE t."userId" = ${userId}
      AND t.type = ${type}
      AND t."transactionDate" >= ${startDate}
    GROUP BY DATE_TRUNC('month', t."transactionDate"), c.name, c.icon, c.color
    ORDER BY month DESC, total DESC
  `;

  return breakdown;
}

export async function getBudgetUtilizationHistory(userId: string, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const utilization = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', t."transactionDate")::date AS month,
      b.amount::numeric(12,2) AS budget_limit,
      COALESCE(SUM(t.amount), 0)::numeric(12,2) AS spent,
      CASE WHEN b.amount > 0 THEN ROUND(COALESCE(SUM(t.amount), 0) / b.amount * 100, 1) ELSE 0 END AS utilization
    FROM "Transaction" t
    LEFT JOIN "Budget" b
      ON b."userId" = t."userId"
      AND b."categoryId" IS NULL
      AND EXTRACT(MONTH FROM t."transactionDate") = b.month
      AND EXTRACT(YEAR FROM t."transactionDate") = b.year
    WHERE t."userId" = ${userId}
      AND t.type = 'EXPENSE'
      AND t."transactionDate" >= ${startDate}
    GROUP BY DATE_TRUNC('month', t."transactionDate"), b.amount
    ORDER BY month DESC
  `;

  return utilization;
}

export async function getIncomeGoalProgress(userId: string, months = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months + 1);
  startDate.setDate(1);
  startDate.setHours(0, 0, 0, 0);

  const progress = await prisma.$queryRaw`
    SELECT 
      DATE_TRUNC('month', t."transactionDate")::date AS month,
      COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0)::numeric(12,2) AS actual_income,
      ig.amount::numeric(12,2) AS goal,
      CASE WHEN ig.amount > 0 THEN ROUND(COALESCE(SUM(CASE WHEN t.type = 'INCOME' THEN t.amount END), 0) / ig.amount * 100, 1) ELSE 0 END AS progress
    FROM "Transaction" t
    LEFT JOIN "IncomeGoal" ig
      ON ig."userId" = t."userId"
      AND EXTRACT(MONTH FROM t."transactionDate") = ig.month
      AND EXTRACT(YEAR FROM t."transactionDate") = ig.year
    WHERE t."userId" = ${userId}
      AND t."transactionDate" >= ${startDate}
    GROUP BY DATE_TRUNC('month', t."transactionDate"), ig.amount
    ORDER BY month DESC
  `;

  return progress;
}

export async function getCurrentMonthDashboard(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const [transactions, budgets, incomeGoal] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        userId,
        transactionDate: { gte: monthStart, lte: monthEnd },
      },
    }),
    prisma.budget.findMany({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
      include: { category: true },
    }),
    prisma.incomeGoal.findFirst({
      where: { userId, month: now.getMonth() + 1, year: now.getFullYear() },
    }),
  ]);

  const income = transactions
    .filter(t => t.type === TransactionType.INCOME)
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const expenses = transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .reduce((sum, t) => sum + t.amount.toNumber(), 0);

  const overallBudget = budgets.find(b => !b.categoryId);
  const categoryBudgets = budgets.filter(b => b.categoryId);

  // Category budget utilization
  const expenseMap = new Map<string, number>();
  transactions
    .filter(t => t.type === TransactionType.EXPENSE)
    .forEach(t => {
      const catId = t.categoryId;
      expenseMap.set(catId, (expenseMap.get(catId) || 0) + t.amount.toNumber());
    });

  const categoryUtilization = categoryBudgets.map(b => {
    const spent = expenseMap.get(b.categoryId!) || 0;
    const limit = b.amount.toNumber();
    return {
      category: b.category,
      budget: limit,
      spent,
      remaining: Math.max(0, limit - spent),
      percent: limit > 0 ? Math.round((spent / limit) * 1000) / 10 : 0,
      isOverBudget: spent > limit,
    };
  });

  return {
    summary: {
      income,
      expenses,
      balance: income - expenses,
    },
    overallBudget: overallBudget ? {
      budget: overallBudget.amount.toNumber(),
      spent: expenses,
      remaining: Math.max(0, overallBudget.amount.toNumber() - expenses),
      percent: overallBudget.amount.toNumber() > 0 
        ? Math.round((expenses / overallBudget.amount.toNumber()) * 1000) / 10 
        : 0,
      isOverBudget: expenses > overallBudget.amount.toNumber(),
    } : null,
    categoryBudgets: categoryUtilization,
    incomeGoal: incomeGoal ? {
      goal: incomeGoal.amount.toNumber(),
      actual: income,
      progress: incomeGoal.amount.toNumber() > 0 
        ? Math.round((income / incomeGoal.amount.toNumber()) * 1000) / 10 
        : 0,
      isGoalMet: income >= incomeGoal.amount.toNumber(),
    } : null,
  };
}

export async function exportTransactions(userId: string, format: 'csv' | 'json') {
  const transactions = await prisma.transaction.findMany({
    where: { userId },
    include: { category: true, account: true },
    orderBy: { transactionDate: 'desc' },
  });

  if (format === 'csv') {
    const headers = ['Date', 'Title', 'Description', 'Amount', 'Type', 'Category', 'Account', 'Payment Method', 'Notes'];
    const rows = transactions.map(t => [
      t.transactionDate.toISOString().split('T')[0],
      t.title,
      t.description || '',
      t.amount.toString(),
      t.type,
      t.category.name,
      t.account?.name || '',
      t.paymentMethod || '',
      t.notes || '',
    ]);
    return [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
  }

  return JSON.stringify(transactions, null, 2);
}