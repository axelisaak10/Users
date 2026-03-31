import { PipeTransform, Injectable, BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';
@Injectable()
export class JsonSchemaValidationPipe implements PipeTransform {
  private ajv: Ajv;
  private readonly schemas = {
    login: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string', minLength: 6 },
      },
      required: ['email', 'password'],
      additionalProperties: false,
    },
    updateProfile: {
      type: 'object',
      properties: {
        nombre_completo: { type: 'string', minLength: 1, maxLength: 255 },
        username: { type: 'string', minLength: 3, maxLength: 50, pattern: '^[a-zA-Z0-9_-]+$' },
        email: { type: 'string', format: 'email', maxLength: 255 },
        telefono: { type: 'string', minLength: 1, maxLength: 20, pattern: '^[0-9+\-\s()]+$' },
        direccion: { type: 'string', minLength: 1 },
        fecha_inicio: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        fecha_nacimiento: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        password: { type: 'string', minLength: 8 },
      },
      additionalProperties: false,
    },
    updatePermisos: {
      type: 'object',
      properties: {
        permisos_globales: { type: 'array', items: { type: 'string', format: 'uuid' } },
      },
      required: ['permisos_globales'],
      additionalProperties: false,
    },
  };
  constructor() {
    this.ajv = new Ajv({ allErrors: true, coerceTypes: false });
    addFormats(this.ajv);
  }
  transform(value: any, metadata: any) {
    if (metadata.type !== 'body') return value;
    const schemaName = this.getSchemaName(metadata);
    if (!schemaName) return value;
    const schema = this.schemas[schemaName as keyof typeof this.schemas];
    if (!schema) return value;
    const validate = this.ajv.compile(schema);
    const valid = validate(value);
    if (!valid) {
      const errors = validate.errors?.map(e => `${e.instancePath || '/'}: ${e.message}`).join('; ');
      throw new BadRequestException({
        statusCode: 400,
        message: 'Validación JSON Schema fallida',
        errors: validate.errors,
        detail: errors,
      });
    }
    return value;
  }
  private getSchemaName(metadata: any): string | null {
    const path = metadata.metatype?.name || '';
    
    if (path.includes('LoginDto')) return 'login';
    if (path.includes('UpdateProfileDto')) return 'updateProfile';
    if (path.includes('UpdatePermisosDto')) return 'updatePermisos';
    
    return null;
  }
}