import { IncidentStatus, TripStatus } from '@prisma/client';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class UpdateTripStatusDto {
  @IsEnum(TripStatus)
  status!: TripStatus;

  @IsOptional()
  @IsString()
  note?: string;
}

export class CreateTripMessageDto {
  @IsString() @Length(1, 2000) body!: string;
}

export class CreateTripIncidentDto {
  @IsIn([
    'PICKUP_DELAY',
    'DELIVERY_DELAY',
    'VEHICLE_BREAKDOWN',
    'CARGO_DAMAGE',
    'MISSING_CARGO',
    'LOCATION_ISSUE',
    'NON_COMPLIANCE',
    'COMMUNICATION',
    'OTHER',
  ])
  type!: string;

  @IsString() @Length(5, 2000) description!: string;
}

export class UpdateTripIncidentDto {
  @IsEnum(IncidentStatus)
  status!: IncidentStatus;

  @IsOptional() @IsString() @Length(1, 1000) note?: string;
}

export class CreateTripReviewDto {
  @IsInt() @Min(1) @Max(5) score!: number;
  @IsOptional() @IsString() @Length(1, 1000) comment?: string;
}
