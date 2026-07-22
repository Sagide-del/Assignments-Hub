import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as crypto from 'crypto';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';

type ImportRole = typeof Role.STUDENT | typeof Role.TEACHER;

export interface ImportRowResult {
  row: number;
  name?: string;
  role?: string;
  status: 'created' | 'error';
  message?: string;
  generatedPassword?: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
}

export interface ImportErrorDetail {
  row: number;
  name?: string;
  field?: string;
  message: string;
}

export interface StudentImportPreviewResponse {
  success: boolean;
  preview: {
    detected: number;
    valid: number;
    duplicates: number;
    missingRequiredFields: number;
  };
  errors: ImportErrorDetail[];
}

export interface TeacherImportPreviewResponse {
  success: boolean;
  preview: {
    detected: number;
    valid: number;
    duplicates: number;
    missingRequiredFields: number;
  };
  errors: ImportErrorDetail[];
}

export interface StudentImportResponse {
  success: boolean;
  summary: {
    created: number;
    failed: number;
    duplicates: number;
  };
  errors: ImportErrorDetail[];
}

export interface TeacherGeneratedPassword {
  row: number;
  name?: string;
  email: string;
  password: string;
}

export interface TeacherImportResponse {
  success: boolean;
  summary: {
    created: number;
    failed: number;
  };
  generatedPasswords: TeacherGeneratedPassword[];
  errors: ImportErrorDetail[];
}

const LEGACY_HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'student name', 'teacher name'],
  role: ['role', 'type'],
  email: ['email', 'e-mail'],
  password: ['password', 'temp password', 'temporary password'],
  admissionNumber: ['admission number', 'admission no', 'admission_number', 'adm no', 'admno'],
  grade: ['grade', 'form', 'student grade'],
  parentPhone: ['parent phone', 'guardian phone', 'parent contact', 'parent phone number', 'guardian phone number'],
  subject: ['subject', 'teaching subject'],
  assignedClass: ['assigned class', 'class', 'teaching class', 'class taught'],
};

const STUDENT_HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'student name'],
  admissionNumber: ['admission number', 'admission no', 'admission_number', 'adm no', 'admno'],
  grade: ['grade', 'form', 'student grade'],
  studentClass: ['class', 'student class'],
  stream: ['stream'],
  parentName: ['parent name', 'guardian name'],
  parentPhone: ['parent phone', 'guardian phone', 'parent contact', 'parent phone number', 'guardian phone number'],
  parentEmail: ['parent email', 'guardian email'],
  pathway: ['pathway', 'learning pathway'],
};

const TEACHER_HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'teacher name'],
  email: ['email', 'e-mail'],
  phone: ['phone', 'teacher phone', 'contact phone'],
  subject: ['subject', 'teaching subject'],
  department: ['department'],
  assignedClass: ['class assigned', 'assigned class', 'class', 'teaching class', 'class taught'],
  employeeNumber: ['employee number', 'staff number'],
  password: ['password', 'temp password', 'temporary password'],
};

type ColumnMap = Partial<Record<string, number>>;

interface ParsedImportRow {
  name: string;
  role: string;
  email: string;
  password: string;
  admissionNumber: string;
  grade: string;
  studentClass: string;
  stream: string;
  pathway: string;
  parentName: string;
  parentPhone: string;
  parentEmail: string;
  subject: string;
  assignedClass: string;
}

interface ProcessWorkbookOptions {
  allowedRoles: ImportRole[];
  previewOnly: boolean;
}

interface ProcessWorkbookResult {
  totalRows: number;
  createdStudents: number;
  createdTeachers: number;
  errors: ImportErrorDetail[];
  duplicates: number;
  missingRequiredFields: number;
  generatedPasswords: TeacherGeneratedPassword[];
  legacyResults: ImportRowResult[];
}

@Injectable()
export class UsersImportService {
  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
  ) {}

  async importFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<ImportSummary> {
    const result = await this.processLegacyWorkbook(buffer, actor);
    return {
      totalRows: result.legacyResults.length,
      created: result.createdStudents + result.createdTeachers,
      failed: result.errors.length,
      results: result.legacyResults,
    };
  }

  async previewStudentsFromExcel(
    buffer: Buffer,
    actor: AuthenticatedUser,
  ): Promise<StudentImportPreviewResponse> {
    const result = await this.processWorkbook(buffer, actor, STUDENT_HEADER_ALIASES, {
      allowedRoles: [Role.STUDENT],
      previewOnly: true,
    });
    return {
      success: true,
      preview: {
        detected: result.totalRows,
        valid: result.totalRows - result.errors.length,
        duplicates: result.duplicates,
        missingRequiredFields: result.missingRequiredFields,
      },
      errors: result.errors,
    };
  }

  async previewTeachersFromExcel(
    buffer: Buffer,
    actor: AuthenticatedUser,
  ): Promise<TeacherImportPreviewResponse> {
    const result = await this.processWorkbook(buffer, actor, TEACHER_HEADER_ALIASES, {
      allowedRoles: [Role.TEACHER],
      previewOnly: true,
    });
    return {
      success: true,
      preview: {
        detected: result.totalRows,
        valid: result.totalRows - result.errors.length,
        duplicates: result.duplicates,
        missingRequiredFields: result.missingRequiredFields,
      },
      errors: result.errors,
    };
  }

  async importStudentsFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<StudentImportResponse> {
    const result = await this.processWorkbook(buffer, actor, STUDENT_HEADER_ALIASES, {
      allowedRoles: [Role.STUDENT],
      previewOnly: false,
    });
    return {
      success: true,
      summary: {
        created: result.createdStudents,
        failed: result.errors.length,
        duplicates: result.duplicates,
      },
      errors: result.errors,
    };
  }

  async importTeachersFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<TeacherImportResponse> {
    const result = await this.processWorkbook(buffer, actor, TEACHER_HEADER_ALIASES, {
      allowedRoles: [Role.TEACHER],
      previewOnly: false,
    });
    return {
      success: true,
      summary: {
        created: result.createdTeachers,
        failed: result.errors.length,
      },
      generatedPasswords: result.generatedPasswords,
      errors: result.errors,
    };
  }

  async buildTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Import');

    sheet.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Role', key: 'role', width: 14 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Password', key: 'password', width: 18 },
      { header: 'Admission Number', key: 'admissionNumber', width: 20 },
      { header: 'Grade', key: 'grade', width: 14 },
      { header: 'Parent Phone', key: 'parentPhone', width: 18 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Class', key: 'assignedClass', width: 16 },
    ];
    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      name: 'Jane Wanjiru',
      role: 'TEACHER',
      email: 'jane.wanjiru@example.school',
      password: '',
      admissionNumber: '',
      grade: '',
      parentPhone: '',
      subject: 'Mathematics',
      assignedClass: 'Grade 7',
    });
    sheet.addRow({
      name: 'Brian Otieno',
      role: 'STUDENT',
      email: '',
      password: '',
      admissionNumber: 'ADM002',
      grade: 'Grade 7',
      parentPhone: '+254712345678',
      subject: '',
      assignedClass: '',
    });

    sheet.getCell('K1').value =
      'Leave Password blank for teachers to auto-generate one. Role must be TEACHER or STUDENT. ' +
      'Grade is a student\'s class level; Subject/Class are teacher-only (subject taught and class assigned to). ' +
      'Parent Phone (students only) enables SMS notifications - use international format, e.g. +254712345678.';

    return workbook.xlsx.writeBuffer();
  }

  async buildStudentTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Students');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Admission Number', key: 'admissionNumber', width: 20 },
      { header: 'Grade', key: 'grade', width: 14 },
      { header: 'Class', key: 'studentClass', width: 16 },
      { header: 'Stream', key: 'stream', width: 16 },
      { header: 'Parent Name', key: 'parentName', width: 24 },
      { header: 'Parent Phone', key: 'parentPhone', width: 18 },
      { header: 'Parent Email', key: 'parentEmail', width: 28 },
      { header: 'Pathway', key: 'pathway', width: 22 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getCell('K1').value =
      'Required today: Name, Admission Number, Grade. Parent Phone remains supported for SMS. ' +
      'Class, Stream, Parent Name, Parent Email, and Pathway are future-ready columns and are not yet persisted.';
    return workbook.xlsx.writeBuffer();
  }

  async buildTeacherTemplate(): Promise<ExcelJS.Buffer> {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Teachers');
    sheet.columns = [
      { header: 'Name', key: 'name', width: 24 },
      { header: 'Email', key: 'email', width: 28 },
      { header: 'Phone', key: 'phone', width: 18 },
      { header: 'Subject', key: 'subject', width: 20 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Class Assigned', key: 'assignedClass', width: 18 },
      { header: 'Employee Number', key: 'employeeNumber', width: 20 },
      { header: 'Password', key: 'password', width: 18 },
    ];
    sheet.getRow(1).font = { bold: true };
    sheet.getCell('J1').value =
      'Required today: Name, Email, Password or blank-for-generated-password. ' +
      'Subject and Class Assigned are supported. Phone, Department, and Employee Number are future-ready columns and are not yet persisted.';
    return workbook.xlsx.writeBuffer();
  }

  private async processLegacyWorkbook(buffer: Buffer, actor: AuthenticatedUser): Promise<ProcessWorkbookResult> {
    return this.processWorkbook(buffer, actor, LEGACY_HEADER_ALIASES, {
      allowedRoles: [Role.STUDENT, Role.TEACHER],
      previewOnly: false,
    });
  }

  private async processWorkbook(
    buffer: Buffer,
    actor: AuthenticatedUser,
    headerAliases: Record<string, string[]>,
    options: ProcessWorkbookOptions,
  ): Promise<ProcessWorkbookResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return {
        totalRows: 0,
        createdStudents: 0,
        createdTeachers: 0,
        errors: [],
        duplicates: 0,
        missingRequiredFields: 0,
        generatedPasswords: [],
        legacyResults: [],
      };
    }

    const columnMap = this.mapColumns(sheet.getRow(1), headerAliases);
    const errors: ImportErrorDetail[] = [];
    const generatedPasswords: TeacherGeneratedPassword[] = [];
    const legacyResults: ImportRowResult[] = [];
    let totalRows = 0;
    let createdStudents = 0;
    let createdTeachers = 0;
    let duplicates = 0;
    let missingRequiredFields = 0;

    const schoolId = actor.schoolId;
    const existingStudentAdmissions =
      schoolId && options.allowedRoles.includes(Role.STUDENT)
        ? new Set(
            (
              await this.prisma.user.findMany({
                where: { schoolId, role: Role.STUDENT, admissionNumber: { not: null } },
                select: { admissionNumber: true },
              })
            )
              .map((user) => user.admissionNumber ?? '')
              .filter(Boolean),
          )
        : new Set<string>();

    const existingTeacherEmails =
      schoolId && options.allowedRoles.includes(Role.TEACHER)
        ? new Set(
            (
              await this.prisma.user.findMany({
                where: { schoolId, role: Role.TEACHER, email: { not: null } },
                select: { email: true },
              })
            )
              .map((user) => (user.email ?? '').toLowerCase())
              .filter(Boolean),
          )
        : new Set<string>();

    const seenStudentAdmissions = new Set<string>();
    const seenTeacherEmails = new Set<string>();

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (this.isRowEmpty(row)) continue;
      totalRows++;

      const raw = this.readRow(row, columnMap, options.allowedRoles);
      let generatedPassword: string | undefined;

      try {
        if (!options.allowedRoles.includes(raw.role as ImportRole)) {
          throw this.createRowError(
            rowNumber,
            raw.name || undefined,
            'role',
            options.allowedRoles[0] === Role.STUDENT
              ? 'This endpoint only accepts student rows'
              : options.allowedRoles.length === 1
                ? 'This endpoint only accepts teacher rows'
                : 'Role must be "TEACHER" or "STUDENT"',
          );
        }

        const duplicateField = this.findDuplicateField(
          raw,
          existingStudentAdmissions,
          existingTeacherEmails,
          seenStudentAdmissions,
          seenTeacherEmails,
        );
        if (duplicateField) {
          throw this.createRowError(
            rowNumber,
            raw.name || undefined,
            duplicateField,
            duplicateField === 'admissionNumber'
              ? 'Admission number already in use at this school'
              : 'Email already in use at this school',
          );
        }

        if (raw.role === Role.TEACHER && !raw.password) {
          generatedPassword = this.generateTempPassword();
        }

        const dto = plainToInstance(CreateUserDto, {
          name: raw.name || undefined,
          role: raw.role,
          email: raw.email || undefined,
          password: raw.password || generatedPassword,
          admissionNumber: raw.admissionNumber || undefined,
          grade: raw.grade || undefined,
          studentClass: raw.studentClass || undefined,
          stream: raw.stream || undefined,
          pathway: raw.pathway || undefined,
          parentName: raw.parentName || undefined,
          parentPhone: raw.parentPhone || undefined,
          parentEmail: raw.parentEmail || undefined,
          subject: raw.subject || undefined,
          assignedClass: raw.assignedClass || undefined,
        });

        const validationErrors = await validate(dto, { whitelist: true });
        if (validationErrors.length > 0) {
          const detail = this.validationErrorDetail(validationErrors);
          throw this.createRowError(rowNumber, raw.name || undefined, detail.field, detail.message);
        }

        if (!options.previewOnly) {
          await this.usersService.create(dto, actor);
        }

        if (raw.role === Role.STUDENT) {
          createdStudents++;
          if (raw.admissionNumber) seenStudentAdmissions.add(raw.admissionNumber);
        }

        if (raw.role === Role.TEACHER) {
          createdTeachers++;
          if (raw.email) seenTeacherEmails.add(raw.email.toLowerCase());
        }

        legacyResults.push({
          row: rowNumber,
          name: raw.name || undefined,
          role: raw.role || undefined,
          status: 'created',
          generatedPassword,
        });

        if (generatedPassword && raw.email) {
          generatedPasswords.push({
            row: rowNumber,
            name: raw.name || undefined,
            email: raw.email,
            password: generatedPassword,
          });
        }
      } catch (err) {
        const detail = this.normalizeError(err, rowNumber, raw.name || undefined, raw.role);
        if (this.isDuplicateError(detail.message)) duplicates++;
        if (this.isMissingRequiredField(detail.message)) missingRequiredFields++;
        errors.push(detail);
        legacyResults.push({
          row: rowNumber,
          name: raw.name || undefined,
          role: raw.role || undefined,
          status: 'error',
          message: detail.message,
        });
      }
    }

    return {
      totalRows,
      createdStudents,
      createdTeachers,
      errors,
      duplicates,
      missingRequiredFields,
      generatedPasswords,
      legacyResults,
    };
  }

  private readRow(
    row: ExcelJS.Row,
    columnMap: ColumnMap,
    allowedRoles: ImportRole[],
  ): ParsedImportRow {
    const inferredRole =
      allowedRoles.length === 1 ? allowedRoles[0] : this.cell(row, columnMap.role).toUpperCase();

    return {
      name: this.cell(row, columnMap.name),
      role: inferredRole,
      email: this.cell(row, columnMap.email),
      password: this.cell(row, columnMap.password),
      admissionNumber: this.cell(row, columnMap.admissionNumber),
      grade: this.cell(row, columnMap.grade),
      studentClass: this.cell(row, columnMap.studentClass),
      stream: this.cell(row, columnMap.stream),
      pathway: this.cell(row, columnMap.pathway),
      parentName: this.cell(row, columnMap.parentName),
      parentPhone: this.cell(row, columnMap.parentPhone),
      parentEmail: this.cell(row, columnMap.parentEmail),
      subject: this.cell(row, columnMap.subject),
      assignedClass: this.cell(row, columnMap.assignedClass),
    };
  }

  private findDuplicateField(
    raw: ParsedImportRow,
    existingStudentAdmissions: Set<string>,
    existingTeacherEmails: Set<string>,
    seenStudentAdmissions: Set<string>,
    seenTeacherEmails: Set<string>,
  ) {
    if (raw.role === Role.STUDENT && raw.admissionNumber) {
      if (existingStudentAdmissions.has(raw.admissionNumber) || seenStudentAdmissions.has(raw.admissionNumber)) {
        return 'admissionNumber';
      }
    }

    if (raw.role === Role.TEACHER && raw.email) {
      const normalizedEmail = raw.email.toLowerCase();
      if (existingTeacherEmails.has(normalizedEmail) || seenTeacherEmails.has(normalizedEmail)) {
        return 'email';
      }
    }

    return undefined;
  }

  private validationErrorDetail(errors: Awaited<ReturnType<typeof validate>>) {
    const messages: string[] = [];
    let firstField: string | undefined;

    for (const error of errors) {
      if (!firstField) firstField = error.property;
      const constraints = Object.values(error.constraints ?? {});
      if (constraints.length > 0) messages.push(...constraints);
    }

    return {
      field: firstField,
      message: messages.join(' | ') || 'Invalid row',
    };
  }

  private createRowError(row: number, name: string | undefined, field: string | undefined, message: string) {
    const error = new Error(message) as Error & ImportErrorDetail;
    error.row = row;
    error.name = name ?? 'Unknown row';
    error.field = field;
    return error;
  }

  private normalizeError(
    err: unknown,
    row: number,
    name: string | undefined,
    role: string,
  ): ImportErrorDetail {
    if (err instanceof Error && 'row' in err) {
      return {
        row: typeof (err as { row?: unknown }).row === 'number' ? (err as { row: number }).row : row,
        name,
        field: typeof (err as { field?: unknown }).field === 'string' ? (err as { field?: string }).field : undefined,
        message: err.message,
      };
    }

    const message = err instanceof Error ? err.message : 'Unknown error';
    return {
      row,
      name,
      field: this.inferErrorField(message, role),
      message,
    };
  }

  private inferErrorField(message: string, role: string) {
    const normalized = message.toLowerCase();
    if (normalized.includes('admission number')) return 'admissionNumber';
    if (normalized.includes('email')) return 'email';
    if (normalized.includes('password')) return 'password';
    if (normalized.includes('grade')) return 'grade';
    if (normalized.includes('parent phone')) return 'parentPhone';
    if (normalized.includes('subject') && role === Role.TEACHER) return 'subject';
    if (normalized.includes('class') && role === Role.TEACHER) return 'assignedClass';
    if (normalized.includes('role')) return 'role';
    if (normalized.includes('name')) return 'name';
    return undefined;
  }

  private isDuplicateError(message: string) {
    const normalized = message.toLowerCase();
    return normalized.includes('already in use') || normalized.includes('already exists');
  }

  private isMissingRequiredField(message: string) {
    const normalized = message.toLowerCase();
    return normalized.includes('should not be empty') || normalized.includes('must be longer than or equal to');
  }

  private mapColumns(headerRow: ExcelJS.Row, aliases: Record<string, string[]>): ColumnMap {
    const map: ColumnMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = (cell.value ?? '').toString().trim().toLowerCase();
      for (const [field, knownAliases] of Object.entries(aliases)) {
        if (knownAliases.includes(value)) {
          map[field] = colNumber;
        }
      }
    });
    return map;
  }

  private cell(row: ExcelJS.Row, colNumber?: number): string {
    if (!colNumber) return '';
    const value = row.getCell(colNumber).value;
    if (value === null || value === undefined) return '';
    if (typeof value === 'object' && value !== null && 'text' in (value as any)) {
      const obj = value as { text?: string };
      return obj.text ? obj.text.toString().trim() : '';
    }
    return value.toString().trim();
  }

  private isRowEmpty(row: ExcelJS.Row): boolean {
    let empty = true;
    row.eachCell({ includeEmpty: false }, (cell) => {
      if (cell.value !== null && cell.value !== undefined && cell.value.toString().trim() !== '') {
        empty = false;
      }
    });
    return empty;
  }

  private generateTempPassword(): string {
    return `${crypto.randomBytes(9).toString('base64url')}Aa1!`;
  }
}
