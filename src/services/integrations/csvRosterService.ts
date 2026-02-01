/**
 * Handles manual roster ingestion for schools without automated SIS.
 * Validates schema conformity before processing.
 * Uses RFC4180-compliant CSV parser to match backend behavior.
 */

import { parse } from 'csv-parse/sync';

export interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  parent_email: string;
  grade_level: string;
}

interface ParsedRecord extends Record<string, string> {
  __lineNumber?: number;
}

export const CsvRosterService = {
  validateHeader(header: string[]): boolean {
    const required = ['student_id', 'first_name', 'last_name', 'parent_email'];
    return required.every((field) => header.includes(field));
  },

  /**
   * Parse CSV content using RFC4180-compliant parser.
   * Matches backend parsing logic in nhost/functions/sis-roster-import.js
   */
  parseCsv(text: string): ParsedRecord[] {
    if (!text) return [];
    
    try {
      // Use proper RFC4180 CSV parser to handle quoted commas, newlines, etc.
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
      }) as ParsedRecord[];
      
      // Attach line numbers for error reporting (1-based + header row)
      return records.map((r, idx) => ({ ...r, __lineNumber: idx + 2 }));
    } catch (err) {
      // Log parsing error for diagnostics
      console.error('CSV parsing failed:', {
        error: err instanceof Error ? err.message : String(err),
        textLength: text.length,
        preview: text.length > 200 ? text.substring(0, 200) + '...' : text
      });
      
      // Fallback: simple split parsing for basic CSVs (matches backend fallback)
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return [];
      
      const headers = lines[0].split(',').map((h) => h.trim());
      return lines
        .slice(1)
        .map((line, idx) => ({ line, originalLineNumber: idx + 2 }))
        .filter(({ line }) => line)
        .map(({ line, originalLineNumber }) => {
          const values = line.split(',').map((v) => v.trim().replace(/^"|"$/g, ''));
          const record: ParsedRecord = headers.reduce((acc, header, idx) => {
            acc[header] = values[idx] ?? '';
            return acc;
          }, {} as ParsedRecord);
          record.__lineNumber = originalLineNumber;
          return record;
        });
    }
  },

  async parseAndValidate(
    fileContent: string
  ): Promise<{ validRows: RosterRow[]; errors: string[] }> {
    const records = this.parseCsv(fileContent);
    
    if (records.length === 0) {
      throw new Error('CSV file is empty or could not be parsed.');
    }

    // Normalize header to lowercase for validation
    const firstRecord = records[0];
    const headers = Object.keys(firstRecord)
      .filter((key) => key !== '__lineNumber')
      .map((key) => key.toLowerCase());

    if (!this.validateHeader(headers)) {
      throw new Error('Invalid CSV format. Missing required columns.');
    }

    const validRows: RosterRow[] = [];
    const errors: string[] = [];

    for (const record of records) {
      const lineNumber = record.__lineNumber ?? 'unknown';
      
      // Normalize keys to lowercase for consistent access
      const normalizedRecord: Record<string, string> = {};
      Object.keys(record).forEach((key) => {
        if (key !== '__lineNumber') {
          normalizedRecord[key.toLowerCase()] = record[key];
        }
      });

      if (!normalizedRecord.student_id || !normalizedRecord.parent_email) {
        errors.push(`Row ${lineNumber}: Missing student ID or parent email.`);
        continue;
      }

      validRows.push({
        student_id: normalizedRecord.student_id,
        first_name: normalizedRecord.first_name || '',
        last_name: normalizedRecord.last_name || '',
        parent_email: normalizedRecord.parent_email,
        grade_level: normalizedRecord.grade_level || '',
      });
    }

    return { validRows, errors };
  }
};
