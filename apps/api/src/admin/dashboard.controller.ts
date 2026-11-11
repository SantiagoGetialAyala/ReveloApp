import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('dashboard')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Roles('CLIENT')
  @Get('client')
  async client(@CurrentUser() user: { sub: string }) {
    const [totalCargos, openCargos, pendingProposals, activeTrips, completedTrips] = await this.prisma.$transaction([
      this.prisma.cargo.count({ where: { clientId: user.sub } }),
      this.prisma.cargo.count({ where: { clientId: user.sub, status: 'OPEN' } }),
      this.prisma.proposal.count({ where: { cargo: { clientId: user.sub }, status: 'PENDING' } }),
      this.prisma.trip.count({ where: { clientId: user.sub, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.trip.count({ where: { clientId: user.sub, status: 'COMPLETED' } }),
    ]);
    return { totalCargos, openCargos, pendingProposals, activeTrips, completedTrips };
  }

  @Roles('TRANSPORTER')
  @Get('transporter')
  async transporter(@CurrentUser() user: { sub: string }) {
    const [availableCargos, sentProposals, acceptedProposals, activeTrips, completedTrips] = await this.prisma.$transaction([
      this.prisma.cargo.count({ where: { status: 'OPEN' } }),
      this.prisma.proposal.count({ where: { transporterId: user.sub } }),
      this.prisma.proposal.count({ where: { transporterId: user.sub, status: 'ACCEPTED' } }),
      this.prisma.trip.count({ where: { transporterId: user.sub, status: { notIn: ['COMPLETED', 'CANCELLED'] } } }),
      this.prisma.trip.count({ where: { transporterId: user.sub, status: 'COMPLETED' } }),
    ]);
    return { availableCargos, sentProposals, acceptedProposals, activeTrips, completedTrips };
  }
}
