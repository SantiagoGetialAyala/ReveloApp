import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async dashboard() {
    const [
      users,
      transportersPendingVerification,
      clientsPendingVerification,
      vehiclesPendingVerification,
      vehicles,
      allCargos,
      openCargos,
      proposals,
      pendingProposals,
      allTrips,
      activeTrips,
      completedTrips,
      openIncidents,
      completedTripValue,
    ] = await this.prisma.$transaction([
      this.prisma.user.count(),
      this.prisma.user.count({ where: { role: 'TRANSPORTER', status: 'PENDING_VERIFICATION' } }),
      this.prisma.user.count({ where: { role: 'CLIENT', status: 'PENDING_VERIFICATION' } }),
      this.prisma.vehicle.count({ where: { verificationStatus: 'PENDING' } }),
      this.prisma.vehicle.count({ where: { isActive: true } }),
      this.prisma.cargo.count(),
      this.prisma.cargo.count({ where: { status: 'OPEN' } }),
      this.prisma.proposal.count(),
      this.prisma.proposal.count({ where: { status: 'PENDING', cargo: { status: 'OPEN' } } }),
      this.prisma.trip.count(),
      this.prisma.trip.count({ where: { status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.trip.count({ where: { status: 'COMPLETED' } }),
      this.prisma.tripIncident.count({
        where: { status: { in: ['OPEN', 'IN_REVIEW', 'WAITING_INFO'] } },
      }),
      this.prisma.trip.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { agreedPriceCop: true },
      }),
    ]);
    const completedTripValueCop = Number(completedTripValue._sum.agreedPriceCop ?? 0);
    const platformCommissionCop = Math.round(completedTripValueCop * 0.05);
    const latestIncidents = await this.prisma.tripIncident.findMany({
      where: { status: { in: ['OPEN', 'IN_REVIEW', 'WAITING_INFO'] } },
      include: { trip: { select: { id: true, cargo: { select: { id: true, title: true } } } } },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    return {
      users,
      transportersPendingVerification,
      clientsPendingVerification,
      vehiclesPendingVerification,
      vehicles,
      allCargos,
      openCargos,
      proposals,
      pendingProposals,
      allTrips,
      activeTrips,
      completedTrips,
      completedTripValueCop,
      platformCommissionCop,
      openIncidents,
      latestIncidents,
    };
  }

  users() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
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
        receivedReviews: { select: { score: true } },
        _count: {
          select: {
            vehicles: true,
            cargos: true,
            proposals: true,
            clientTrips: true,
            transporterTrips: true,
            receivedReviews: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  verifications() {
    return this.prisma.user.findMany({
      where: {
        OR: [
          { status: 'PENDING_VERIFICATION' },
          { vehicles: { some: { verificationStatus: 'PENDING' } } },
        ],
      },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
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
        verificationDocuments: {
          select: {
            id: true,
            type: true,
            fileName: true,
            mimeType: true,
            dataUrl: true,
            createdAt: true,
          },
        },
        vehicles: {
          where: { verificationStatus: 'PENDING' },
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            photos: true,
            maxWeightKg: true,
            ownershipDocumentData: true,
            ownershipDocumentName: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  vehicleChangeRequests() {
    return this.prisma.vehicleChangeRequest.findMany({
      where: { status: 'PENDING' },
      include: {
        requester: {
          select: {
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
          },
        },
        vehicle: { select: { id: true, plate: true, brand: true, model: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async reviewVehicleChangeRequest(id: string, adminId: string, approved: boolean, note?: string) {
    const request = await this.prisma.vehicleChangeRequest.findUnique({ where: { id } });
    if (!request) throw new NotFoundException('Solicitud de cambio no encontrada.');
    if (request.status !== 'PENDING')
      throw new BadRequestException('Esta solicitud ya fue revisada.');
    return this.prisma.$transaction(async (tx) => {
      if (approved) {
        const changes = request.changes as Record<string, unknown>;
        if (typeof changes.plate === 'string') {
          const duplicate = await tx.vehicle.findFirst({
            where: { plate: changes.plate.toUpperCase(), id: { not: request.vehicleId } },
          });
          if (duplicate) throw new BadRequestException('La placa solicitada ya está registrada.');
        }
        const data = { ...changes } as Record<string, unknown>;
        if (typeof data.plate === 'string') data.plate = data.plate.toUpperCase();
        await tx.vehicle.update({ where: { id: request.vehicleId }, data: data as never });
      }
      const updated = await tx.vehicleChangeRequest.update({
        where: { id },
        data: {
          status: approved ? 'APPROVED' : 'REJECTED',
          reviewerId: adminId,
          reviewNote: note?.trim() || null,
          reviewedAt: new Date(),
        },
      });
      await tx.notification.create({
        data: {
          userId: request.requesterId,
          title: approved ? 'Cambio de vehículo aprobado' : 'Cambio de vehículo rechazado',
          body:
            note?.trim() ||
            (approved
              ? 'Los cambios solicitados ya están en tu vehículo.'
              : 'Revisa tu solicitud y contacta a soporte si necesitas más información.'),
          type: 'VEHICLE_CHANGE_REVIEWED',
          metadata: { vehicleId: request.vehicleId, requestId: id },
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: approved ? 'VEHICLE_CHANGE_APPROVED' : 'VEHICLE_CHANGE_REJECTED',
          entity: 'VehicleChangeRequest',
          entityId: id,
          metadata: note ? { note } : undefined,
        },
      });
      return updated;
    });
  }

  async reviewUser(userId: string, adminId: string, status: 'ACTIVE' | 'SUSPENDED', note?: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { verificationDocuments: true, vehicles: true, companyProfile: true },
    });
    if (!user) throw new NotFoundException('Cuenta no encontrada.');
    if (user.role === 'ADMIN')
      throw new BadRequestException('No puedes cambiar el estado del administrador.');
    if (status === 'ACTIVE' && user.role === 'TRANSPORTER') {
      const documentTypes = new Set(user.verificationDocuments.map((document) => document.type));
      const complete = ['ID_CARD', 'CRIMINAL_RECORD'].every((type) =>
        documentTypes.has(type as never),
      );
      if (
        !complete ||
        !user.vehicles.some(
          (vehicle) =>
            vehicle.photos.length > 0 &&
            Boolean(vehicle.ownershipDocumentData) &&
            Boolean(vehicle.ownershipDocumentName),
        )
      )
        throw new BadRequestException('Faltan documentos obligatorios o la foto del vehículo.');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.user.update({ where: { id: userId }, data: { status } });
      if (status === 'ACTIVE' && user.role === 'TRANSPORTER') {
        await tx.vehicle.updateMany({
          where: {
            ownerId: userId,
            verificationStatus: 'PENDING',
            ownershipDocumentData: { not: null },
          },
          data: { verificationStatus: 'APPROVED', isActive: true, isAvailable: true },
        });
      }
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: status === 'ACTIVE' ? 'ACCOUNT_APPROVED' : 'ACCOUNT_SUSPENDED',
          entity: 'User',
          entityId: userId,
          metadata: note ? { note } : undefined,
        },
      });
      await tx.notification.create({
        data: {
          userId,
          title: status === 'ACTIVE' ? 'Cuenta validada' : 'Cuenta suspendida',
          body:
            status === 'ACTIVE'
              ? 'Tu cuenta fue validada. Ya puedes ingresar a Revelo Transporte.'
              : `Tu cuenta no está habilitada.${note ? ` Motivo: ${note}` : ''}`,
          type: status === 'ACTIVE' ? 'ACCOUNT_APPROVED' : 'ACCOUNT_SUSPENDED',
        },
      });
      return { id: updated.id, status: updated.status };
    });
  }

  async reviewVehicle(vehicleId: string, adminId: string, approved: boolean, note?: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id: vehicleId } });
    if (!vehicle) throw new NotFoundException('Vehículo no encontrado.');
    if (!vehicle.ownershipDocumentData || !vehicle.photos.length)
      throw new BadRequestException('El vehículo no tiene tarjeta de propiedad o foto.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.vehicle.update({
        where: { id: vehicleId },
        data: {
          verificationStatus: approved ? 'APPROVED' : 'REJECTED',
          isActive: approved,
          isAvailable: approved,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: approved ? 'VEHICLE_APPROVED' : 'VEHICLE_REJECTED',
          entity: 'Vehicle',
          entityId: vehicleId,
          metadata: note ? { note } : undefined,
        },
      });
      return { id: updated.id, verificationStatus: updated.verificationStatus };
    });
  }

  async cargoQueue() {
    return this.prisma.cargo.findMany({
      include: {
        client: {
          select: {
            id: true,
            email: true,
            companyProfile: true,
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
          },
        },
        _count: { select: { proposals: true } },
        trip: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async tripQueue() {
    return this.prisma.trip.findMany({
      include: {
        cargo: { select: { id: true, title: true, status: true } },
        client: { select: { id: true, email: true } },
        transporter: { select: { id: true, email: true } },
        vehicle: { select: { plate: true, brand: true, model: true } },
        incidents: { select: { id: true, status: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async cancelCargo(cargoId: string, adminId: string, reason: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id: cargoId },
      include: { trip: true },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    if (cargo.status === 'CANCELLED') return cargo;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.cargo.update({
        where: { id: cargoId },
        data: { status: 'CANCELLED' },
      });
      if (cargo.trip) {
        await tx.trip.update({ where: { id: cargo.trip.id }, data: { status: 'CANCELLED' } });
        await tx.vehicle.update({
          where: { id: cargo.trip.vehicleId },
          data: { isAvailable: true },
        });
      }
      await tx.proposal.updateMany({
        where: { cargoId, status: 'PENDING' },
        data: { status: 'REJECTED' },
      });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'CARGO_CANCELLED_BY_ADMIN',
          entity: 'Cargo',
          entityId: cargoId,
          metadata: { reason },
        },
      });
      return updated;
    });
  }

  async cancelTrip(tripId: string, adminId: string, reason: string) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    if (trip.status === 'CANCELLED') return trip;
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.update({
        where: { id: tripId },
        data: { status: 'CANCELLED' },
      });
      await tx.cargo.update({ where: { id: trip.cargoId }, data: { status: 'CANCELLED' } });
      await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { isAvailable: true } });
      await tx.auditLog.create({
        data: {
          actorId: adminId,
          action: 'TRIP_CANCELLED_BY_ADMIN',
          entity: 'Trip',
          entityId: tripId,
          metadata: { reason },
        },
      });
      return updated;
    });
  }
}
