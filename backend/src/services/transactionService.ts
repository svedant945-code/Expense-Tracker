import { prisma } from '../config/prisma';
import { Prisma, TransactionType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export interface TransactionFilters {
  userId: string;
  type?: TransactionType;
  categoryId?: string;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  limit?: number;
  sortBy?: 'transactionDate' | 'amount' | 'createdAt';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getTransactions(
  filters: TransactionFilters
): Promise<PaginatedResult<any>> {
  const {
    userId,
    type,
    categoryId,
    startDate,
    endDate,
    page = 1,
    limit = 20,
    sortBy = 'transactionDate',
    sortOrder = 'desc',
  } = filters;

  const where: Prisma.TransactionWhereInput = { userId };

  if (type) where.type = type;
  if (categoryId) where.categoryId = categoryId;
  if (startDate || endDate) {
    where.transactionDate = {};
    if (startDate) where.transactionDate.gte = startDate;
    if (endDate) where.transactionDate.lte = endDate;
  }

  const [data, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      include: {
        category: { select: { id: true, name: true, icon: true, color: true, type: true } },
        account: { select: { id: true, name: true, type: true } },
      },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    data,
    meta: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getTransactionById(id: string, userId: string) {
  const transaction = await prisma.transaction.findFirst({
    where: { id, userId },
    include: {
      category: true,
      account: true,
    },
  });

  if (!transaction) {
    throw new AppError(404, 'Transaction not found');
  }

  return transaction;
}

export async function createTransaction(
  userId: string,
  data: Prisma.TransactionCreateInput
) {
  const category = await prisma.category.findFirst({
    where: { id: data.category.connect?.id, OR: [{ userId }, { userId: null }] },
  });

  if (!category) {
    throw new AppError(400, 'Invalid category');
  }

  const transaction = await prisma.transaction.create({
    data: {
      ...data,
      user: { connect: { id: userId } },
    },
    include: {
      category: true,
      account: true,
    },
  });

  // Update account balance if accountId provided
  if (data.account?.connect?.id) {
    await updateAccountBalance(data.account.connect.id, data.type as TransactionType, Number(data.amount));
  }

  return transaction;
}

export async function updateTransaction(
  id: string,
  userId: string,
  data: Prisma.TransactionUpdateInput
) {
  const existing = await getTransactionById(id, userId);

  // If amount or type changed, adjust account balance
  if (data.account?.connect?.id && (data.amount || data.type)) {
    await updateAccountBalance(
      data.account.connect.id,
      existing.type,
      -existing.amount.toNumber()
    );
    await updateAccountBalance(
      data.account.connect.id,
      (data.type as TransactionType) || existing.type,
      Number(data.amount) || existing.amount.toNumber()
    );
  }

  const transaction = await prisma.transaction.update({
    where: { id },
    data,
    include: {
      category: true,
      account: true,
    },
  });

  return transaction;
}

export async function deleteTransaction(id: string, userId: string) {
  const existing = await getTransactionById(id, userId);

  if (existing.accountId) {
    await updateAccountBalance(existing.accountId, existing.type, -existing.amount.toNumber());
  }

  await prisma.transaction.delete({ where: { id } });
  return { success: true };
}

async function updateAccountBalance(
  accountId: string,
  type: TransactionType,
  amount: number
) {
  const multiplier = type === TransactionType.INCOME ? 1 : -1;
  await prisma.account.update({
    where: { id: accountId },
    data: {
      currentBalance: {
        increment: amount * multiplier,
      },
    },
  });
}

export async function getTransactionStats(userId: string, startDate: Date, endDate: Date) {
  const [income, expenses] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        transactionDate: { gte: startDate, lte: endDate },
      },
      _sum: { amount: true },
    }),
  ]);

  const totalIncome = income._sum.amount?.toNumber() || 0;
  const totalExpenses = expenses._sum.amount?.toNumber() || 0;

  return {
    income: totalIncome,
    expenses: totalExpenses,
    balance: totalIncome - totalExpenses,
  };
}

export async function getCategoryBreakdown(
  userId: string,
  type: TransactionType,
  startDate: Date,
  endDate: Date
) {
  const breakdown = await prisma.transaction.groupBy({
    by: ['categoryId'],
    where: {
      userId,
      type,
      transactionDate: { gte: startDate, lte: endDate },
    },
    _sum: { amount: true },
    _count: { id: true },
  });

  const categories = await prisma.category.findMany({
    where: { id: { in: breakdown.map(b => b.categoryId) } },
  });

  return breakdown.map(b => {
    const cat = categories.find(c => c.id === b.categoryId);
    return {
      category: cat,
      total: b._sum.amount?.toNumber() || 0,
      count: b._count.id,
    };
  });
}