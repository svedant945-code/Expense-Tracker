import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    public message: string,
    public details?: any
  ) {
    super(message);
    Object.setPrototypeOf(this, AppError.prototype);
  }
}

export function errorHandler(
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  console.error('Error:', err);

  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const field = (err.meta?.target as string[])?.join(', ') || 'field';
      return res.status(409).json({
        error: `Duplicate value for ${field}`,
        code: 'DUPLICATE_ENTRY',
      });
    }
    if (err.code === 'P2003') {
      return res.status(400).json({
        error: 'Referenced record does not exist',
        code: 'FOREIGN_KEY_VIOLATION',
      });
    }
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  return res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
}

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: 'Route not found' });
}