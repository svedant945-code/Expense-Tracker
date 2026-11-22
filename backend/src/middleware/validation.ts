import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

export function validate(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.body = result.data;
    next();
  };
}

export function validateQuery(schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query);
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: result.error.flatten().fieldErrors,
      });
    }
    req.query = result.data as any;
    next();
  };
}

// Transaction schemas
const transactionDateSchema = z.string().datetime().or(
  z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .refine((value) => {
      const date = new Date(`${value}T00:00:00.000Z`);
      return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
    })
);

export const createTransactionSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid(),
  transactionDate: transactionDateSchema.optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  accountId: z.string().uuid().optional(),
});

export const updateTransactionSchema = createTransactionSchema.partial();

export const transactionQuerySchema = z.object({
  page: z.coerce.number().positive().default(1),
  limit: z.coerce.number().positive().max(100).default(20),
  type: z.enum(['INCOME', 'EXPENSE']).optional(),
  categoryId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  sortBy: z.enum(['transactionDate', 'amount', 'createdAt']).default('transactionDate'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

// Category schemas
export const createCategorySchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['INCOME', 'EXPENSE']),
  icon: z.string().max(50).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

// Budget schemas
export const createBudgetSchema = z.object({
  categoryId: z.string().uuid().optional(),
  amount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

export const updateBudgetSchema = createBudgetSchema.partial();

// Account schemas
export const createAccountSchema = z.object({
  name: z.string().min(1).max(50),
  type: z.enum(['CASH', 'BANK', 'WALLET', 'CREDIT_CARD', 'OTHER']),
  initialBalance: z.number().default(0),
  currency: z.string().length(3).default('PKR'),
});

export const updateAccountSchema = createAccountSchema.partial();

// Income Goal schemas
export const createIncomeGoalSchema = z.object({
  amount: z.number().positive(),
  month: z.number().min(1).max(12),
  year: z.number().min(2020).max(2100),
});

// Recurring Transaction schemas
export const createRecurringSchema = z.object({
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  amount: z.number().positive(),
  type: z.enum(['INCOME', 'EXPENSE']),
  categoryId: z.string().uuid(),
  frequency: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime().optional(),
  paymentMethod: z.string().max(50).optional(),
  notes: z.string().max(500).optional(),
  accountId: z.string().uuid().optional(),
});

// Savings Goal schemas
export const createSavingsGoalSchema = z.object({
  name: z.string().min(1).max(100),
  targetAmount: z.number().positive(),
  currentAmount: z.number().min(0).default(0),
  targetDate: z.string().datetime().optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
  icon: z.string().max(50).optional(),
});