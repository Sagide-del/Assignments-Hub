import { randomInt } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';

// Omits 0/O and 1/I so IDs are easy to read aloud and type on a phone.
const STUDENT_ID_CHARACTERS = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
const STUDENT_ID_LENGTH = 4;
const MAX_GENERATION_ATTEMPTS = 20;

export async function generateIndependentStudentId(
  prisma: PrismaService,
  schoolId: number,
): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const studentId = Array.from(
      { length: STUDENT_ID_LENGTH },
      () => STUDENT_ID_CHARACTERS[randomInt(STUDENT_ID_CHARACTERS.length)],
    ).join('');

    const existing = await prisma.user.findUnique({
      where: {
        schoolId_admissionNumber: {
          schoolId,
          admissionNumber: studentId,
        },
      },
      select: { id: true },
    });

    if (!existing) return studentId;
  }

  throw new Error('Could not allocate a unique independent Student ID');
}
