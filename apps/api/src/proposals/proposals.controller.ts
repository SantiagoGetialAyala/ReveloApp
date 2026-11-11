import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateProposalDto, ProposalCounterOfferDto, ProposalMessageDto } from './dto';
import { ProposalsService } from './proposals.service';

@ApiTags('proposals')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller()
export class ProposalsController {
  constructor(private readonly proposals: ProposalsService) {}

  @Roles('TRANSPORTER')
  @Post('cargos/:id/proposals')
  create(
    @Param('id') cargoId: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: CreateProposalDto,
  ) {
    return this.proposals.create(cargoId, user.sub, dto);
  }

  @Roles('CLIENT')
  @Get('cargos/:id/proposals')
  listForCargo(@Param('id') cargoId: string, @CurrentUser() user: { sub: string }) {
    return this.proposals.listForCargo(cargoId, user.sub);
  }

  @Roles('TRANSPORTER')
  @Get('proposals/me')
  mine(@CurrentUser() user: { sub: string }) {
    return this.proposals.mine(user.sub);
  }

  @Get('proposals/:id/negotiation')
  negotiation(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.proposals.negotiation(id, user.sub, user.role);
  }

  @Roles('CLIENT', 'TRANSPORTER')
  @Post('proposals/:id/messages')
  message(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ProposalMessageDto,
  ) {
    return this.proposals.sendNegotiationMessage(id, user.sub, dto.body);
  }

  @Roles('CLIENT', 'TRANSPORTER')
  @Post('proposals/:id/counteroffers')
  counterOffer(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ProposalCounterOfferDto,
  ) {
    return this.proposals.counterOffer(id, user.sub, dto.priceCop);
  }

  @Roles('CLIENT', 'TRANSPORTER')
  @Patch('proposals/:id/accept')
  accept(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.proposals.accept(id, user.sub);
  }

  @Roles('CLIENT')
  @Patch('proposals/:id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.proposals.reject(id, user.sub);
  }

  @Roles('TRANSPORTER')
  @Patch('proposals/:id/withdraw')
  withdraw(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.proposals.withdraw(id, user.sub);
  }
}
