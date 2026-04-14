import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { UnwrapperPipe } from './common/pipes/unwrapper.pipe';
import { JsonSchemaValidationPipe } from './common/pipes/json-schema-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: [
      'http://localhost:3008',
      'https://apigatway.onrender.com',
    ],
    credentials: true,
  });
  app.use(cookieParser());

  app.useGlobalPipes(
    new UnwrapperPipe(),
    new JsonSchemaValidationPipe(),
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());
  const config = new DocumentBuilder()
    .setTitle('Auth Microservice API')
    .setDescription(
      'Microservicio de autenticación con validación JSON Schema. Solo login/logout y gestión de permisos propios.',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Auth', 'Operaciones de autenticación (login, logout, perfil)')
    .addTag('Users', 'Perfil del usuario logueado')
    .addTag('Permisos', 'Gestión de permisos del usuario logueado')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);
  await app.listen(process.env.PORT ?? 3444);
}
bootstrap();
