import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Role } from "../common/enums/role.enum";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { teacherPairs } from "./scope";
@Injectable()
export class TeacherScopeGuard implements CanActivate {
  constructor(private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    const actor = req.user as AuthenticatedUser;
    if (actor?.role !== Role.TEACHER) return true;
    const pairs = await teacherPairs(this.db, actor);
    actor.allowed_streams = pairs.map((p) => ({
      stream_id: p.stream_id,
      subject: p.subject,
    }));
    for (const source of [req.query, req.body]) {
      for (const key of ["stream", "stream_id", "streamId", "targetStream"]) {
        const value = source?.[key];
        if (
          value !== undefined &&
          (typeof value !== "string" ||
            !pairs.some(
              (p) => p.stream_id === value || p.stream.name === value,
            ))
        )
          throw new ForbiddenException(
            "This stream is outside your assigned classes.",
          );
      }
      for (const key of ["school_id", "schoolId"]) {
        if (
          source?.[key] !== undefined &&
          Number(source[key]) !== actor.schoolId
        )
          throw new ForbiddenException("You cannot access another school.");
      }
    }
    return true;
  }
}
