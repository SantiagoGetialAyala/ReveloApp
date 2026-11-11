import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findTransporters() {
    return this.prisma.user.findMany({
      where: { role: 'TRANSPORTER', status: 'ACTIVE' },
      select: {
        id: true,
        email: true,
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
        transporterProfile: true,
        vehicles: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
