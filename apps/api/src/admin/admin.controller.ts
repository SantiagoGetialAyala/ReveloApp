import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AdminService } from './admin.service';
import { ModerationReasonDto, ReviewUserDto, ReviewVehicleDto } from './dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles('ADMIN')
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('dashboard')
  dashboard() {
    return this.admin.dashboard();
  }

  @Get('users')
  users() {
    return this.admin.users();
  }

  @Get('verifications')
  verifications() {
    return this.admin.verifications();
  }

  @Patch('users/:id/verification')
  reviewUser(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ReviewUserDto,
  ) {
    return this.admin.reviewUser(id, user.sub, dto.status, dto.note);
  }

  @Patch('vehicles/:id/verification')
  reviewVehicle(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ReviewVehicleDto,
  ) {
    return this.admin.reviewVehicle(id, user.sub, dto.approved, dto.note);
  }

  @Get('vehicle-change-requests')
  vehicleChangeRequests() {
    return this.admin.vehicleChangeRequests();
  }

  @Patch('vehicle-change-requests/:id')
  reviewVehicleChangeRequest(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ReviewVehicleDto,
  ) {
    return this.admin.reviewVehicleChangeRequest(id, user.sub, dto.approved, dto.note);
  }

  @Get('cargos')
  cargos() {
    return this.admin.cargoQueue();
  }

  @Get('trips')
  trips() {
    return this.admin.tripQueue();
  }

  @Patch('cargos/:id/cancel')
  cancelCargo(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ModerationReasonDto,
  ) {
    return this.admin.cancelCargo(id, user.sub, dto.reason);
  }

  @Patch('trips/:id/cancel')
  cancelTrip(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string },
    @Body() dto: ModerationReasonDto,
  ) {
    return this.admin.cancelTrip(id, user.sub, dto.reason);
  }
}
