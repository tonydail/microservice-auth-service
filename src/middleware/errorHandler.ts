import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { logger } from '../config/logger';
import { ApiResponse } from '../types/apiResponse';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    cause?: ErrorOptions,
  ) {
    super(message, { cause });
    this.name = 'AppError';
  }

  toJSON(): { message: string } {
    return {
      message: this.message,
    };
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (err instanceof AppError) {
    const errorResponse = ApiResponse.Failure(err);
    res.status(err.statusCode).json(errorResponse);
    return;
  }

  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Validation error', details: err.flatten().fieldErrors });
    return;
  }

  logger.error({ err }, 'Unhandled error');
  res.status(500).json({ error: 'Internal server error' });
}
