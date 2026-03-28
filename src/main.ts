import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { UnwrapperPipe } from './common/pipes/unwrapper.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.enableCors({
    origin: ['http://localhost:4200','https://seguridad-theta.vercel.app', 'https://front-end-siae.vercel.app', ,'https://seguridad-theta.vercel.app'],
    credentials: true,
  });

  app.use(cookieParser());
  
  app.useGlobalPipes(
    new UnwrapperPipe(), // Primero desempaquetamos si es necesario
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('Authentication API')
    .setDescription('The API description providing the JSON schemas for each endpoint')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3444);
}
bootstrap();
