import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { AccountStatus, UserRole } from '@prisma/client';
import * as argon2 from 'argon2';
import { randomInt, randomUUID } from 'crypto';
import { PrismaService } from '../prisma/prisma.service';
import { ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const phone = dto.phone?.replace(/[\s()-]/g, '');
    if (await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } })) {
      throw new ConflictException('Este correo ya está registrado.');
    }
    if (dto.role === 'TRANSPORTER' && !dto.vehicle)
      throw new BadRequestException('Registra tu vehículo para comenzar.');
    if (dto.role === 'TRANSPORTER') {
      const required = ['ID_CARD', 'CRIMINAL_RECORD'];
      const supplied = new Set((dto.documents ?? []).map((document) => document.type));
      if (required.some((type) => !supplied.has(type)) || supplied.size !== required.length)
        throw new BadRequestException('Adjunta cédula y antecedentes judiciales.');
      if (!dto.vehicle?.photos?.length || !dto.vehicle.ownershipDocumentData)
        throw new BadRequestException('Adjunta la tarjeta de propiedad y una foto del vehículo.');
      for (const document of dto.documents ?? []) {
        if (Buffer.from(document.dataUrl.split(',')[1] ?? '', 'base64').length > 2_000_000)
          throw new BadRequestException('Cada documento debe pesar máximo 2 MB.');
      }
    }
    if (dto.role === 'CLIENT' && dto.vehicle)
      throw new BadRequestException('Solo un transportador puede registrar un vehículo.');
    if (dto.role === 'CLIENT' && dto.accountType !== 'PERSON' && !dto.taxId?.trim())
      throw new BadRequestException('Ingresa el NIT de la empresa para su validación.');
    if (
      dto.vehicle &&
      (await this.prisma.vehicle.findUnique({ where: { plate: dto.vehicle.plate.toUpperCase() } }))
    ) {
      throw new ConflictException('Esta placa ya está registrada.');
    }
    const passwordHash = await argon2.hash(dto.password);
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        passwordHash,
        role: dto.role as UserRole,
        status: AccountStatus.PENDING_VERIFICATION,
        profile: {
          create: {
            firstName: dto.displayName,
            lastName: '',
            phone,
          },
        },
        companyProfile:
          dto.role === 'CLIENT' && dto.accountType !== 'PERSON'
            ? {
                create: {
                  businessName: dto.displayName,
                  contactPhone: phone,
                  taxId: dto.taxId,
                },
              }
            : undefined,
        vehicles: dto.vehicle
          ? {
              create: {
                ...dto.vehicle,
                plate: dto.vehicle.plate.toUpperCase(),
                isActive: false,
                isAvailable: false,
                verificationStatus: 'PENDING',
                locationUpdatedAt: dto.vehicle.latitude != null ? new Date() : undefined,
              },
            }
          : undefined,
        transporterProfile:
          dto.role === 'TRANSPORTER'
            ? { create: { displayName: dto.displayName, availability: 'Disponible' } }
            : undefined,
        verificationDocuments:
          dto.role === 'TRANSPORTER'
            ? {
                create: dto.documents?.map(({ type, fileName, mimeType, dataUrl }) => ({
                  type: type as 'ID_CARD' | 'CRIMINAL_RECORD',
                  fileName,
                  mimeType,
                  dataUrl,
                })),
              }
            : undefined,
      },
      select: { id: true, email: true, role: true },
    });

    return {
      status: AccountStatus.PENDING_VERIFICATION,
      message: 'Recibimos tus datos. Podrás ingresar cuando el equipo de Revelo valide tu cuenta.',
      account: { id: user.id, email: user.email, role: user.role },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await argon2.verify(user.passwordHash, dto.password))) {
      throw new UnauthorizedException('Credenciales invalidas.');
    }
    if (user.status === AccountStatus.PENDING_VERIFICATION)
      throw new ForbiddenException(
        'Tu cuenta está en revisión. Te avisaremos cuando sea validada.',
      );
    if (user.status !== AccountStatus.ACTIVE)
      throw new ForbiddenException('Tu cuenta no está habilitada. Contacta al equipo de Revelo.');

    await this.prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    return this.issueToken(user);
  }

  async me(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        profile: {
          select: {
            id: true,
            userId: true,
            firstName: true,
            lastName: true,
            phone: true,
            documentType: true,
            documentNumber: true,
            city: true,
            department: true,
            createdAt: true,
            updatedAt: true,
          },
        },
        companyProfile: true,
        transporterProfile: true,
      },
    });
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const token = randomUUID();
    const resetPasswordExpires = new Date(Date.now() + 1000 * 60 * 30);
    await this.prisma.user.updateMany({
      where: { email: dto.email.toLowerCase() },
      data: { resetPasswordToken: token, resetPasswordExpires },
    });
    return { message: 'Si el correo existe, se genero un token de recuperacion.', token };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const user = await this.prisma.user.findFirst({
      where: { resetPasswordToken: dto.token, resetPasswordExpires: { gt: new Date() } },
    });
    if (!user) throw new BadRequestException('Token invalido o expirado.');

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash: await argon2.hash(dto.password),
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });
    return { message: 'Contrasena actualizada.' };
  }

  private issueToken(user: { id: string; email: string; role: UserRole }) {
    const accessToken = this.jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      {
        secret: this.config.get<string>('JWT_SECRET') ?? 'dev-secret',
        expiresIn: this.config.get<string>('JWT_EXPIRES_IN') ?? '1d',
      },
    );
    return { accessToken, user: { id: user.id, email: user.email, role: user.role } };
  }
}
