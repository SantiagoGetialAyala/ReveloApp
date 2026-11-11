import { Module } from '@nestjs/common';
import { TripsController } from './trips.controller';
import { AdminIncidentsController } from './incidents.admin.controller';
import { TripsService } from './trips.service';

@Module({
  controllers: [TripsController, AdminIncidentsController],
  providers: [TripsService],
})
export class TripsModule {}
