import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class GlobalHttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const rawResponse =
      exception instanceof HttpException
        ? exception.getResponse()
        : { message: (exception as Error)?.message || 'Internal Server Error' };

    const message =
      typeof rawResponse === 'string'
        ? rawResponse
        : (rawResponse as any)?.message || 'Unexpected application error';

    // Structured log with sensitive data redaction (no mobile numbers or tokens logged)
    const sanitizedPath = String(request?.url || '').replace(/\+?[0-9]{10,15}/g, '[REDACTED_MOBILE]');
    if (status >= 500) {
      console.error(
        JSON.stringify({
          level: 'ERROR',
          timestamp: new Date().toISOString(),
          statusCode: status,
          method: request?.method,
          path: sanitizedPath,
          error: message,
        })
      );
    }

    response.status(status).json({
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: sanitizedPath,
      message,
    });
  }
}

