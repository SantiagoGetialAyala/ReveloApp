import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto';

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async update(userId: string, role: string, dto: UpdateProfileDto) {
    const profile = await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        city: dto.city,
        department: dto.department,
        photoData: dto.photoData,
      },
      create: {
        userId,
        firstName: dto.firstName ?? '',
        lastName: dto.lastName ?? '',
        phone: dto.phone,
        city: dto.city,
        department: dto.department,
        photoData: dto.photoData,
      },
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
    });

    if (role === 'CLIENT' && dto.businessName) {
      await this.prisma.companyProfile.upsert({
        where: { userId },
        update: {
          businessName: dto.businessName,
          contactPhone: dto.contactPhone,
          city: dto.city,
          department: dto.department,
        },
        create: {
          userId,
          businessName: dto.businessName,
          contactPhone: dto.contactPhone,
          city: dto.city,
          department: dto.department,
        },
      });
    }
    if (role === 'TRANSPORTER' && dto.displayName) {
      await this.prisma.transporterProfile.upsert({
        where: { userId },
        update: {
          displayName: dto.displayName,
          baseCity: dto.baseCity,
          baseDepartment: dto.baseDepartment,
        },
        create: {
          userId,
          displayName: dto.displayName,
          baseCity: dto.baseCity,
          baseDepartment: dto.baseDepartment,
        },
      });
    }

    return profile;
  }
}
