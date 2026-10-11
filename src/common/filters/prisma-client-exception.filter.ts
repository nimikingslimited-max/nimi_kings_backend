import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { Prisma } from '@prisma/client';

@Catch(
  Prisma.PrismaClientKnownRequestError,
  Prisma.PrismaClientInitializationError,
  Prisma.PrismaClientRustPanicError,
)
export class PrismaClientExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaClientExceptionFilter.name);

  catch(
    exception:
      | Prisma.PrismaClientKnownRequestError
      | Prisma.PrismaClientInitializationError
      | Prisma.PrismaClientRustPanicError
      | any,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal database error';

    // Handle connection refusal (ECONNREFUSED)
    if (
      exception.code === 'ECONNREFUSED' ||
      exception.message?.includes('ECONNREFUSED')
    ) {
      statusCode = HttpStatus.SERVICE_UNAVAILABLE;
      message =
        'Database service is unavailable. Please verify that PostgreSQL is running and reachable.';
      this.logger.error(`Database connection refused: ${exception.message}`);
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002': {
          statusCode = HttpStatus.CONFLICT;
          const target =
            (exception.meta?.target as string[])?.join(', ') || 'field';
          message = `A unique constraint violation occurred: ${target} already exists.`;
          break;
        }
        case 'P2025': {
          statusCode = HttpStatus.NOT_FOUND;
          message = (exception.meta?.cause as string) || 'Record not found.';
          break;
        }
        case 'P2003': {
          statusCode = HttpStatus.BAD_REQUEST;
          message = 'Foreign key constraint failed on the referenced relation.';
          break;
        }
        default: {
          this.logger.error(
            `Prisma error [${exception.code}]: ${exception.message}`,
          );
          message = `Database operation error [${exception.code}]`;
          break;
        }
      }
    } else {
      this.logger.error(`Database error: ${exception.message}`);
    }

    response.status(statusCode).json({
      statusCode,
      message,
      timestamp: new Date().toISOString(),
    });
  }
}
