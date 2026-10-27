import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import helmet from 'helmet';
import { crearValidationPipe } from './common/validation';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Cabeceras de seguridad HTTP (X-Content-Type-Options, X-Frame-Options, HSTS, CSP...)
  app.use(helmet());
  app.getHttpAdapter().getInstance().disable('x-powered-by');

  // Solo el frontend configurado puede llamar a la API desde el navegador
  const origenes = (process.env.FRONTEND_URL ?? 'http://localhost:5173')
    .split(',')
    .map((origen) => origen.trim());
  app.enableCors({
    origin: origenes,
    credentials: true,
  });

  app.useGlobalPipes(crearValidationPipe());
  await app.listen(process.env.PORT || 3000);
}

bootstrap();