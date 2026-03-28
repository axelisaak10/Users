import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface Response<T> {
  statusCode: number;
  intOpCode: number;
  data: T[];
}

@Injectable()
export class TransformInterceptor<T>
  implements NestInterceptor<T, Response<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<Response<T>> {
    const response = context.switchToHttp().getResponse();
    const statusCode = response.statusCode;

    return next.handle().pipe(
      map((data) => {
        // Si data ya es un array, lo dejamos como está, si no, lo envolvemos en uno
        const finalData = Array.isArray(data) ? data : data ? [data] : [];
        
        return {
          statusCode: statusCode,
          intOpCode: 0,
          data: finalData,
        };
      }),
    );
  }
}
