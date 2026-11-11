import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CargoStatus, ProposalStatus, TripStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProposalDto } from './dto';

@Injectable()
export class ProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(cargoId: string, transporterId: string, dto: CreateProposalDto) {
    const [cargo, vehicle, existing] = await Promise.all([
      this.prisma.cargo.findUnique({ where: { id: cargoId } }),
      this.prisma.vehicle.findUnique({ where: { id: dto.vehicleId } }),
      this.prisma.proposal.findFirst({ where: { cargoId, transporterId } }),
    ]);
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    if (cargo.clientId === transporterId)
      throw new ForbiddenException('No puedes postularte a tu propia carga.');
    if (cargo.status !== CargoStatus.OPEN)
      throw new BadRequestException('La carga no esta abierta.');
    if (
      !vehicle ||
      vehicle.ownerId !== transporterId ||
      !vehicle.isActive ||
      !vehicle.isAvailable
    ) {
      throw new ForbiddenException('Vehiculo invalido para esta postulacion.');
    }
    if (Number(vehicle.maxWeightKg) < Number(cargo.requiredCapacityKg)) {
      throw new BadRequestException('El vehiculo no tiene capacidad suficiente.');
    }
    if (existing?.status === ProposalStatus.PENDING)
      throw new BadRequestException('Ya tienes una postulacion pendiente para esta carga.');

    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.upsert({
        where: { cargoId_transporterId: { cargoId, transporterId } },
        create: {
          ...dto,
          cargoId,
          transporterId,
          priceHistory: { create: { senderId: transporterId, priceCop: dto.proposedPriceCop } },
        },
        update: {
          ...dto,
          status: ProposalStatus.PENDING,
          priceHistory: { create: { senderId: transporterId, priceCop: dto.proposedPriceCop } },
        },
        include: {
          cargo: true,
          vehicle: {
            select: {
              id: true,
              plate: true,
              brand: true,
              model: true,
              year: true,
              vehicleType: true,
              bodyType: true,
              maxWeightKg: true,
              volumeM3: true,
              operatingCity: true,
              photos: true,
              isAvailable: true,
              isActive: true,
              verificationStatus: true,
            },
          },
        },
      });
      await tx.notification.createMany({
        data: [
          {
            userId: cargo.clientId,
            title: 'Nueva postulación',
            body: `Recibiste una oferta para ${cargo.title}. Revisa tu panel.`,
            type: 'PROPOSAL_RECEIVED',
            metadata: { cargoId, proposalId: proposal.id },
          },
          {
            userId: transporterId,
            title: 'Postulación enviada',
            body: `Tu oferta para ${cargo.title} fue enviada.`,
            type: 'PROPOSAL_SENT',
            metadata: { cargoId, proposalId: proposal.id },
          },
        ],
      });
      return proposal;
    });
  }

  async negotiation(id: string, userId: string, role: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
    if (role !== 'ADMIN' && proposal.transporterId !== userId && proposal.cargo.clientId !== userId)
      throw new ForbiddenException('No puedes consultar esta negociación.');
    const [messages, offers] = await this.prisma.$transaction([
      this.prisma.proposalMessage.findMany({
        where: { proposalId: id },
        include: {
          sender: {
            select: {
              id: true,
              role: true,
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
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
      this.prisma.proposalPriceOffer.findMany({
        where: { proposalId: id },
        include: {
          sender: {
            select: {
              id: true,
              role: true,
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
          },
        },
        orderBy: { createdAt: 'asc' },
      }),
    ]);
    return {
      status: proposal.status,
      negotiable: proposal.cargo.negotiable,
      currentPriceCop: proposal.proposedPriceCop,
      messages,
      offers,
    };
  }

  async sendNegotiationMessage(id: string, userId: string, body: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
    if (proposal.transporterId !== userId && proposal.cargo.clientId !== userId)
      throw new ForbiddenException('No puedes participar en esta negociación.');
    if (proposal.status !== ProposalStatus.PENDING || proposal.cargo.status !== CargoStatus.OPEN)
      throw new BadRequestException(
        'El chat de negociación se cerró al cambiar el estado de la carga.',
      );
    const message = await this.prisma.proposalMessage.create({
      data: { proposalId: id, senderId: userId, body: body.trim() },
    });
    const recipientId =
      userId === proposal.transporterId ? proposal.cargo.clientId : proposal.transporterId;
    await this.prisma.notification.create({
      data: {
        userId: recipientId,
        title: 'Nuevo mensaje de negociación',
        body: 'Tienes un mensaje nuevo sobre una propuesta.',
        type: 'PROPOSAL_MESSAGE',
        metadata: { proposalId: id, cargoId: proposal.cargoId },
      },
    });
    return message;
  }

  async counterOffer(id: string, userId: string, priceCop: number) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
    if (proposal.transporterId !== userId && proposal.cargo.clientId !== userId)
      throw new ForbiddenException('No puedes modificar esta propuesta.');
    if (proposal.status !== ProposalStatus.PENDING || proposal.cargo.status !== CargoStatus.OPEN)
      throw new BadRequestException('La negociación ya está cerrada.');
    if (!proposal.cargo.negotiable)
      throw new BadRequestException('Esta carga no admite negociación de precio.');
    const recipientId =
      userId === proposal.transporterId ? proposal.cargo.clientId : proposal.transporterId;
    return this.prisma.$transaction(async (tx) => {
      const offer = await tx.proposalPriceOffer.create({
        data: { proposalId: id, senderId: userId, priceCop },
      });
      await tx.proposal.update({ where: { id }, data: { proposedPriceCop: priceCop } });
      await tx.notification.create({
        data: {
          userId: recipientId,
          title: 'Nueva contraoferta',
          body: 'Recibiste un nuevo precio para una carga.',
          type: 'PROPOSAL_COUNTEROFFER',
          metadata: { proposalId: id, cargoId: proposal.cargoId },
        },
      });
      return offer;
    });
  }

  async listForCargo(cargoId: string, clientId: string) {
    const proposals = await this.prisma.proposal.findMany({
      where: { cargoId, cargo: { clientId } },
      include: {
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            vehicleType: true,
            bodyType: true,
            maxWeightKg: true,
            volumeM3: true,
            operatingCity: true,
            photos: true,
            isAvailable: true,
            isActive: true,
            verificationStatus: true,
          },
        },
        transporter: {
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
          },
        },
      },
      orderBy: { proposedPriceCop: 'asc' },
    });
    // Proposal cards need vehicle specs and photos, never the driver's private GPS.
    return proposals.map((proposal) => ({
      ...proposal,
      vehicle: { ...proposal.vehicle, latitude: null, longitude: null, locationUpdatedAt: null },
    }));
  }

  mine(transporterId: string) {
    return this.prisma.proposal.findMany({
      where: { transporterId },
      include: {
        cargo: {
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
          },
        },
        vehicle: {
          select: {
            id: true,
            plate: true,
            brand: true,
            model: true,
            year: true,
            vehicleType: true,
            bodyType: true,
            maxWeightKg: true,
            volumeM3: true,
            operatingCity: true,
            photos: true,
            isAvailable: true,
            isActive: true,
            verificationStatus: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async reject(id: string, clientId: string) {
    const proposal = await this.prisma.proposal.findUnique({
      where: { id },
      include: { cargo: true },
    });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
    if (proposal.cargo.clientId !== clientId)
      throw new ForbiddenException('No puedes rechazar esta propuesta.');
    if (proposal.status !== ProposalStatus.PENDING)
      throw new BadRequestException('Solo se pueden rechazar propuestas pendientes.');
    return this.prisma.$transaction(async (tx) => {
      const result = await tx.proposal.update({
        where: { id },
        data: { status: ProposalStatus.REJECTED },
      });
      await tx.notification.create({
        data: {
          userId: proposal.transporterId,
          title: 'Postulación rechazada',
          body: `Tu oferta para ${proposal.cargo.title} fue rechazada.`,
          type: 'PROPOSAL_REJECTED',
          metadata: { cargoId: proposal.cargoId, proposalId: proposal.id },
        },
      });
      return result;
    });
  }

  async withdraw(id: string, transporterId: string) {
    const proposal = await this.prisma.proposal.findUnique({ where: { id } });
    if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
    if (proposal.transporterId !== transporterId)
      throw new ForbiddenException('No puedes retirar esta propuesta.');
    if (proposal.status !== ProposalStatus.PENDING)
      throw new BadRequestException('Solo se pueden retirar propuestas pendientes.');
    return this.prisma.proposal.update({
      where: { id },
      data: { status: ProposalStatus.WITHDRAWN },
    });
  }

  async accept(id: string, acceptingUserId: string) {
    return this.prisma.$transaction(async (tx) => {
      const proposal = await tx.proposal.findUnique({
        where: { id },
        include: { cargo: true, vehicle: true },
      });
      if (!proposal) throw new NotFoundException('Propuesta no encontrada.');
      if (proposal.cargo.clientId !== acceptingUserId && proposal.transporterId !== acceptingUserId)
        throw new ForbiddenException('No puedes aceptar esta propuesta.');
      if (
        proposal.status !== ProposalStatus.PENDING ||
        proposal.cargo.status !== CargoStatus.OPEN
      ) {
        throw new BadRequestException('La propuesta o la carga ya no estan disponibles.');
      }
      if (acceptingUserId === proposal.transporterId) {
        const latestOffer = await tx.proposalPriceOffer.findFirst({
          where: { proposalId: id },
          orderBy: { createdAt: 'desc' },
        });
        if (!latestOffer || latestOffer.senderId !== proposal.cargo.clientId)
          throw new BadRequestException(
            'Espera a que la empresa envíe un precio para poder aceptarlo.',
          );
      }

      if (!proposal.vehicle.isActive || !proposal.vehicle.isAvailable)
        throw new BadRequestException('El vehículo ya no está disponible.');
      const claimed = await tx.cargo.updateMany({
        where: { id: proposal.cargoId, status: CargoStatus.OPEN },
        data: { status: CargoStatus.ASSIGNED },
      });
      if (!claimed.count) throw new BadRequestException('La carga ya fue asignada.');
      const reserved = await tx.vehicle.updateMany({
        where: { id: proposal.vehicleId, isActive: true, isAvailable: true },
        data: { isAvailable: false },
      });
      if (!reserved.count)
        throw new BadRequestException('El vehículo ya fue asignado a otro viaje.');
      const others = await tx.proposal.findMany({
        where: { cargoId: proposal.cargoId, id: { not: id }, status: ProposalStatus.PENDING },
      });
      if (others.length)
        await tx.notification.createMany({
          data: others.map((p) => ({
            userId: p.transporterId,
            title: 'Carga asignada',
            body: 'El cliente eligió otra oferta para esta carga.',
            type: 'PROPOSAL_REJECTED',
            metadata: { cargoId: proposal.cargoId, proposalId: p.id },
          })),
        });
      await tx.proposal.update({ where: { id }, data: { status: ProposalStatus.ACCEPTED } });
      await tx.proposal.updateMany({
        where: { cargoId: proposal.cargoId, id: { not: id }, status: ProposalStatus.PENDING },
        data: { status: ProposalStatus.REJECTED },
      });

      const estimatedDeliveryDate = new Date(
        proposal.availablePickupDate.getTime() + proposal.estimatedTransportHours * 60 * 60 * 1000,
      );
      const trip = await tx.trip.create({
        data: {
          cargoId: proposal.cargoId,
          proposalId: proposal.id,
          clientId: proposal.cargo.clientId,
          transporterId: proposal.transporterId,
          vehicleId: proposal.vehicleId,
          agreedPriceCop: proposal.proposedPriceCop,
          pickupDate: proposal.availablePickupDate,
          estimatedDeliveryDate,
          originLabel: `${proposal.cargo.originCity}, ${proposal.cargo.originDepartment}`,
          destinationLabel: `${proposal.cargo.destinationCity}, ${proposal.cargo.destinationDepartment}`,
          status: TripStatus.PENDING_PICKUP,
          history: {
            create: {
              status: TripStatus.PENDING_PICKUP,
              changedById: acceptingUserId,
              note: 'Propuesta aceptada.',
            },
          },
        },
      });

      await tx.notification.createMany({
        data: [
          {
            userId: proposal.transporterId,
            title: 'Propuesta aceptada',
            body: 'Tu propuesta fue aceptada. Consulta el viaje y sus datos de seguimiento.',
            type: 'PROPOSAL_ACCEPTED',
            metadata: { cargoId: proposal.cargoId, proposalId: proposal.id, tripId: trip.id },
          },
          {
            userId: proposal.cargo.clientId,
            title: 'Viaje creado',
            body: 'Se creó el viaje para la carga asignada. Consulta sus etapas y ubicación cuando esté disponible.',
            type: 'TRIP_CREATED',
            metadata: { cargoId: proposal.cargoId, proposalId: proposal.id, tripId: trip.id },
          },
        ],
      });
      return trip;
    });
  }
}
