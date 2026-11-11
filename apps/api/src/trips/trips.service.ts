import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { IncidentStatus, Prisma, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const transitions: Record<TripStatus, TripStatus[]> = {
  PENDING_PICKUP: ['AT_PICKUP', 'CANCELLED'],
  AT_PICKUP: ['IN_TRANSIT', 'CANCELLED'],
  IN_TRANSIT: ['DELIVERED', 'CANCELLED'],
  DELIVERED: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

@Injectable()
export class TripsService {
  constructor(private readonly prisma: PrismaService) {}

  private async getChatTrip(id: string, userId: string, role: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      select: { id: true, clientId: true, transporterId: true },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    if (
      role !== 'ADMIN' &&
      (role !== 'CLIENT' || trip.clientId !== userId) &&
      (role !== 'TRANSPORTER' || trip.transporterId !== userId)
    )
      throw new ForbiddenException('Solo las personas de este viaje pueden consultar el chat.');
    return trip;
  }

  async messages(id: string, userId: string, role: string) {
    await this.getChatTrip(id, userId, role);
    if (role !== 'ADMIN')
      await this.prisma.tripMessage.updateMany({
        where: { tripId: id, senderId: { not: userId }, readAt: null },
        data: { readAt: new Date() },
      });
    const messages = await this.prisma.tripMessage.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return messages.reverse();
  }

  async sendMessage(id: string, userId: string, role: string, rawBody: string) {
    const trip = await this.getChatTrip(id, userId, role);
    const body = rawBody.trim();
    if (!body) throw new BadRequestException('Escribe un mensaje antes de enviarlo.');
    const recentMessages = await this.prisma.tripMessage.count({
      where: { tripId: id, senderId: userId, createdAt: { gte: new Date(Date.now() - 60_000) } },
    });
    if (recentMessages >= 10)
      throw new BadRequestException('Espera un momento antes de enviar más mensajes.');
    const recipientId = trip.clientId === userId ? trip.transporterId : trip.clientId;
    return this.prisma.$transaction(async (tx) => {
      const message = await tx.tripMessage.create({ data: { tripId: id, senderId: userId, body } });
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: 'Nuevo mensaje sobre tu viaje',
          body: body.length > 150 ? `${body.slice(0, 147)}…` : body,
          type: 'TRIP_MESSAGE',
          metadata: { tripId: id },
        },
      });
      return message;
    });
  }

  async incidents(id: string, userId: string, role: string) {
    await this.getChatTrip(id, userId, role);
    return this.prisma.tripIncident.findMany({
      where: { tripId: id },
      include: {
        history: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  adminIncidents() {
    return this.prisma.tripIncident.findMany({
      include: {
        trip: { select: { id: true, cargo: { select: { title: true } } } },
        history: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createIncident(
    id: string,
    userId: string,
    role: string,
    type: string,
    rawDescription: string,
  ) {
    const trip = await this.getChatTrip(id, userId, role);
    const description = rawDescription.trim();
    if (description.length < 5)
      throw new BadRequestException('Describe la incidencia con al menos 5 caracteres.');
    const recipientId = trip.clientId === userId ? trip.transporterId : trip.clientId;
    return this.prisma.$transaction(async (tx) => {
      const incident = await tx.tripIncident.create({
        data: { tripId: id, reporterId: userId, type, description },
      });
      await tx.incidentHistory.create({
        data: { incidentId: incident.id, actorId: userId, status: IncidentStatus.OPEN },
      });
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: 'Incidencia reportada en un viaje',
          body: `Se registró una incidencia: ${type}.`,
          type: 'TRIP_INCIDENT',
          metadata: { tripId: id, incidentId: incident.id },
        },
      });
      return incident;
    });
  }

  async updateIncident(id: string, adminId: string, status: IncidentStatus, note?: string) {
    const incident = await this.prisma.tripIncident.findUnique({
      where: { id },
      include: { trip: { select: { clientId: true, transporterId: true } } },
    });
    if (!incident) throw new NotFoundException('Incidencia no encontrada.');
    if (incident.status === status)
      throw new BadRequestException('La incidencia ya tiene ese estado.');
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.tripIncident.updateMany({
        where: { id, status: incident.status },
        data: { status },
      });
      if (!updated.count)
        throw new BadRequestException(
          'La incidencia cambió. Actualiza la vista e inténtalo de nuevo.',
        );
      await tx.incidentHistory.create({
        data: { incidentId: id, actorId: adminId, status, note: note?.trim() || undefined },
      });
      for (const userId of [incident.trip.clientId, incident.trip.transporterId]) {
        await tx.notification.create({
          data: {
            userId,
            title: 'Actualización de incidencia',
            body: `La incidencia cambió a ${status}.`,
            type: 'TRIP_INCIDENT_UPDATED',
            metadata: { tripId: incident.tripId, incidentId: id },
          },
        });
      }
      return tx.tripIncident.findUniqueOrThrow({
        where: { id },
        include: { history: { orderBy: { createdAt: 'asc' } } },
      });
    });
  }

  async reviews(id: string, userId: string, role: string) {
    await this.getChatTrip(id, userId, role);
    return this.prisma.tripReview.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        tripId: true,
        authorId: true,
        recipientId: true,
        score: true,
        comment: true,
        createdAt: true,
      },
    });
  }

  async myReviewSummary(userId: string) {
    const result = await this.prisma.tripReview.aggregate({
      where: { recipientId: userId },
      _avg: { score: true },
      _count: { _all: true },
    });
    return { average: result._avg.score, count: result._count._all };
  }

  receivedReviews(userId: string) {
    return this.prisma.tripReview.findMany({
      where: { recipientId: userId },
      include: {
        trip: {
          select: {
            id: true,
            cargo: { select: { title: true, originCity: true, destinationCity: true } },
          },
        },
        author: {
          select: {
            email: true,
            profile: { select: { firstName: true, lastName: true } },
            companyProfile: { select: { businessName: true } },
            transporterProfile: { select: { displayName: true } },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createReview(id: string, userId: string, role: string, score: number, comment?: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      select: { id: true, clientId: true, transporterId: true, status: true },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    if (
      (role !== 'CLIENT' || trip.clientId !== userId) &&
      (role !== 'TRANSPORTER' || trip.transporterId !== userId)
    )
      throw new ForbiddenException('Solo las personas del viaje pueden dejar una calificación.');
    if (trip.status !== TripStatus.COMPLETED)
      throw new BadRequestException('Solo puedes calificar un viaje completado.');
    const recipientId = trip.clientId === userId ? trip.transporterId : trip.clientId;
    try {
      return await this.prisma.$transaction(async (tx) => {
        const review = await tx.tripReview.create({
          data: {
            tripId: id,
            authorId: userId,
            recipientId,
            score,
            comment: comment?.trim() || null,
          },
          select: {
            id: true,
            tripId: true,
            authorId: true,
            recipientId: true,
            score: true,
            comment: true,
            createdAt: true,
          },
        });
        await tx.notification.create({
          data: {
            userId: recipientId,
            title: 'Recibiste una calificación',
            body: 'La otra parte calificó la operación completada.',
            type: 'TRIP_REVIEW',
            metadata: { tripId: id },
          },
        });
        return review;
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002')
        throw new BadRequestException('Ya calificaste este viaje.');
      throw error;
    }
  }

  async mine(userId: string, role: string) {
    const trips = await this.prisma.trip.findMany({
      where: role === 'CLIENT' ? { clientId: userId } : { transporterId: userId },
      include: {
        client: {
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
            companyProfile: true,
          },
        },
        transporter: {
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
            transporterProfile: true,
          },
        },
        cargo: true,
        vehicle: true,
        history: { orderBy: { createdAt: 'desc' } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return trips.map((trip) => this.removeClosedTripLocation(trip));
  }

  private removeClosedTripLocation<
    T extends { status: TripStatus; vehicle: Record<string, unknown> },
  >(trip: T): T {
    if (trip.status !== TripStatus.COMPLETED && trip.status !== TripStatus.CANCELLED) return trip;
    return {
      ...trip,
      vehicle: { ...trip.vehicle, latitude: null, longitude: null, locationUpdatedAt: null },
    };
  }

  async findOne(id: string, userId: string, role: string) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        client: {
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
            companyProfile: true,
          },
        },
        transporter: {
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
            transporterProfile: true,
          },
        },
        cargo: true,
        vehicle: true,
        history: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    if (role !== 'ADMIN' && trip.clientId !== userId && trip.transporterId !== userId) {
      throw new ForbiddenException('No puedes consultar este viaje.');
    }
    return this.removeClosedTripLocation(trip);
  }

  async history(id: string, userId: string, role: string) {
    await this.findOne(id, userId, role);
    return this.prisma.tripStatusHistory.findMany({
      where: { tripId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateStatus(
    id: string,
    userId: string,
    role: string,
    nextStatus: TripStatus,
    note?: string,
  ) {
    const trip = await this.prisma.trip.findUnique({ where: { id } });
    if (!trip) throw new NotFoundException('Viaje no encontrado.');
    if (!transitions[trip.status].includes(nextStatus))
      throw new BadRequestException('Transicion de estado invalida.');
    if (nextStatus === TripStatus.CANCELLED && role !== 'ADMIN' &&
      trip.clientId !== userId && trip.transporterId !== userId) {
      throw new ForbiddenException('Solo las personas de este viaje pueden cancelarlo.');
    }
    if (nextStatus === TripStatus.COMPLETED && trip.clientId !== userId) {
      throw new ForbiddenException('Solo el cliente puede confirmar la entrega.');
    }
    if (
      nextStatus !== TripStatus.COMPLETED &&
      nextStatus !== TripStatus.CANCELLED &&
      role !== 'ADMIN' &&
      trip.transporterId !== userId
    ) {
      throw new ForbiddenException('Solo el transportador puede actualizar este estado.');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.trip.updateMany({
        where: { id, status: trip.status },
        data: { status: nextStatus },
      });
      if (!updated.count)
        throw new BadRequestException('El viaje cambió de estado. Actualiza el panel.');
      await tx.tripStatusHistory.create({
        data: { tripId: id, status: nextStatus, changedById: userId, note },
      });
      if (nextStatus === TripStatus.COMPLETED || nextStatus === TripStatus.CANCELLED) {
        await tx.vehicle.update({ where: { id: trip.vehicleId }, data: { isAvailable: true } });
        await tx.cargo.update({
          where: { id: trip.cargoId },
          data: { status: nextStatus === TripStatus.COMPLETED ? 'COMPLETED' : 'CANCELLED' },
        });
      }
      await tx.notification.create({
        data: {
          userId: trip.clientId === userId ? trip.transporterId : trip.clientId,
          title: 'Estado de viaje actualizado',
          body: `El viaje cambió a ${nextStatus}.`,
          type: 'TRIP_STATUS_CHANGED',
          metadata: { tripId: id },
        },
      });
      return tx.trip.findUniqueOrThrow({ where: { id } });
    });
  }
}
