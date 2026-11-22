import { prisma } from '../config/prisma';
import { TransactionType } from '@prisma/client';
import { AppError } from '../middleware/errorHandler';

export async function getCategories(userId: string, type?: TransactionType) {
  return prisma.category.findMany({
    where: {
      OR: [
        { userId },
        { userId: null }, // System/default categories
      ],
      ...(type && { type }),
    },
    orderBy: [{ isDefault: 'desc' }, { sortOrder: 'asc' }, { name: 'asc' }],
  });
}

export async function getCategoryById(id: string, userId: string) {
  const category = await prisma.category.findFirst({
    where: {
      id,
      OR: [{ userId }, { userId: null }],
    },
  });

  if (!category) {
    throw new AppError(404, 'Category not found');
  }

  return category;
}

export async function createCategory(
  userId: string,
  data: { name: string; type: TransactionType; icon?: string; color?: string }
) {
  // Check for duplicate
  const existing = await prisma.category.findFirst({
    where: { name: data.name, type: data.type, userId },
  });

  if (existing) {
    throw new AppError(409, 'Category with this name already exists');
  }

  return prisma.category.create({
    data: {
      ...data,
      userId,
      isDefault: false,
    },
  });
}

export async function updateCategory(
  id: string,
  userId: string,
  data: { name?: string; icon?: string; color?: string; sortOrder?: number }
) {
  const category = await getCategoryById(id, userId);

  if (!category.userId) {
    throw new AppError(403, 'Cannot modify system categories');
  }

  if (data.name && data.name !== category.name) {
    const existing = await prisma.category.findFirst({
      where: { name: data.name, type: category.type, userId },
    });
    if (existing) {
      throw new AppError(409, 'Category with this name already exists');
    }
  }

  return prisma.category.update({
    where: { id },
    data,
  });
}

export async function deleteCategory(id: string, userId: string) {
  const category = await getCategoryById(id, userId);

  if (!category.userId) {
    throw new AppError(403, 'Cannot delete system categories');
  }

  // Check if category has transactions
  const txCount = await prisma.transaction.count({
    where: { categoryId: id, userId },
  });

  if (txCount > 0) {
    throw new AppError(400, 'Cannot delete category with existing transactions');
  }

  await prisma.category.delete({ where: { id } });
  return { success: true };
}