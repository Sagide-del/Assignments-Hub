import { Injectable } from '@nestjs/common';
import * as ExcelJS from 'exceljs';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as crypto from 'crypto';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { Role } from '../common/enums/role.enum';

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

const HEADER_ALIASES: Record<string, string[]> = {
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

type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

interface ParsedImportRow {
  name: string;
  role: string;
  email: string;
  password: string;
  admissionNumber: string;
  grade: string;
  parentPhone: string;
  subject: string;
  assignedClass: string;
}

interface ImportProcessResult {
  createdStudents: number;
  createdTeachers: number;
  errors: ImportErrorDetail[];
  duplicates: number;
  generatedPasswords: TeacherGeneratedPassword[];
  legacyResults: ImportRowResult[];
}

@Injectable()
export class UsersImportService {
  constructor(private readonly usersService: UsersService) {}

  async importFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<ImportSummary> {
    const result = await this.processWorkbook(buffer, actor, [Role.STUDENT, Role.TEACHER]);
    return {
      totalRows: result.legacyResults.length,
      created: result.createdStudents + result.createdTeachers,
      failed: result.errors.length,
      results: result.legacyResults,
    };
  }

  async importStudentsFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<StudentImportResponse> {
    const result = await this.processWorkbook(buffer, actor, [Role.STUDENT]);
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
    const result = await this.processWorkbook(buffer, actor, [Role.TEACHER]);
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

  private async processWorkbook(
    buffer: Buffer,
    actor: AuthenticatedUser,
    allowedRoles: Array<Role.STUDENT | Role.TEACHER>,
  ): Promise<ImportProcessResult> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return {
        createdStudents: 0,
        createdTeachers: 0,
        errors: [],
        duplicates: 0,
        generatedPasswords: [],
        legacyResults: [],
      };
    }

    const columnMap = this.mapColumns(sheet.getRow(1));
    const errors: ImportErrorDetail[] = [];
    const generatedPasswords: TeacherGeneratedPassword[] = [];
    const legacyResults: ImportRowResult[] = [];
    let createdStudents = 0;
    let createdTeachers = 0;
    let duplicates = 0;

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (this.isRowEmpty(row)) continue;

      const raw = this.readRow(row, columnMap);
      let generatedPassword: string | undefined;

      try {
        if (raw.role !== Role.TEACHER && raw.role !== Role.STUDENT) {
          throw this.createRowError(rowNumber, raw.name || undefined, 'role', 'Role must be "TEACHER" or "STUDENT"');
        }

        if (!allowedRoles.includes(raw.role as Role.STUDENT | Role.TEACHER)) {
          throw this.createRowError(
            rowNumber,
            raw.name || undefined,
            'role',
            allowedRoles[0] === Role.STUDENT
              ? 'This endpoint only accepts student rows'
              : 'This endpoint only accepts teacher rows',
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
          parentPhone: raw.parentPhone || undefined,
          subject: raw.subject || undefined,
          assignedClass: raw.assignedClass || undefined,
        });

        const validationErrors = await validate(dto, { whitelist: true });
        if (validationErrors.length > 0) {
          const detail = this.validationErrorDetail(validationErrors);
          throw this.createRowError(rowNumber, raw.name || undefined, detail.field, detail.message);
        }

        await this.usersService.create(dto, actor);

        if (raw.role === Role.STUDENT) createdStudents++;
        if (raw.role === Role.TEACHER) createdTeachers++;

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
      createdStudents,
      createdTeachers,
      errors,
      duplicates,
      generatedPasswords,
      legacyResults,
    };
  }

  private readRow(row: ExcelJS.Row, columnMap: ColumnMap): ParsedImportRow {
    return {
      name: this.cell(row, columnMap.name),
      role: this.cell(row, columnMap.role).toUpperCase(),
      email: this.cell(row, columnMap.email),
      password: this.cell(row, columnMap.password),
      admissionNumber: this.cell(row, columnMap.admissionNumber),
      grade: this.cell(row, columnMap.grade),
      parentPhone: this.cell(row, columnMap.parentPhone),
      subject: this.cell(row, columnMap.subject),
      assignedClass: this.cell(row, columnMap.assignedClass),
    };
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
    error.name = name;
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

  private mapColumns(headerRow: ExcelJS.Row): ColumnMap {
    const map: ColumnMap = {};
    headerRow.eachCell((cell, colNumber) => {
      const value = (cell.value ?? '').toString().trim().toLowerCase();
      for (const [field, aliases] of Object.entries(HEADER_ALIASES)) {
        if (aliases.includes(value)) {
          map[field as keyof typeof HEADER_ALIASES] = colNumber;
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
      const obj = value as any;
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
