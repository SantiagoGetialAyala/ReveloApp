import { resolve } from 'path';
import { config as loadEnv } from 'dotenv';
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

loadEnv({ path: resolve(__dirname, '../../..', '.env') });
const prisma = new PrismaClient();

async function main() {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl) throw new Error('DATABASE_URL no está configurada.');
  const databaseUrl = new URL(rawUrl);
  const localHost = ['localhost', '127.0.0.1', '::1'].includes(databaseUrl.hostname);
  const localDatabase = databaseUrl.pathname.replace(/^\//, '').split('?')[0] === 'revelo';
  if (!localHost || !localDatabase) {
    throw new Error(
      'Por seguridad, el reinicio solo funciona en la base local revelo de localhost.',
    );
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME?.trim() || 'Revelo Transporte';
  if (!email || !password || password.length < 16) {
    throw new Error(
      'Configura ADMIN_EMAIL y una ADMIN_PASSWORD de al menos 16 caracteres en .env.',
    );
  }

  await prisma.$transaction(async (tx) => {
    await tx.auditLog.deleteMany();
    await tx.tripReview.deleteMany();
    await tx.incidentHistory.deleteMany();
    await tx.tripIncident.deleteMany();
    await tx.tripMessage.deleteMany();
    await tx.tripStatusHistory.deleteMany();
    await tx.proposalMessage.deleteMany();
    await tx.proposalPriceOffer.deleteMany();
    await tx.trip.deleteMany();
    await tx.proposal.deleteMany();
    await tx.cargoImage.deleteMany();
    await tx.cargo.deleteMany();
    await tx.notification.deleteMany();
    await tx.vehicle.deleteMany();
    await tx.verificationDocument.deleteMany();
    await tx.userProfile.deleteMany();
    await tx.companyProfile.deleteMany();
    await tx.transporterProfile.deleteMany();
    await tx.user.deleteMany();
  });

  const admin = await prisma.user.create({
    data: {
      email,
      passwordHash: await argon2.hash(password),
      role: 'ADMIN',
      status: 'ACTIVE',
      profile: { create: { firstName: name, lastName: 'Administración' } },
    },
  });
  await prisma.userProfile.upsert({
    where: { userId: admin.id },
    update: { firstName: name, lastName: 'Administración' },
    create: { userId: admin.id, firstName: name, lastName: 'Administración' },
  });
  console.log(`Datos locales eliminados. Se creó un administrador: ${email}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : 'No se pudo reiniciar la base local.');
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
