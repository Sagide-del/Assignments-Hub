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
  /** Only set for TEACHER rows that didn't supply a password. Share this
   * with the teacher once, out of band — it's not stored anywhere. */
  generatedPassword?: string;
}

export interface ImportSummary {
  totalRows: number;
  created: number;
  failed: number;
  results: ImportRowResult[];
}

// Accepted header spellings, matched case-insensitively. Extra/unknown
// columns in the sheet are ignored.
const HEADER_ALIASES: Record<string, string[]> = {
  name: ['name', 'full name', 'student name', 'teacher name'],
  role: ['role', 'type'],
  email: ['email', 'e-mail'],
  password: ['password', 'temp password', 'temporary password'],
  admissionNumber: ['admission number', 'admission no', 'admission_number', 'adm no', 'admno'],
  // Student grade/form only — deliberately does NOT alias "class", since that
  // header is reserved for a teacher's assigned class below. One sheet can
  // contain both TEACHER and STUDENT rows, so the two need distinct headers.
  grade: ['grade', 'form', 'student grade'],
  parentPhone: ['parent phone', 'guardian phone', 'parent contact', 'parent phone number', 'guardian phone number'],
  subject: ['subject', 'teaching subject'],
  assignedClass: ['assigned class', 'class', 'teaching class', 'class taught'],
};

type ColumnMap = Partial<Record<keyof typeof HEADER_ALIASES, number>>;

/**
 * Bulk-imports teachers and students from an .xlsx spreadsheet uploaded by
 * a School Admin. Delegates the actual create to UsersService.create() so
 * every row goes through the same tenant scoping, role permission checks,
 * and duplicate-detection as a manual "Add user" — this is purely a
 * spreadsheet-to-DTO adapter that keeps processing on a per-row basis so
 * one bad row doesn't abort the whole file.
 */
@Injectable()
export class UsersImportService {
  constructor(private readonly usersService: UsersService) {}

  async importFromExcel(buffer: Buffer, actor: AuthenticatedUser): Promise<ImportSummary> {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as any);
    const sheet = workbook.worksheets[0];

    if (!sheet) {
      return { totalRows: 0, created: 0, failed: 0, results: [] };
    }

    const columnMap = this.mapColumns(sheet.getRow(1));
    const results: ImportRowResult[] = [];
    let created = 0;
    let failed = 0;

    for (let rowNumber = 2; rowNumber <= sheet.rowCount; rowNumber++) {
      const row = sheet.getRow(rowNumber);
      if (this.isRowEmpty(row)) continue;

      const raw = {
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

      let generatedPassword: string | undefined;

      try {
        if (raw.role !== Role.TEACHER && raw.role !== Role.STUDENT) {
          throw new Error('Role must be "TEACHER" or "STUDENT"');
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

        const errors = await validate(dto, { whitelist: true });
        if (errors.length > 0) {
          const message = errors
            .map((e) => Object.values(e.constraints ?? {}).join('; '))
            .join(' | ');
          throw new Error(message || 'Invalid row');
        }

        await this.usersService.create(dto, actor);
        created++;
        results.push({
          row: rowNumber,
          name: raw.name,
          role: raw.role,
          status: 'created',
          generatedPassword,
        });
      } catch (err) {
        failed++;
        results.push({
          row: rowNumber,
          name: raw.name || undefined,
          role: raw.role || undefined,
          status: 'error',
          message: err instanceof Error ? err.message : 'Unknown error',
        });
      }
    }

    return { totalRows: results.length, created, failed, results };
  }

  /** Generates a blank .xlsx admins can fill in and re-upload. */
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
      'Parent Phone (students only) enables SMS notifications — use international format, e.g. +254712345678.';

    return workbook.xlsx.writeBuffer();
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