import { Type } from 'class-transformer';
import { IsDate, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateProposalDto {
  @IsString()
  vehicleId!: string;

  @IsNumber()
  @Min(0)
  proposedPriceCop!: number;

  @Type(() => Date)
  @IsDate()
  availablePickupDate!: Date;

  @IsNumber()
  @Min(1)
  estimatedTransportHours!: number;

  @IsOptional()
  @IsString()
  message?: string;
}

export class ProposalMessageDto {
  @IsString() @MinLength(1) @MaxLength(2000) body!: string;
}

export class ProposalCounterOfferDto {
  @IsNumber() @Min(1) priceCop!: number;
}
