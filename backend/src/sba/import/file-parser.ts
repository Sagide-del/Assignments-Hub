import { BadRequestException } from "@nestjs/common";
import ExcelJS from "exceljs";
export const HEADERS = [
  "Admission Number",
  "Student Name",
  "Subject",
  "Grade Level",
  "Term",
  "Score",
];
export const MAX_ROWS = 2000;
export function csvRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [],
    cell = "",
    quoted = false,
    closed = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
          closed = true;
        }
      } else cell += c;
    } else if (c === "," || c === "\n" || c === "\r") {
      row.push(cell);
      cell = "";
      closed = false;
      if (c !== ",") {
        if (c === "\r" && text[i + 1] === "\n") i++;
        rows.push(row);
        row = [];
        if (rows.length > MAX_ROWS + 1)
          throw new BadRequestException("Maximum 2,000 rows per upload.");
      }
    } else if (c === '"' && cell === "" && !closed) quoted = true;
    else {
      if (closed || c === '"')
        throw new BadRequestException("Malformed CSV quoting.");
      cell += c;
    }
  }
  if (quoted) throw new BadRequestException("Unclosed CSV quotation.");
  if (cell || row.length) {
    row.push(cell);
    rows.push(row);
  }
  if (rows.length > MAX_ROWS + 1)
    throw new BadRequestException("Maximum 2,000 rows per upload.");
  return rows;
}
// Inspect the ZIP central directory before ExcelJS expands a workbook.
export function validateWorkbookZip(buffer: Buffer) {
  let end = -1;
  for (let i = buffer.length - 22; i >= Math.max(0, buffer.length - 65557); i--)
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      end = i;
      break;
    }
  if (end < 0) throw new BadRequestException("Invalid Excel workbook.");
  const count = buffer.readUInt16LE(end + 10),
    offset = buffer.readUInt32LE(end + 16);
  if (count > 500 || count === 65535 || offset >= end)
    throw new BadRequestException("Workbook archive is too complex.");
  let p = offset,
    expanded = 0;
  for (let n = 0; n < count; n++) {
    if (p + 46 > end || buffer.readUInt32LE(p) !== 0x02014b50)
      throw new BadRequestException("Invalid workbook archive.");
    if (buffer.readUInt16LE(p + 8) & 1)
      throw new BadRequestException("Encrypted workbooks are unsupported.");
    expanded += buffer.readUInt32LE(p + 24);
    if (expanded > 20 * 1024 * 1024)
      throw new BadRequestException("Expanded workbook exceeds 20 MB.");
    p +=
      46 +
      buffer.readUInt16LE(p + 28) +
      buffer.readUInt16LE(p + 30) +
      buffer.readUInt16LE(p + 32);
  }
}
export async function parseFile(file: Express.Multer.File) {
  if (!file?.buffer?.length)
    throw new BadRequestException("Choose a CSV or XLSX file.");
  if (file.buffer.length > 5 * 1024 * 1024)
    throw new BadRequestException("Maximum upload size is 5 MB.");
  let rows: string[][];
  if (/\.csv$/i.test(file.originalname))
    rows = csvRows(file.buffer.toString("utf8"));
  else if (/\.xlsx$/i.test(file.originalname)) {
    validateWorkbookZip(file.buffer);
    const book = new ExcelJS.Workbook();
    try {
      await book.xlsx.load(file.buffer as any);
    } catch {
      throw new BadRequestException(
        "Cannot read workbook. Save as a standard XLSX file.",
      );
    }
    if (book.worksheets.length !== 1)
      throw new BadRequestException("Use one worksheet per upload.");
    const sheet = book.worksheets[0];
    if (sheet.rowCount > MAX_ROWS + 1 || sheet.columnCount > 6)
      throw new BadRequestException(
        "Use six columns and no more than 2,000 rows.",
      );
    rows = [];
    sheet.eachRow({ includeEmpty: true }, (row) => {
      const values: string[] = [];
      for (let i = 1; i <= 6; i++) {
        const c = row.getCell(i);
        if (c.type === ExcelJS.ValueType.Formula)
          throw new BadRequestException(
            "Replace spreadsheet formulas with values before uploading.",
          );
        values.push(c.text);
      }
      rows.push(values);
    });
  } else
    throw new BadRequestException("Only CSV and XLSX files are supported.");
  if (
    !rows.length ||
    rows[0].length !== 6 ||
    !HEADERS.every(
      (h, i) => rows[0][i].trim().toLowerCase() === h.toLowerCase(),
    )
  )
    throw new BadRequestException("Headers must be: " + HEADERS.join(", "));
  return rows
    .slice(1)
    .map((values, i) => ({ row: i + 2, values }))
    .filter((r) => r.values.some((v) => v.trim() !== ""));
}
