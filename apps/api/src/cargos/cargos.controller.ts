import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CargosService } from './cargos.service';
import { CargoFiltersDto, CreateCargoDto, UpdateCargoDto } from './dto';

@ApiTags('cargos')
@Controller('cargos')
export class CargosController {
  constructor(private readonly cargos: CargosService) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT')
  @Post()
  create(@CurrentUser() user: { sub: string }, @Body() dto: CreateCargoDto) {
    return this.cargos.create(user.sub, dto);
  }

  @Get()
  findAll(@Query() filters: CargoFiltersDto) {
    return this.cargos.findAll(filters);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('TRANSPORTER')
  @Get('compatible')
  compatible(@CurrentUser() user: { sub: string }, @Query() filters: CargoFiltersDto) {
    return this.cargos.findCompatible(user.sub, filters);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT')
  @Get('me')
  mine(@CurrentUser() user: { sub: string }) {
    return this.cargos.findMine(user.sub);
  }

  @Get(':id')
  one(@Param('id') id: string) {
    return this.cargos.findOne(id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT')
  @Patch(':id')
  update(
    @CurrentUser() user: { sub: string },
    @Param('id') id: string,
    @Body() dto: UpdateCargoDto,
  ) {
    return this.cargos.update(user.sub, id, dto);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT')
  @Delete(':id')
  remove(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cargos.remove(user.sub, id);
  }

  @ApiBearerAuth()
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('CLIENT')
  @Patch(':id/cancel')
  cancel(@CurrentUser() user: { sub: string }, @Param('id') id: string) {
    return this.cargos.cancel(user.sub, id);
  }
}
