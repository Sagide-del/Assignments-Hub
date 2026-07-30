import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from "@nestjs/swagger";
import { AuthenticatedUser } from "../auth/interfaces/authenticated-user.interface";
import { AuditAction } from "../common/decorators/audit.decorator";
import { CurrentUser } from "../common/decorators/current-user.decorator";
import { Roles } from "../common/decorators/roles.decorator";
import { Role } from "../common/enums/role.enum";
import { QuestionBankService } from "./question-bank.service";
import { GenerateQuestionBankDto } from "./dto/generate-question-bank.dto";
import { ListQuestionBankDto } from "./dto/list-question-bank.dto";
import { UpdateQuestionBankItemDto } from "./dto/update-question-bank-item.dto";
import { RejectQuestionBankItemDto } from "./dto/review-question-bank-item.dto";
import { ActivateSchoolDto } from "./dto/activate-school.dto";
import { PublishQuestionBankDto } from "./dto/publish-question-bank.dto";
import { SelectQuestionBankDto } from "./dto/select-question-bank.dto";

// Platform Admin: full CRUD + generation + review + publishing.
// STUDENT is never included in @Roles on either controller below, so a
// student JWT is rejected by the global RolesGuard before any handler or
// service-layer check runs (see backend/src/common/guards/roles.guard.ts).
@ApiTags("Question Bank — Admin")
@ApiBearerAuth()
@Controller("admin/question-bank")
@Roles(Role.PLATFORM_ADMIN)
export class QuestionBankAdminController {
  constructor(private readonly questionBank: QuestionBankService) {}

  @Post("generate")
  @UseInterceptors(FileInterceptor("file", { limits: { files: 1, fileSize: 15 * 1024 * 1024 } }))
  @ApiConsumes("multipart/form-data")
  @ApiOperation({ summary: "Upload a PDF and generate a batch of questions with OpenAI" })
  @AuditAction("question_bank.generate")
  generate(
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: GenerateQuestionBankDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.questionBank.generate(file, dto, actor);
  }

  @Get()
  @ApiOperation({ summary: "List all question bank items (any status)" })
  list(@Query() query: ListQuestionBankDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.listAdmin(actor, query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single question bank item" })
  getOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.getOneAdmin(id, actor);
  }

  @Put(":id")
  @ApiOperation({ summary: "Edit a question bank item (resets it to GENERATED for re-approval)" })
  @AuditAction("question_bank.update")
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: UpdateQuestionBankItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.questionBank.update(id, dto, actor);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a question bank item (not yet published)" })
  @AuditAction("question_bank.delete")
  remove(@Param("id", ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.remove(id, actor);
  }

  @Post(":id/approve")
  @ApiOperation({ summary: "Approve a question bank item" })
  @AuditAction("question_bank.approve")
  approve(@Param("id", ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.approve(id, actor);
  }

  @Post(":id/reject")
  @ApiOperation({ summary: "Reject a question bank item" })
  @AuditAction("question_bank.reject")
  reject(
    @Param("id", ParseIntPipe) id: number,
    @Body() dto: RejectQuestionBankItemDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.questionBank.reject(id, dto.notes, actor);
  }

  @Post("publish")
  @ApiOperation({ summary: "Publish approved questions as an assignment for independent students" })
  @AuditAction("question_bank.publish")
  publish(@Body() dto: PublishQuestionBankDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.publishToIndependentStudents(dto, actor);
  }

  @Post("activate-school")
  @ApiOperation({ summary: "Activate (or deactivate) Question Bank access for a school" })
  @AuditAction("question_bank.activate_school")
  activateSchool(@Body() dto: ActivateSchoolDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.activateSchool(dto, actor);
  }

  @Get("school-access/list")
  @ApiOperation({ summary: "List every school's Question Bank activation state" })
  listSchoolAccess(@CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.listSchoolAccess(actor);
  }
}

// Teacher / School Admin: read-only browse + select-to-create-assignment.
// Requires the teacher's school to have been activated by a Platform Admin
// (QuestionBankService.assertReadAccess) — PLATFORM_ADMIN can browse
// without activation, to preview the bank the same way a teacher would.
@ApiTags("Question Bank — Browse")
@ApiBearerAuth()
@Controller("question-bank")
@Roles(Role.TEACHER, Role.SCHOOL_ADMIN, Role.PLATFORM_ADMIN)
export class QuestionBankBrowseController {
  constructor(private readonly questionBank: QuestionBankService) {}

  @Get()
  @ApiOperation({ summary: "Browse approved question bank items" })
  browse(@Query() query: ListQuestionBankDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.browse(actor, query);
  }

  @Get("subjects")
  @ApiOperation({ summary: "List subjects with approved questions" })
  subjects(@CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.distinctSubjects(actor);
  }

  @Get("grades")
  @ApiOperation({ summary: "List grades with approved questions" })
  grades(@CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.distinctGrades(actor);
  }

  @Get("topics")
  @ApiOperation({ summary: "List topics with approved questions" })
  topics(@CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.distinctTopics(actor);
  }

  @Post("select")
  @ApiOperation({ summary: "Create an assignment from selected bank questions" })
  @AuditAction("question_bank.select")
  select(@Body() dto: SelectQuestionBankDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.selectForAssignment(dto, actor);
  }

  // Static route declared after /select, /subjects, /grades, /topics —
  // must stay last so it doesn't shadow them (same ordering rule as
  // AiContentController — see that file's "Static route" comment).
  @Get(":id")
  @ApiOperation({ summary: "View a single approved question bank item" })
  getOne(@Param("id", ParseIntPipe) id: number, @CurrentUser() actor: AuthenticatedUser) {
    return this.questionBank.browseOne(id, actor);
  }
}
