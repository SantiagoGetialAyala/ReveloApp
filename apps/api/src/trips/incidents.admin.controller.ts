import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UpdateTripIncidentDto } from './dto';
import { TripsService } from './trips.service';

@ApiTags('admin-incidents')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin/incidents')
export class AdminIncidentsController {
  constructor(private readonly trips: TripsService) {}

  @Get()
  list() {
    return this.trips.adminIncidents();
  }

  @Patch(':id/status')
  update(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: UpdateTripIncidentDto,
  ) {
    return this.trips.updateIncident(id, user.sub, dto.status, dto.note);
  }
}
