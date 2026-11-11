import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import {
  CreateTripIncidentDto,
  CreateTripMessageDto,
  CreateTripReviewDto,
  UpdateTripStatusDto,
} from './dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiBearerAuth()
@UseGuards(AuthGuard('jwt'))
@Controller('trips')
export class TripsController {
  constructor(private readonly trips: TripsService) {}

  @Get('me')
  mine(@CurrentUser() user: { sub: string; role: string }) {
    return this.trips.mine(user.sub, user.role);
  }

  @Get('reviews/me')
  myReviewSummary(@CurrentUser() user: { sub: string }) {
    return this.trips.myReviewSummary(user.sub);
  }

  @Get('reviews/received')
  receivedReviews(@CurrentUser() user: { sub: string }) {
    return this.trips.receivedReviews(user.sub);
  }

  @Get(':id')
  one(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.trips.findOne(id, user.sub, user.role);
  }

  @Patch(':id/status')
  status(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: UpdateTripStatusDto,
  ) {
    return this.trips.updateStatus(id, user.sub, user.role, dto.status, dto.note);
  }

  @Get(':id/history')
  history(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.trips.history(id, user.sub, user.role);
  }

  @Get(':id/messages')
  messages(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.trips.messages(id, user.sub, user.role);
  }

  @Post(':id/messages')
  sendMessage(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: CreateTripMessageDto,
  ) {
    return this.trips.sendMessage(id, user.sub, user.role, dto.body);
  }

  @Get(':id/incidents')
  incidents(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.trips.incidents(id, user.sub, user.role);
  }

  @Post(':id/incidents')
  createIncident(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: CreateTripIncidentDto,
  ) {
    return this.trips.createIncident(id, user.sub, user.role, dto.type, dto.description);
  }

  @Get(':id/reviews')
  reviews(@Param('id') id: string, @CurrentUser() user: { sub: string; role: string }) {
    return this.trips.reviews(id, user.sub, user.role);
  }

  @Post(':id/reviews')
  createReview(
    @Param('id') id: string,
    @CurrentUser() user: { sub: string; role: string },
    @Body() dto: CreateTripReviewDto,
  ) {
    return this.trips.createReview(id, user.sub, user.role, dto.score, dto.comment);
  }
}
