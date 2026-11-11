import { BodyType, VehicleType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsBoolean,
  IsDate,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  MaxLength,
} from 'class-validator';

const CARGO_CATEGORIES = [
  'Ferretería',
  'Cemento',
  'Materiales de construcción',
  'Arena y grava',
  'Acero y metales',
  'Madera',
  'Alimentos',
  'Productos agrícolas',
  'Muebles y electrodomésticos',
  'Maquinaria',
  'Textiles',
  'Paquetería',
  'Otros',
] as const;

export class CreateCargoDto {
  @IsOptional() @IsNumber() @Min(0.01) quantity?: number;
  @IsOptional() @IsIn(['KG', 'LB', 'TON', 'BOX', 'SACK', 'PALLET', 'UNIT']) quantityUnit?: string;

  @IsString() title!: string;
  @IsString() description!: string;
  @IsIn(CARGO_CATEGORIES)
  category!: string;
  @IsNumber() @Min(1) weightKg!: number;
  @IsOptional() @IsNumber() volumeM3?: number;
  @IsOptional() @IsString() dimensions?: string;
  @IsInt() @Min(1) units!: number;
  @IsOptional() @IsString() specialInstructions?: string;
  @IsString() originDepartment!: string;
  @IsString() originCity!: string;
  @IsString() pickupAddress!: string;
  @IsNumber() pickupLat!: number;
  @IsNumber() pickupLng!: number;
  @IsString() destinationDepartment!: string;
  @IsString() destinationCity!: string;
  @IsString() deliveryAddress!: string;
  @IsNumber() deliveryLat!: number;
  @IsNumber() deliveryLng!: number;
  @Type(() => Date) @IsDate() pickupWindowStart!: Date;
  @Type(() => Date) @IsDate() deliveryDeadline!: Date;
  @IsEnum(VehicleType) requiredVehicleType!: VehicleType;
  @IsOptional() @IsEnum(BodyType) requiredBodyType?: BodyType;
  @IsNumber() @Min(1) requiredCapacityKg!: number;
  @IsNumber() @Min(0) estimatedBudgetCop!: number;
  @IsBoolean() negotiable!: boolean;
  @IsOptional() @IsString() observations?: string;
}

export class UpdateCargoDto {
  @IsOptional() @IsString() title?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsIn(CARGO_CATEGORIES) category?: (typeof CARGO_CATEGORIES)[number];
  @IsOptional() @IsNumber() @Min(0) estimatedBudgetCop?: number;
  @IsOptional() @IsBoolean() negotiable?: boolean;
  @IsOptional() @IsEnum(VehicleType) requiredVehicleType?: VehicleType;
  @IsOptional() @IsEnum(BodyType) requiredBodyType?: BodyType;
}

export class CargoFiltersDto {
  @IsOptional() @IsString() @MaxLength(90) originDepartment?: string;
  @IsOptional() @IsString() @MaxLength(90) originCity?: string;
  @IsOptional() @IsString() @MaxLength(90) destinationDepartment?: string;
  @IsOptional() @IsString() @MaxLength(90) destinationCity?: string;
  @IsOptional() @IsIn(CARGO_CATEGORIES) category?: (typeof CARGO_CATEGORIES)[number];
  @IsOptional() @IsEnum(VehicleType) vehicleType?: VehicleType;
  @IsOptional() @IsEnum(BodyType) bodyType?: BodyType;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) maxBudgetCop?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) minWeightKg?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(1) maxWeightKg?: number;
  @IsOptional() @Type(() => Date) @IsDate() pickupAfter?: Date;
  @IsOptional() @Type(() => Date) @IsDate() pickupBefore?: Date;
  @IsOptional() @IsIn(['pickupDate', 'recent', 'budgetDesc', 'budgetAsc']) sort?:
    'pickupDate' | 'recent' | 'budgetDesc' | 'budgetAsc';
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) page?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(50) limit?: number;
}
