import {
  Body,
  Controller,
  Post,
} from '@nestjs/common';

import { AiService } from './ai.service';
import { GenerateAssignmentDto } from './dto/generate-assignment.dto';

import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

import { AuditAction } from '../common/decorators/audit.decorator';

@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
  ) {}

  @Post('generate-assignment')
  @Roles(
    Role.TEACHER,
    Role.SCHOOL_ADMIN,
    Role.PLATFORM_ADMIN,
  )
  @AuditAction('ai.generate_assignment')
  generateAssignment(
    @Body() dto: GenerateAssignmentDto,
  ) {
    return this.aiService.generateAssignment(dto);
  }
}