import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';

@Injectable()
export class UnwrapperPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    // Solo actuamos sobre el body del request
    if (metadata.type === 'body' && value && value.data && Array.isArray(value.data)) {
      // Si el body tiene un campo 'data' que es array, devolvemos el primer elemento
      // para que el DTO del controlador lo reciba directamente de forma transparente.
      return value.data[0];
    }
    return value;
  }
}
