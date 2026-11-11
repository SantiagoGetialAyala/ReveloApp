import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { CreateVehicleDto } from '../vehicles/dto';
import {
  IsIn,
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  ValidateNested,
  IsEmail,
  IsEnum,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';

export class RegisterVerificationDocumentDto {
  @IsIn(['ID_CARD', 'CRIMINAL_RECORD'])
  type!: string;

  @IsString()
  @MinLength(1)
  fileName!: string;

  @IsIn(['application/pdf', 'image/jpeg', 'image/png', 'image/webp'])
  mimeType!: string;

  @IsString()
  @MinLength(32)
  @MaxLength(2800000)
  @Matches(/^data:(application\/pdf|image\/(jpeg|png|webp));base64,[A-Za-z0-9+/=]+$/)
  dataUrl!: string;
}

export enum RegisterRole {
  CLIENT = 'CLIENT',
  TRANSPORTER = 'TRANSPORTER',
}

export class RegisterDto {
  @IsOptional() @IsIn(['PERSON', 'BUSINESS']) accountType?: string;
  @IsOptional() @ValidateNested() @Type(() => CreateVehicleDto) vehicle?: CreateVehicleDto;
  @IsOptional() @IsString() taxId?: string;
  @IsOptional()
  @IsArray()
  @ArrayMinSize(2)
  @ArrayMaxSize(2)
  @ValidateNested({ each: true })
  @Type(() => RegisterVerificationDocumentDto)
  documents?: RegisterVerificationDocumentDto[];

  @ApiProperty({ example: 'cliente.demo@revelo.co' })
  @IsEmail()
  email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  password!: string;

  @ApiProperty({ enum: RegisterRole })
  @IsEnum(RegisterRole)
  role!: RegisterRole;

  @ApiProperty({ example: 'Cafes del Sur SAS' })
  @IsString()
  displayName!: string;

  @IsOptional()
  @IsString()
  @Transform(({ value }) => {
    if (typeof value !== 'string') return value;
    const phone = value.trim().replace(/[\s()-]/g, '');
    if (!phone) return undefined;
    return /^3\d{9}$/.test(phone) ? `+57${phone}` : phone;
  })
  @Matches(/^\+[1-9]\d{7,14}$/, {
    message:
      'El teléfono debe tener 10 dígitos colombianos (por ejemplo, 3001234567) o prefijo internacional (+57 300 123 4567). También puedes dejarlo vacío.',
  })
  phone?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class ForgotPasswordDto {
  @IsEmail()
  email!: string;
}

export class ResetPasswordDto {
  @IsString()
  token!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}
