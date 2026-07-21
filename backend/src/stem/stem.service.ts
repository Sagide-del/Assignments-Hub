import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StemService {
  constructor(private readonly prisma: PrismaService) {}

  findCategories() {
    return this.prisma.stemCategory.findMany({
      include: {
        subjects: {
          orderBy: [{ order: 'asc' }, { name: 'asc' }],
        },
        _count: {
          select: { labs: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }

  findSubjects() {
    return this.prisma.stemSubject.findMany({
      include: {
        category: true,
        _count: {
          select: { labs: true },
        },
      },
      orderBy: [{ order: 'asc' }, { name: 'asc' }],
    });
  }
}
