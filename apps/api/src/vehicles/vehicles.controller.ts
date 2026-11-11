import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateVehicleChangeRequestDto, CreateVehicleDto, UpdateVehicleDto } from './dto';
import { VehiclesService } from './vehicles.service';

@ApiTags('vehicles')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Controller('vehicles')
export class VehiclesController {
  constructor(private readonly vehicles: VehiclesService) {}

  @Roles('TRANSPORTER')
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateVehicleDto) {
    return this.vehicles.create(user.sub, dto);
  }

  @Roles('TRANSPORTER')
  @Get('me')
  mine(@CurrentUser() user: { sub: string }) {
    return this.vehicles.findMine(user.sub);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.vehicles.findOne(id, user.sub, user.role);
  }

  @Roles('TRANSPORTER')
  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehicles.update(user.sub, id, dto);
  }

  @Roles('TRANSPORTER')
  @Post(':id/change-requests')
  requestChange(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: CreateVehicleChangeRequestDto,
  ) {
    return this.vehicles.requestChange(user.sub, id, dto.changes);
  }

  @Roles('TRANSPORTER')
  @Delete(':id')
  delete(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.vehicles.deactivate(user.sub, id);
  }
}
