import { PipeTransform, Injectable, ArgumentMetadata } from '@nestjs/common';
@Injectable()
export class UnwrapperPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (metadata.type === 'body' && value && value.data && Array.isArray(value.data)) {
      return value.data[0];
    }
    return value;
  }
}