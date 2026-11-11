import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

loadEnv({ path: resolve(__dirname, '../../..', '.env') });
const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Revelo Transporte';
  if (!email || !password || password.length < 16) {
    throw new Error(
      'Configura ADMIN_EMAIL y una ADMIN_PASSWORD de al menos 16 caracteres en .env.',
    );
  }
  const passwordHash = await argon2.hash(password);
  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash, role: 'ADMIN', status: 'ACTIVE' },
    create: {
      email,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: { create: { firstName: name, lastName: 'Administración' } },
    },
  });
  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: { firstName: name, lastName: 'Administración' },
    create: { userId: user.id, firstName: name, lastName: 'Administración' },
  });
  const extraAdmins = await prisma.user.findMany({
    where: { role: 'ADMIN', id: { not: user.id } },
    select: { id: true },
  });
  if (extraAdmins.length) {
    throw new Error(
      'Hay otras cuentas administrador. Ejecuta db:reset-local para dejar solo Revelo Transporte.',
    );
  }
  console.log(`Administrador listo: ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'No se pudo crear el administrador.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
