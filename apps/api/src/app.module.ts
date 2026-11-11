import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CargosModule } from './cargos/cargos.module';
import { MapsModule } from './maps/maps.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PrismaModule } from './prisma/prisma.module';
import { ProfilesModule } from './profiles/profiles.module';
import { ProposalsModule } from './proposals/proposals.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';
import { VehiclesModule } from './vehicles/vehicles.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    UsersModule,
    ProfilesModule,
    VehiclesModule,
    CargosModule,
    ProposalsModule,
    TripsModule,
    NotificationsModule,
    AdminModule,
    MapsModule,
  ],
})
export class AppModule {}
