import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { DashboardController } from './dashboard.controller';

@Module({
  controllers: [AdminController, DashboardController],
  providers: [AdminService],
})
export class AdminModule {}
