import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, validateQuery, createTransactionSchema, updateTransactionSchema, transactionQuerySchema } from '../middleware/validation';
import { getTransactions, getTransactionById, createTransaction, updateTransaction, deleteTransaction, getTransactionStats, getCategoryBreakdown } from '../services/transactionService';

const router = Router();

router.use(authMiddleware);

router.get('/', validateQuery(transactionQuerySchema), async (req: AuthenticatedRequest, res) => {
  const { page, limit, type, categoryId, startDate, endDate, sortBy, sortOrder } = req.query;
  
  const result = await getTransactions({
    userId: req.user!.id,
    type: type as any,
    categoryId: categoryId as string,
    startDate: startDate ? new Date(startDate as string) : undefined,
    endDate: endDate ? new Date(endDate as string) : undefined,
    page: Number(page),
    limit: Number(limit),
    sortBy: sortBy as any,
    sortOrder: sortOrder as any,
  });

  res.json(result);
});

router.get('/stats', async (req: AuthenticatedRequest, res) => {
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate as string) : new Date();

  const stats = await getTransactionStats(req.user!.id, start, end);
  res.json(stats);
});

router.get('/categories/:type', async (req: AuthenticatedRequest, res) => {
  const { type } = req.params;
  const { startDate, endDate } = req.query;
  const start = startDate ? new Date(startDate as string) : new Date(new Date().getFullYear(), new Date().getMonth(), 1);
  const end = endDate ? new Date(endDate as string) : new Date();

  const breakdown = await getCategoryBreakdown(req.user!.id, type as any, start, end);
  res.json(breakdown);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const transaction = await getTransactionById(req.params.id, req.user!.id);
  res.json(transaction);
});

router.post('/', validate(createTransactionSchema), async (req: AuthenticatedRequest, res) => {
  const { categoryId, accountId, transactionDate, ...rest } = req.body;
  const transaction = await createTransaction(req.user!.id, {
    ...rest,
    transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
    category: { connect: { id: categoryId } },
    account: accountId ? { connect: { id: accountId } } : undefined,
  });
  res.status(201).json(transaction);
});

router.put('/:id', validate(updateTransactionSchema), async (req: AuthenticatedRequest, res) => {
  const { categoryId, accountId, transactionDate, ...rest } = req.body;
  const transaction = await updateTransaction(req.params.id, req.user!.id, {
    ...rest,
    transactionDate: transactionDate ? new Date(transactionDate) : undefined,
    category: categoryId ? { connect: { id: categoryId } } : undefined,
    account: accountId ? { connect: { id: accountId } } : undefined,
  });
  res.json(transaction);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  await deleteTransaction(req.params.id, req.user!.id);
  res.json({ success: true });
});

export default router;