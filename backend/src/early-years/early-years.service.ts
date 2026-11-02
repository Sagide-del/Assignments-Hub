import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AiProviderRouterService } from '../ai/ai-provider-router.service';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { GenerateEarlyYearsDto } from './dto/early-years.dto';

const languageName = (language: 'EN' | 'SW') => language === 'SW' ? 'Kiswahili (Kenya)' : 'English (Kenya)';

@Injectable()
export class EarlyYearsService {
  constructor(private readonly prisma: PrismaService, private readonly ai: AiProviderRouterService) {}

  async generate(dto: GenerateEarlyYearsDto, actor: AuthenticatedUser) {
    if (dto.schoolScope === 'SELECTED' && !dto.schoolIds?.length) throw new BadRequestException('Choose at least one school.');
    const result = await this.ai.generateAssignment(`You are a Kenyan CBC early-years curriculum editor. Create ${dto.count} safe, joyful, screen-light micro-activities for ${dto.grade}, ${dto.area}. Use ${languageName(dto.language)} only. Activities must be play-led, concrete, brief (2-5 minutes), culturally familiar and appropriate for a child aged about 4-9. Do not make claims that require a source, do not use external URLs, and do not ask children for personal information. Return strict JSON only: {"activities":[{"title":"short title","prompt":"one spoken child-friendly instruction","choices":[{"emoji":"single relevant emoji","label":"short answer label","correct":true}],"celebration":"short positive feedback","grownUpTip":"one simple adult prompt"}]}. Provide 2-4 choices per activity and exactly one correct choice.`, { userId: actor.id });
    const payload = typeof result.content === 'string' ? JSON.parse(result.content) : result.content as any;
    const activities = Array.isArray(payload?.activities) ? payload.activities : [];
    if (!activities.length) throw new BadRequestException('The AI response did not contain usable activities.');
    const rows = activities.slice(0, dto.count).map((activity: any) => {
      if (typeof activity?.title !== 'string' || typeof activity?.prompt !== 'string' || !Array.isArray(activity?.choices) || activity.choices.length < 2 || !activity.choices.some((choice: any) => choice?.correct === true)) throw new BadRequestException('The AI response did not meet the activity quality checks.');
      return { grade: dto.grade, area: dto.area, language: dto.language, title: activity.title.slice(0, 120), prompt: activity.prompt.slice(0, 300), content: { choices: activity.choices.slice(0, 4), celebration: String(activity.celebration ?? 'Well done!').slice(0, 160), grownUpTip: String(activity.grownUpTip ?? '').slice(0, 300) }, audience: dto.audience, schoolIds: dto.schoolScope === 'SELECTED' ? dto.schoolIds ?? [] : [], createdById: actor.id };
    });
    return this.prisma.$transaction(rows.map((data: (typeof rows)[number]) => this.prisma.earlyYearsActivity.create({ data })));
  }

  listAdmin() { return this.prisma.earlyYearsActivity.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }); }

  async publish(id: string, status: 'DRAFT' | 'PUBLISHED') {
    const activity = await this.prisma.earlyYearsActivity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found.');
    return this.prisma.earlyYearsActivity.update({ where: { id }, data: { status, publishedAt: status === 'PUBLISHED' ? new Date() : null } });
  }

  async next(actor: AuthenticatedUser) {
    const isIndependent = actor.isIndependentTrial || !actor.schoolId;
    const rows = await this.prisma.earlyYearsActivity.findMany({ where: { grade: actor.grade ?? '', status: 'PUBLISHED', OR: isIndependent ? [{ audience: 'INDEPENDENT' }, { audience: 'BOTH' }] : [{ audience: 'SCHOOLS' }, { audience: 'BOTH' }] }, orderBy: { publishedAt: 'asc' }, take: 100 });
    const eligible = rows.filter((activity) => {
      if (isIndependent) return true;
      const ids = Array.isArray(activity.schoolIds) ? activity.schoolIds : [];
      return !ids.length || ids.includes(actor.schoolId);
    });
    if (!eligible.length) return null;
    const completed = await this.prisma.earlyYearsActivityProgress.findMany({ where: { studentId: actor.id, activityId: { in: eligible.map((activity) => activity.id) } }, select: { activityId: true } });
    const completedIds = new Set(completed.map((row) => row.activityId));
    return eligible.find((activity) => !completedIds.has(activity.id)) ?? eligible[0];
  }

  async complete(activityId: string, actor: AuthenticatedUser) {
    await this.prisma.earlyYearsActivityProgress.upsert({ where: { activityId_studentId: { activityId, studentId: actor.id } }, create: { activityId, studentId: actor.id }, update: { completedAt: new Date() } });
    return this.next(actor);
  }
}
