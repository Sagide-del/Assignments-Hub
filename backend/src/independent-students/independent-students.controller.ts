import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { IndependentStudentsService } from './independent-students.service';
import { CreateIndependentStudentDto } from './dto/create-independent-student.dto';
import { RecordIndependentInvoiceDto } from './dto/record-invoice.dto';
import { Roles } from '../common/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { AuditAction } from '../common/decorators/audit.decorator';
import { OptionalParseIntPipe } from '../common/pipes/optional-parse-int.pipe';

// Students enrolled without a school — PLATFORM_ADMIN only throughout, see
// independent-students.service.ts for the full design rationale.
@Controller('independent-students')
export class IndependentStudentsController {
  constructor(private readonly independentStudentsService: IndependentStudentsService) {}

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
}
