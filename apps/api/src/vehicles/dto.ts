import { BodyType, VehicleType } from '@prisma/client';
import {
  ArrayMaxSize,
  IsArray,
  IsLatitude,
  IsLongitude,
  Matches,
  Max,
  MaxLength,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsObject,
  IsString,
  Min,
} from 'class-validator';

export class CreateVehicleDto {
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(1)
  @IsString({ each: true })
  @MaxLength(750000, { each: true })
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/, {
    each: true,
    message: 'La foto debe ser JPG, PNG o WebP.',
  })
  photos?: string[];
  @IsOptional() @IsString() @MaxLength(160) ownershipDocumentName?: string;
  @IsOptional()
  @IsString()
  @MaxLength(2800000)
  @Matches(/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/)
  ownershipDocumentData?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;

  @IsString()
  plate!: string;

  @IsString()
  brand!: string;

  @IsString()
  model!: string;

  @IsInt()
  @Min(1950)
  @Max(new Date().getFullYear() + 1)
  year!: number;

  @IsEnum(VehicleType)
  vehicleType!: VehicleType;

  @IsEnum(BodyType)
  bodyType!: BodyType;

  @IsNumber()
  @Min(1)
  maxWeightKg!: number;

  @IsOptional()
  @IsNumber()
  volumeM3?: number;

  @IsString()
  operatingCity!: string;

  @IsOptional()
  @IsString()
  description?: string;
}

export class UpdateVehicleDto {
  @IsOptional() @IsString() operatingCity?: string;
  @IsOptional() @IsLatitude() latitude?: number;
  @IsOptional() @IsLongitude() longitude?: number;
}

export class CreateVehicleChangeRequestDto {
  @IsObject()
  changes!: Record<string, unknown>;
}
