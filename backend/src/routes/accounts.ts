import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { validate, createAccountSchema, updateAccountSchema } from '../middleware/validation';
import { prisma } from '../config/prisma';
import { AppError } from '../middleware/errorHandler';

const router = Router();

router.use(authMiddleware);

router.get('/', async (req: AuthenticatedRequest, res) => {
  const accounts = await prisma.account.findMany({
    where: { userId: req.user!.id, isActive: true },
    orderBy: { createdAt: 'desc' },
  });
  res.json(accounts);
});

router.get('/:id', async (req: AuthenticatedRequest, res) => {
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Account not found');
  res.json(account);
});

router.post('/', validate(createAccountSchema), async (req: AuthenticatedRequest, res) => {
  const account = await prisma.account.create({
    data: {
      ...req.body,
      userId: req.user!.id,
      currentBalance: req.body.initialBalance || 0,
    },
  });
  res.status(201).json(account);
});

router.put('/:id', validate(updateAccountSchema), async (req: AuthenticatedRequest, res) => {
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Account not found');

  const updated = await prisma.account.update({
    where: { id: req.params.id },
    data: req.body,
  });
  res.json(updated);
});

router.delete('/:id', async (req: AuthenticatedRequest, res) => {
  const account = await prisma.account.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
  });
  if (!account) throw new AppError(404, 'Account not found');

  // Soft delete
  await prisma.account.update({
    where: { id: req.params.id },
    data: { isActive: false },
  });
  res.json({ success: true });
});

export default router;