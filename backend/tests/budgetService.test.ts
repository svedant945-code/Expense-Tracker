import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockedPrisma = vi.hoisted(() => ({
  budget: {
    findFirst: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
  },
  category: {
    findFirst: vi.fn(),
  },
}));

vi.mock('../src/config/prisma', () => ({ prisma: mockedPrisma }));

import { createBudget } from '../src/services/budgetService';

describe('createBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates the existing monthly budget instead of returning a conflict', async () => {
    const budget = { id: 'budget-1', amount: 750000 };
    mockedPrisma.budget.findFirst.mockResolvedValue({ id: budget.id });
    mockedPrisma.budget.update.mockResolvedValue(budget);

    const result = await createBudget('user-1', { amount: 750000, month: 11, year: 2026 });

    expect(mockedPrisma.budget.update).toHaveBeenCalledWith({
      where: { id: budget.id },
      data: { amount: 750000 },
      include: { category: true },
    });
    expect(mockedPrisma.budget.create).not.toHaveBeenCalled();
    expect(result).toEqual({ budget, created: false });
  });

  it('creates a budget when none exists', async () => {
    const budget = { id: 'budget-2', amount: 750000 };
    mockedPrisma.budget.findFirst.mockResolvedValue(null);
    mockedPrisma.budget.create.mockResolvedValue(budget);

    const result = await createBudget('user-1', { amount: 750000, month: 11, year: 2026 });

    expect(mockedPrisma.budget.create).toHaveBeenCalledWith({
      data: { amount: 750000, month: 11, year: 2026, userId: 'user-1' },
      include: { category: true },
    });
    expect(result).toEqual({ budget, created: true });
  });
});
