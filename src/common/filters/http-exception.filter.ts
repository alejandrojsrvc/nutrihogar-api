import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

interface ErrorPayload {
  error?: unknown;
  message?: unknown;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();
    const statusCode =
      exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const payload = this.getPayload(exception);

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception);
    }

    response.status(statusCode).json({
      statusCode,
      error: payload.error,
      message: payload.message,
      path: request.originalUrl,
      timestamp: new Date().toISOString(),
    });
  }

  private getPayload(exception: unknown): Required<ErrorPayload> {
    if (!(exception instanceof HttpException)) {
      return {
        error: 'Internal Server Error',
        message: 'Internal server error',
      };
    }

    const response = exception.getResponse();
    if (typeof response === 'string') {
      return {
        error: this.statusLabel(exception.getStatus()),
        message: response,
      };
    }

    const payload = response as ErrorPayload;
    return {
      error:
        typeof payload.error === 'string' ? payload.error : this.statusLabel(exception.getStatus()),
      message: payload.message ?? exception.message,
    };
  }

  private statusLabel(statusCode: number): string {
    return (HttpStatus[statusCode] ?? 'ERROR')
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
