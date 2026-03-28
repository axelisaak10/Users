import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    // Normalizar el mensaje de error
    const errorData = typeof message === 'string' 
      ? { message } 
      : (message as any);

    response.status(status).json({
      statusCode: status,
      intOpCode: 1, // Usamos 1 para indicar error
      data: [
        {
          timestamp: new Date().toISOString(),
          path: request.url,
          ...errorData,
        },
      ],
    });
  }
}
