import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IndependentStudentsService } from './independent-students.service';
import { CreateIndependentStudentDto } from './dto/create-independent-student.dto';
import { RecordIndependentInvoiceDto } from './dto/record-invoice.dto';
import { SubmitIndependentPaymentClaimDto } from './dto/submit-payment-claim.dto';
import { RejectIndependentPaymentClaimDto } from './dto/reject-payment-claim.dto';
import { SendIndependentWelcomeDto } from './dto/send-independent-welcome.dto';
import { DeleteIndependentStudentsDto } from './dto/delete-independent-students.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';
import { Public } from '../common/decorators/public.decorator';

// Students enrolled without a school — PLATFORM_ADMIN only throughout, see
// independent-students.service.ts for the full design rationale.
@Controller('independent-students')
export class IndependentStudentsController {
  constructor(private readonly independentStudentsService: IndependentStudentsService) {}

  @Public()
  @Get('public/payment-info')
  getPublicPaymentInfo() {
    return this.independentStudentsService.getPaymentInfo();
  }

  @Public()
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Post('public/payment-claims')
  submitPaymentClaim(@Body() dto: SubmitIndependentPaymentClaimDto) {
    return this.independentStudentsService.submitPaymentClaim(dto);
  }

  @Get('payment-info')
  @Roles(Role.PLATFORM_ADMIN)
  getPaymentInfo() {
    return this.independentStudentsService.getPaymentInfo();
  }

  @Get('students')
  @Roles(Role.PLATFORM_ADMIN)
  findStudents() {
    return this.independentStudentsService.findStudents();
  }

  @Post('students')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.create')
  createStudent(@Body() dto: CreateIndependentStudentDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.independentStudentsService.createStudent(dto, actor);
  }

  @Delete('students')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.bulk_delete')
  deleteStudents(@Body() dto: DeleteIndependentStudentsDto) {
    return this.independentStudentsService.deleteStudents(dto.ids);
  }

  @Get('summary')
  @Roles(Role.PLATFORM_ADMIN)
  getSummary() {
    return this.independentStudentsService.getSummary();
  }

  @Get('tutor/overview')
  @Roles(Role.PLATFORM_ADMIN)
  getTutorOverview() {
    return this.independentStudentsService.getTutorOverview();
  }

  @Get('tutor/submissions')
  @Roles(Role.PLATFORM_ADMIN)
  getTutorSubmissions(
    @Query('studentId', new OptionalParseIntPipe()) studentId?: number,
    @Query('subject') subject?: string,
    @Query('reviewState') reviewState?: string,
  ) {
    return this.independentStudentsService.getTutorSubmissions({
      studentId,
      subject,
      reviewState,
    });
  }

  @Post('students/:id/welcome')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.welcome')
  sendWelcome(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: SendIndependentWelcomeDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.independentStudentsService.sendWelcome(id, dto, actor);
  }

  @Get('invoices')
  @Roles(Role.PLATFORM_ADMIN)
  findInvoices(@Query('studentId', new OptionalParseIntPipe()) studentId?: number) {
    return this.independentStudentsService.findInvoices(studentId);
  }

  @Post('invoices')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.invoice_record')
  recordInvoice(@Body() dto: RecordIndependentInvoiceDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.independentStudentsService.recordInvoice(dto, actor);
  }

  @Delete('invoices/:id')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.invoice_delete')
  deleteInvoice(@Param('id', ParseIntPipe) id: number) {
    return this.independentStudentsService.deleteInvoice(id);
  }

  @Get('payment-claims')
  @Roles(Role.PLATFORM_ADMIN)
  findPaymentClaims() {
    return this.independentStudentsService.findPaymentClaims();
  }

  @Patch('payment-claims/:id/approve')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.payment_claim_approve')
  approvePaymentClaim(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.independentStudentsService.approvePaymentClaim(id, actor);
  }

  @Patch('payment-claims/:id/reject')
  @Roles(Role.PLATFORM_ADMIN)
  @AuditAction('independent_student.payment_claim_reject')
  rejectPaymentClaim(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RejectIndependentPaymentClaimDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.independentStudentsService.rejectPaymentClaim(id, dto, actor);
  }
}
