import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsOptional() @IsString() firstName?: string;
  @IsOptional() @IsString() lastName?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() city?: string;
  @IsOptional() @IsString() department?: string;
  @IsOptional() @IsString() businessName?: string;
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsString() baseCity?: string;
  @IsOptional() @IsString() baseDepartment?: string;
  @IsOptional()
  @IsString()
  @MaxLength(1_000_000)
  @Matches(/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/)
  photoData?: string;
  @IsOptional() @IsString() contactPhone?: string;
}
