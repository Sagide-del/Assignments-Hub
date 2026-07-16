import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSubscriptionDto } from './dto/create-subscription.dto';
import { UpdateSubscriptionDto } from './dto/update-subscription.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';
import { SubscriptionStatus } from '@prisma/client';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Creates a subscription record and mirrors its status onto
   * School.subscriptionStatus, which is the field the rest of the app
   * (login, dashboards) reads for a quick "is this school active" check.
   * Subscription rows themselves are the source of truth / billing history.
   */
  async create(dto: CreateSubscriptionDto) {
    const school = await this.prisma.school.findUnique({ where: { id: dto.schoolId } });
    if (!school) throw new NotFoundException('School not found');

    const status = dto.status ?? SubscriptionStatus.TRIAL;

    const [subscription] = await this.prisma.$transaction([
      this.prisma.subscription.create({
        data: {
          schoolId: dto.schoolId,
          plan: dto.plan,
          status,
          amountKES: dto.amountKES,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
      }),
      this.prisma.school.update({
        where: { id: dto.schoolId },
        data: { subscriptionStatus: status },
      }),
    ]);

    return subscription;
  }

  findAll(actor: AuthenticatedUser, schoolId?: number) {
    const targetSchoolId = actor.role === Role.PLATFORM_ADMIN ? schoolId : actor.schoolId;

    return this.prisma.subscription.findMany({
      where: { schoolId: targetSchoolId },
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(id: number, actor: AuthenticatedUser) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');
    this.assertSameTenant(subscription.schoolId, actor);
    return subscription;
  }

  async update(id: number, dto: UpdateSubscriptionDto) {
    const subscription = await this.prisma.subscription.findUnique({ where: { id } });
    if (!subscription) throw new NotFoundException('Subscription not found');

    const data = {
      status: dto.status,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
    };

    const updates: any[] = [this.prisma.subscription.update({ where: { id }, data })];

    // Only mirror onto School.subscriptionStatus if this is the school's
    // most recent subscription record, so an old row being edited doesn't
    // clobber a newer one's status.
    if (dto.status) {
      const latest = await this.prisma.subscription.findFirst({
        where: { schoolId: subscription.schoolId },
        orderBy: { startedAt: 'desc' },
      });
      if (latest?.id === id) {
        updates.push(
          this.prisma.school.update({
            where: { id: subscription.schoolId },
            data: { subscriptionStatus: dto.status },
          }),
        );
      }
    }

    const [updated] = await this.prisma.$transaction(updates);
    return updated;
  }

  private assertSameTenant(schoolId: number, actor: AuthenticatedUser) {
    if (actor.role === Role.PLATFORM_ADMIN) return;
    if (actor.schoolId !== schoolId) {
      throw new ForbiddenException('You cannot access another school\'s data');
    }
  }
}
