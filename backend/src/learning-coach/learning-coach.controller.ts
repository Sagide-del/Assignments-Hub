import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { StartLearningSessionDto } from './dto/start-learning-session.dto';
import { SubmitLearningAnswerDto } from './dto/submit-learning-answer.dto';
import { LearningCoachService } from './learning-coach.service';

@ApiTags('Learning Coach')
@ApiBearerAuth()
@Controller('learning-coach')
@Roles(Role.STUDENT)
export class LearningCoachController {
  constructor(private readonly learningCoach: LearningCoachService) {}

  @Get('catalog')
  @ApiOperation({ summary: 'List approved, grade-appropriate topics available for adaptive practice' })
  catalog(@CurrentUser() actor: AuthenticatedUser) {
    return this.learningCoach.catalog(actor);
  }

  @Get('plans')
  @ApiOperation({ summary: 'List the learner’s saved topic mastery plans' })
  plans(@CurrentUser() actor: AuthenticatedUser) {
    return this.learningCoach.plans(actor);
  }

  @Post('sessions')
  @AuditAction('learning_coach.session_started')
  @ApiOperation({ summary: 'Start a private diagnostic or adaptive practice session' })
  start(@Body() dto: StartLearningSessionDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.learningCoach.start(dto, actor);
  }

  @Post('sessions/:id/answers')
  @AuditAction('learning_coach.answer_submitted')
  @ApiOperation({ summary: 'Submit one practice answer and receive immediate learning feedback' })
  answer(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SubmitLearningAnswerDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.learningCoach.answer(id, dto, actor);
  }
}
