import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CargoStatus, Prisma } from '@prisma/client';
import { MapsService } from '../maps/maps.service';
import { PrismaService } from '../prisma/prisma.service';
import colombia from '../catalog/colombia.json';
import { CargoFiltersDto, CreateCargoDto, UpdateCargoDto } from './dto';

@Injectable()
export class CargosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly maps: MapsService,
  ) {}

  async create(clientId: string, dto: CreateCargoDto) {
    const places = colombia as Record<string, { name: string }[]>;
    for (const [department, city] of [
      [dto.originDepartment, dto.originCity],
      [dto.destinationDepartment, dto.destinationCity],
    ]) {
      if (!places[department]?.some((place) => place.name === city))
        throw new BadRequestException('Selecciona un municipio válido para el departamento.');
    }
    const factors: Record<string, number> = { KG: 1, LB: 0.45359237, TON: 1000 };
    if ((dto.quantity == null) !== (dto.quantityUnit == null))
      throw new BadRequestException('Indica cantidad y unidad juntas.');
    if (dto.quantity != null && dto.quantityUnit) {
      const factor = factors[dto.quantityUnit];
      if (factor && Math.abs(Math.round(dto.quantity * factor * 100) / 100 - dto.weightKg) > 0.01)
        throw new BadRequestException('El peso no corresponde a la cantidad y unidad.');
      if (!factor && (!Number.isInteger(dto.quantity) || dto.units !== dto.quantity))
        throw new BadRequestException(
          'La cantidad de cajas, bultos, estibas o unidades debe ser entera.',
        );
    }
    if (dto.deliveryDeadline <= dto.pickupWindowStart)
      throw new BadRequestException('La entrega debe ser posterior a la recogida.');
    if (dto.requiredCapacityKg < dto.weightKg)
      throw new BadRequestException('La capacidad requerida debe cubrir el peso de la carga.');
    // Treat an exact repeat of the same publish request as a retry, not a new cargo.
    // This protects against a double tap or a browser retry after a slow response.
    const recentDuplicate = await this.prisma.cargo.findFirst({
      where: {
        clientId,
        status: CargoStatus.OPEN,
        createdAt: { gte: new Date(Date.now() - 120_000) },
        title: dto.title,
        category: dto.category,
        originDepartment: dto.originDepartment,
        originCity: dto.originCity,
        destinationDepartment: dto.destinationDepartment,
        destinationCity: dto.destinationCity,
        pickupAddress: dto.pickupAddress,
        deliveryAddress: dto.deliveryAddress,
        pickupWindowStart: dto.pickupWindowStart,
        deliveryDeadline: dto.deliveryDeadline,
        estimatedBudgetCop: dto.estimatedBudgetCop,
        weightKg: dto.weightKg,
        quantity: dto.quantity,
        quantityUnit: dto.quantityUnit,
      },
      orderBy: { createdAt: 'desc' },
    });
    if (recentDuplicate) return recentDuplicate;
    const route = await this.maps.route(
      { lat: dto.pickupLat, lng: dto.pickupLng },
      { lat: dto.deliveryLat, lng: dto.deliveryLng },
    );
    return this.prisma.cargo.create({
      data: {
        ...dto,
        clientId,
        routeDistanceKm: route.distanceKm,
        routeDurationMinutes: route.durationMinutes,
        routeProvider: route.provider,
      },
    });
  }

  async findAll(filters: CargoFiltersDto, compatibility?: Prisma.CargoWhereInput) {
    const page = Math.max(filters.page ?? 1, 1);
    const limit = Math.min(Math.max(filters.limit ?? 12, 1), 50);
    const where: Prisma.CargoWhereInput = {
      status: CargoStatus.OPEN,
      originDepartment: filters.originDepartment,
      originCity: filters.originCity,
      destinationDepartment: filters.destinationDepartment,
      destinationCity: filters.destinationCity,
      category: filters.category,
      requiredVehicleType: filters.vehicleType,
      requiredBodyType: filters.bodyType,
      estimatedBudgetCop: filters.maxBudgetCop == null ? undefined : { lte: filters.maxBudgetCop },
      weightKg:
        filters.minWeightKg != null || filters.maxWeightKg != null
          ? {
              ...(filters.minWeightKg == null ? {} : { gte: filters.minWeightKg }),
              ...(filters.maxWeightKg == null ? {} : { lte: filters.maxWeightKg }),
            }
          : undefined,
      pickupWindowStart:
        filters.pickupAfter != null || filters.pickupBefore != null
          ? {
              ...(filters.pickupAfter == null ? {} : { gte: filters.pickupAfter }),
              ...(filters.pickupBefore == null ? {} : { lte: filters.pickupBefore }),
            }
          : undefined,
      ...(compatibility ? { AND: [compatibility] } : {}),
    };
    if (
      filters.maxWeightKg != null &&
      filters.minWeightKg != null &&
      filters.maxWeightKg < filters.minWeightKg
    )
      throw new BadRequestException('El peso máximo debe ser igual o mayor que el peso mínimo.');
    if (filters.pickupAfter && filters.pickupBefore && filters.pickupBefore < filters.pickupAfter)
      throw new BadRequestException('La última fecha debe ser igual o posterior a la primera.');

    const orderBy: Prisma.CargoOrderByWithRelationInput =
      filters.sort === 'budgetDesc'
        ? { estimatedBudgetCop: 'desc' }
        : filters.sort === 'budgetAsc'
          ? { estimatedBudgetCop: 'asc' }
          : filters.sort === 'pickupDate'
            ? { pickupWindowStart: 'asc' }
            : { createdAt: 'desc' };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.cargo.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        include: {
          images: true,
          client: {
            select: {
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
        },
      }),
      this.prisma.cargo.count({ where }),
    ]);
    return { items, total, page, limit };
  }

  async findCompatible(transporterId: string, filters: CargoFiltersDto) {
    const vehicles = await this.prisma.vehicle.findMany({
      where: { ownerId: transporterId, isActive: true, isAvailable: true },
      select: { vehicleType: true, bodyType: true, maxWeightKg: true },
    });
    if (!vehicles.length) {
      return {
        items: [],
        total: 0,
        page: Math.max(filters.page ?? 1, 1),
        limit: Math.min(Math.max(filters.limit ?? 12, 1), 50),
        reason: 'NO_AVAILABLE_VEHICLES',
      };
    }
    const compatibility: Prisma.CargoWhereInput = {
      AND: [
        {
          OR: vehicles.map((vehicle) => ({
            requiredVehicleType: vehicle.vehicleType,
            requiredCapacityKg: { lte: vehicle.maxWeightKg },
            weightKg: { lte: vehicle.maxWeightKg },
            OR: [{ requiredBodyType: null }, { requiredBodyType: vehicle.bodyType }],
          })),
        },
        { proposals: { none: { transporterId, status: 'PENDING' } } },
      ],
    };
    return this.findAll(filters, compatibility);
  }

  findMine(clientId: string) {
    return this.prisma.cargo.findMany({ where: { clientId }, orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      include: { images: true },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    return cargo;
  }

  async update(clientId: string, id: string, dto: UpdateCargoDto) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      select: { clientId: true, status: true, trip: { select: { id: true } } },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    if (cargo.clientId !== clientId)
      throw new ForbiddenException('No puedes editar una carga de otra cuenta.');
    if (cargo.status !== CargoStatus.OPEN || cargo.trip)
      throw new BadRequestException('Solo puedes editar cargas abiertas sin viaje asignado.');
    if (!Object.keys(dto).length)
      throw new BadRequestException('Indica al menos un dato que quieras actualizar.');
    return this.prisma.cargo.update({ where: { id }, data: dto });
  }

  async cancel(clientId: string, id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      select: { clientId: true, status: true },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    if (cargo.clientId !== clientId) throw new ForbiddenException('No puedes cancelar esta carga.');
    if (cargo.status !== CargoStatus.OPEN)
      throw new ForbiddenException(
        'Esta carga ya tiene un viaje o fue cerrada. Cancela el viaje desde su seguimiento.',
      );
    return this.prisma.cargo.update({ where: { id }, data: { status: CargoStatus.CANCELLED } });
  }

  async remove(clientId: string, id: string) {
    const cargo = await this.prisma.cargo.findUnique({
      where: { id },
      select: {
        clientId: true,
        status: true,
        trip: { select: { id: true } },
        _count: { select: { proposals: true } },
      },
    });
    if (!cargo) throw new NotFoundException('Carga no encontrada.');
    if (cargo.clientId !== clientId)
      throw new ForbiddenException('No puedes eliminar una carga de otra cuenta.');
    if (cargo.status !== CargoStatus.OPEN || cargo.trip)
      throw new BadRequestException(
        'Esta carga ya tiene un viaje asignado. Cancela el viaje desde su seguimiento.',
      );
    if (cargo._count.proposals > 0) {
      // Keep the negotiation history and close the listing instead of orphaning offers.
      return this.prisma.cargo.update({
        where: { id },
        data: { status: CargoStatus.CANCELLED },
      });
    }
    await this.prisma.cargo.delete({ where: { id } });
    return { id, deleted: true };
  }
}
