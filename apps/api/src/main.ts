import { BadRequestException, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { json } from 'express';
import { ValidationError } from 'class-validator';
import { AppModule } from './app.module';

const validationLabels: Record<string, string> = {
  email: 'el correo',
  phone: 'el teléfono',
  password: 'la contraseña',
  role: 'el tipo de cuenta',
  displayName: 'el nombre',
  taxId: 'el NIT',
  documents: 'los documentos',
  vehicle: 'los datos del vehículo',
  plate: 'la placa',
  title: 'el título',
  quantity: 'la cantidad',
  quantityUnit: 'la unidad',
  units: 'el número de unidades',
  weightKg: 'el peso',
  estimatedBudgetCop: 'el presupuesto',
  pickupAddress: 'la dirección de recogida',
  deliveryAddress: 'la dirección de entrega',
  pickupWindowStart: 'la fecha de recogida',
  deliveryDeadline: 'la fecha límite de entrega',
};

function getValidationMessage(error: ValidationError): string[] {
  const field = validationLabels[error.property] ?? `el campo ${error.property}`;
  const messages = Object.entries(error.constraints ?? {}).map(([rule, original]) => {
    if (rule === 'matches' && original.startsWith('El teléfono')) return original;
    if (rule === 'whitelistValidation') return `${field} no está permitido.`;
    if (rule === 'isEmail') return 'Ingresa un correo válido, por ejemplo nombre@dominio.com.';
    if (rule === 'isNotEmpty' || rule === 'isDefined') return `${field} es obligatorio.`;
    if (rule === 'isString') return `${field} debe ser texto.`;
    if (rule === 'minLength') {
      const size = original.match(/equal to (\d+)/i)?.[1];
      return size
        ? `${field} debe tener al menos ${size} caracteres.`
        : `${field} es demasiado corto.`;
    }
    if (rule === 'maxLength') {
      const size = original.match(/equal to (\d+)/i)?.[1];
      return size
        ? `${field} no puede superar ${size} caracteres.`
        : `${field} es demasiado largo.`;
    }
    if (rule === 'matches') return `Revisa el formato de ${field}.`;
    if (rule === 'isEnum' || rule === 'isIn') return `Selecciona una opción válida para ${field}.`;
    if (rule === 'isInt') return `${field} debe ser un número entero.`;
    if (rule === 'isNumber') return `${field} debe ser un número válido.`;
    if (rule === 'isDate') return `${field} debe ser una fecha válida.`;
    if (rule === 'isLatitude') return `${field} debe ser una latitud válida.`;
    if (rule === 'isLongitude') return `${field} debe ser una longitud válida.`;
    if (rule === 'arrayMinSize') return `${field} no tiene todos los elementos requeridos.`;
    if (rule === 'arrayMaxSize') return `${field} supera la cantidad permitida de elementos.`;
    if (rule === 'isArray') return `${field} debe contener una lista de elementos.`;
    if (rule === 'min') return `${field} está por debajo del mínimo permitido.`;
    if (rule === 'max') return `${field} supera el máximo permitido.`;
    return `${field} tiene un dato no válido.`;
  });
  return [...messages, ...(error.children ?? []).flatMap(getValidationMessage)];
}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bodyParser: false });
  app.use(json({ limit: '10mb' }));
  const config = app.get(ConfigService);

  app.use(helmet());
  app.enableCors({
    origin: (config.get<string>('CORS_ORIGIN') ?? 'http://localhost:3000,http://127.0.0.1:3000')
      .split(',')
      .map((origin) => origin.trim()),
    credentials: true,
  });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      exceptionFactory: (errors) =>
        new BadRequestException({
          message: errors.flatMap(getValidationMessage),
        }),
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Revelo Transporte API')
    .setDescription('API REST para marketplace de transporte de cargas en Colombia.')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? config.get<number>('API_PORT') ?? 4000);
  await app.listen(port, '0.0.0.0');
}

void bootstrap();
