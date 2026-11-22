import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedPrisma = vi.hoisted(() => ({
  transaction: {
    groupBy: vi.fn(),
    aggregate: vi.fn(),
  },
  budget: {
    findFirst: vi.fn(),
  },
  category: {
    findMany: vi.fn(),
  },
}));

vi.mock('../src/config/prisma', () => ({ prisma: mockedPrisma }));

import { getMonthlySpendingHistory } from '../src/services/reportService';

describe('getMonthlySpendingHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns monthly category totals, overall budget, and previous-month spend', async () => {
    mockedPrisma.transaction.groupBy.mockResolvedValue([
      { categoryId: 'food-id', _sum: { amount: { toNumber: () => 1800 } } },
      { categoryId: 'bills-id', _sum: { amount: { toNumber: () => 1200 } } },
    ]);
    mockedPrisma.transaction.aggregate.mockResolvedValue({
      _sum: { amount: { toNumber: () => 2500 } },
    });
    mockedPrisma.budget.findFirst.mockResolvedValue({
      amount: { toNumber: () => 5000 },
    });
    mockedPrisma.category.findMany.mockResolvedValue([
      { id: 'food-id', name: 'Food' },
      { id: 'bills-id', name: 'Bills' },
    ]);

    const history = await getMonthlySpendingHistory('user-1', 1, 2026);

    expect(history).toEqual({
      spent: 3000,
      budgetLimit: 5000,
      previousSpent: 2500,
      categories: [
        { name: 'Food', amount: 1800 },
        { name: 'Bills', amount: 1200 },
      ],
    });
    expect(mockedPrisma.budget.findFirst).toHaveBeenCalledWith({
      where: { userId: 'user-1', categoryId: null, month: 1, year: 2026 },
    });
  });
});
