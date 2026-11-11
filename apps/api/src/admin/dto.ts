import { IsBoolean, IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

export class ReviewUserDto {
  @IsIn(['ACTIVE', 'SUSPENDED']) status!: 'ACTIVE' | 'SUSPENDED';
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}

export class ModerationReasonDto {
  @IsString() @MaxLength(1000) reason!: string;
}

export class ReviewVehicleDto {
  @IsBoolean() approved!: boolean;
  @IsOptional() @IsString() @MaxLength(1000) note?: string;
}
