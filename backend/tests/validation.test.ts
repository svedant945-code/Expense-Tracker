import { describe, expect, it } from 'vitest';
import { createTransactionSchema } from '../src/middleware/validation';

const transaction = {
  title: 'Test transaction',
  amount: 25,
  type: 'EXPENSE',
  categoryId: '00000000-0000-4000-8000-000000000001',
};

describe('transaction date validation', () => {
  it('accepts date-only values from the date input', () => {
    expect(createTransactionSchema.safeParse({
      ...transaction,
      transactionDate: '2026-11-22',
    }).success).toBe(true);
  });

  it('accepts ISO datetime values', () => {
    expect(createTransactionSchema.safeParse({
      ...transaction,
      transactionDate: '2026-11-22T00:00:00.000Z',
    }).success).toBe(true);
  });

  it('rejects invalid calendar dates', () => {
    expect(createTransactionSchema.safeParse({
      ...transaction,
      transactionDate: '2026-02-30',
    }).success).toBe(false);
  });
});
