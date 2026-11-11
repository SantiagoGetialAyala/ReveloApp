import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BodyType, VehicleType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto, UpdateVehicleDto } from './dto';

const safeVehicleSelect = {
  id: true,
  ownerId: true,
  plate: true,
  brand: true,
  model: true,
  year: true,
  vehicleType: true,
  bodyType: true,
  maxWeightKg: true,
  volumeM3: true,
  latitude: true,
  longitude: true,
  locationUpdatedAt: true,
  operatingCity: true,
  description: true,
  photos: true,
  isAvailable: true,
  isActive: true,
  verificationStatus: true,
  ownershipDocumentName: true,
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(ownerId: string, dto: CreateVehicleDto) {
    if (!dto.ownershipDocumentData || !dto.ownershipDocumentName)
      throw new ConflictException('Adjunta la tarjeta de propiedad del vehículo.');
    if (!dto.photos?.length) throw new ConflictException('Adjunta al menos una foto del vehículo.');
    if (Buffer.from(dto.ownershipDocumentData.split(',')[1] ?? '', 'base64').length > 2_000_000)
      throw new ConflictException('La tarjeta de propiedad debe pesar máximo 2 MB.');
    if (await this.prisma.vehicle.findUnique({ where: { plate: dto.plate.toUpperCase() } }))
      throw new ConflictException('Esta placa ya está registrada.');
    return this.prisma.vehicle.create({
      data: {
        ...dto,
        isActive: false,
        isAvailable: false,
        verificationStatus: 'PENDING',
        locationUpdatedAt: dto.latitude != null ? new Date() : undefined,
        plate: dto.plate.toUpperCase(),
        ownerId,
      },
      select: safeVehicleSelect,
    });
  }

  findMine(ownerId: string) {
    return this.prisma.vehicle.findMany({
      where: { ownerId },
      select: safeVehicleSelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string, role: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: safeVehicleSelect,
    });
    if (!vehicle) throw new NotFoundException('Vehiculo no encontrado.');
    if (role !== 'ADMIN' && vehicle.ownerId !== userId)
      throw new ForbiddenException('No puedes consultar la ubicación de este vehículo.');
    return vehicle;
  }

  async update(ownerId: string, id: string, dto: UpdateVehicleDto) {
    await this.ensureOwner(ownerId, id);
    if (dto.operatingCity && (dto.latitude == null || dto.longitude == null))
      throw new ConflictException(
        'La ubicación del vehículo solo se actualiza mediante la señal GPS. Solicita aprobación para editar otros datos.',
      );
    return this.prisma.vehicle.update({
      where: { id },
      data: { ...dto, locationUpdatedAt: dto.latitude != null ? new Date() : undefined },
      select: safeVehicleSelect,
    });
  }

  async requestChange(ownerId: string, id: string, rawChanges: Record<string, unknown>) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle || vehicle.ownerId !== ownerId)
      throw new NotFoundException('No encontramos ese vehículo en tu cuenta.');
    if (vehicle.verificationStatus !== 'APPROVED')
      throw new ConflictException('Solo puedes solicitar cambios para vehículos ya aprobados.');
    const pending = await this.prisma.vehicleChangeRequest.findFirst({
      where: { vehicleId: id, status: 'PENDING' },
    });
    if (pending) throw new ConflictException('Ya tienes una solicitud de cambio pendiente.');
    const allowed = [
      'plate',
      'brand',
      'model',
      'year',
      'vehicleType',
      'bodyType',
      'maxWeightKg',
      'volumeM3',
      'operatingCity',
      'description',
      'photos',
      'ownershipDocumentData',
      'ownershipDocumentName',
    ];
    const changes = Object.fromEntries(
      Object.entries(rawChanges).filter(([key]) => allowed.includes(key)),
    );
    if (!Object.keys(changes).length)
      throw new ConflictException('Indica al menos un dato que quieras actualizar.');
    for (const key of ['plate', 'brand', 'model', 'operatingCity']) {
      if (key in changes && (typeof changes[key] !== 'string' || !changes[key].trim()))
        throw new ConflictException(`El campo ${key} debe contener texto válido.`);
    }
    if (
      'year' in changes &&
      (!Number.isInteger(changes.year) ||
        Number(changes.year) < 1950 ||
        Number(changes.year) > new Date().getFullYear() + 1)
    )
      throw new ConflictException('El año del vehículo no es válido.');
    if (
      'vehicleType' in changes &&
      !Object.values(VehicleType).includes(changes.vehicleType as VehicleType)
    )
      throw new ConflictException('El tipo de vehículo seleccionado no es válido.');
    if ('bodyType' in changes && !Object.values(BodyType).includes(changes.bodyType as BodyType))
      throw new ConflictException('La carrocería seleccionada no es válida.');
    if (
      'maxWeightKg' in changes &&
      (!Number.isFinite(Number(changes.maxWeightKg)) || Number(changes.maxWeightKg) <= 0)
    )
      throw new ConflictException('La capacidad debe ser mayor que cero.');
    if (
      'photos' in changes &&
      (!Array.isArray(changes.photos) ||
        changes.photos.length !== 1 ||
        typeof changes.photos[0] !== 'string' ||
        changes.photos[0].length > 750000 ||
        !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(changes.photos[0]))
    )
      throw new ConflictException('La foto debe ser JPG, PNG o WebP y pesar máximo 500 KB.');
    if (
      'ownershipDocumentData' in changes &&
      (typeof changes.ownershipDocumentData !== 'string' ||
        !/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/.test(
          changes.ownershipDocumentData,
        ))
    )
      throw new ConflictException('Adjunta una tarjeta PDF o una imagen válida.');
    if (
      typeof changes.ownershipDocumentData === 'string' &&
      Buffer.from(changes.ownershipDocumentData.split(',')[1] ?? '', 'base64').length > 2_000_000
    )
      throw new ConflictException('La tarjeta de propiedad debe pesar máximo 2 MB.');
    return this.prisma.vehicleChangeRequest.create({
      data: { vehicleId: id, requesterId: ownerId, changes: changes as never },
    });
  }

  async deactivate(ownerId: string, id: string) {
    await this.ensureOwner(ownerId, id);
    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive: false, isAvailable: false },
      select: safeVehicleSelect,
    });
  }

  private async ensureOwner(ownerId: string, id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      select: { ownerId: true },
    });
    if (!vehicle) throw new NotFoundException('Vehiculo no encontrado.');
    if (vehicle.ownerId !== ownerId)
      throw new ForbiddenException('No puedes modificar este vehiculo.');
  }
}
