import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';

import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { SchoolsModule } from './schools/schools.module';
import { UsersModule } from './users/users.module';
import { AuditModule } from './audit/audit.module';

import { AssignmentsModule } from './assignments/assignments.module';
import { SubmissionsModule } from './submissions/submissions.module';

import { LabSessionsModule } from './lab-sessions/lab-sessions.module';
import { LabsModule } from './labs/labs.module';

import { CslActivitiesModule } from './csl-activities/csl-activities.module';
import { CslSubmissionsModule } from './csl-submissions/csl-submissions.module';

import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { PaymentModule } from './payment/payment.module';

import { ReportsModule } from './reports/reports.module';
import { UploadsModule } from './uploads/uploads.module';

import { SmsModule } from './sms/sms.module';

import { PathwaysModule } from './pathways/pathways.module';
import { SupportNeedsModule } from './support-needs/support-needs.module';
import { StemModule } from './stem/stem.module';

import { AiModule } from './ai/ai.module';
import { SkillsModule } from './skills/skills.module';

import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { TenantGuard } from './common/guards/tenant.guard';


@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),

    PrismaModule,

    AuditModule,

    AuthModule,

    SchoolsModule,

    UsersModule,

    AssignmentsModule,

    SubmissionsModule,

    LabSessionsModule,

    LabsModule,

    CslActivitiesModule,

    CslSubmissionsModule,

    SubscriptionsModule,

    PaymentModule,

    ReportsModule,

    UploadsModule,

    SmsModule,

    PathwaysModule,

    SupportNeedsModule,

    StemModule,

    AiModule,

    SkillsModule,
  ],

  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },

    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },

    {
      provide: APP_GUARD,
      useClass: TenantGuard,
    },
  ],
})
export class AppModule {}
