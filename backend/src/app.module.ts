import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

import { AdminModule } from './admin/admin.module';
import { AiModule } from './ai/ai.module';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { ContractsModule } from './contracts/contracts.module';
import { EventsModule } from './events/events.module';
import { MessagesModule } from './messages/messages.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentsModule } from './payments/payments.module';
import { PortfoliosModule } from './portfolios/portfolios.module';
import { PrismaModule } from './prisma/prisma.module';
import { PromotersModule } from './promoters/promoters.module';
import { PublicModule } from './public/public.module';
import { RatingsModule } from './ratings/ratings.module';
import { StorageModule } from './storage/storage.module';
import { TalentsModule } from './talents/talents.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: Number(process.env.RATE_LIMIT ?? 600) }]),
    PrismaModule,
    StorageModule,
    NotificationsModule,
    AuthModule,
    UsersModule,
    TalentsModule,
    PromotersModule,
    EventsModule,
    PortfoliosModule,
    ContractsModule,
    PaymentsModule,
    MessagesModule,
    RatingsModule,
    AiModule,
    AdminModule,
    PublicModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
