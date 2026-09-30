import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Request, Response } from 'express';

/** Converts every error into one consistent JSON envelope and never leaks stack traces. */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exceptions');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Something went wrong on our side. Please try again.';
    let errors: Record<string, string[]> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse() as any;
      if (typeof body === 'string') message = body;
      else {
        message = Array.isArray(body.message) ? body.message.join(', ') : (body.message ?? exception.message);
        errors = body.errors;
      }
    } else if ((exception as any)?.code === 'LIMIT_FILE_SIZE') {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      message = 'The uploaded file is too large.';
    } else if ((exception as any)?.type === 'entity.too.large') {
      status = HttpStatus.PAYLOAD_TOO_LARGE;
      message = 'The request body is too large.';
    } else if ((exception as any)?.type === 'entity.parse.failed') {
      status = HttpStatus.BAD_REQUEST;
      message = 'The request body contains invalid JSON.';
    } else {
      this.logger.error(`${req.method} ${req.url} → ${(exception as Error)?.message}`, (exception as Error)?.stack);
    }

    res.status(status).json({
      statusCode: status,
      error: HttpStatus[status]?.replace(/_/g, ' ') ?? 'Error',
      message,
      ...(errors ? { errors } : {}),
      path: req.url,
      timestamp: new Date().toISOString(),
    });
  }
}
