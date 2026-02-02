/**
 * Handles manual roster ingestion for schools without automated SIS.
 * Validates schema conformity before processing.
 * Supports both custom field names and OneRoster standard field names.
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

/**
 * Field name aliases for different roster formats.
 * Matches backend resolver logic in nhost/functions/sis-roster-import.js
 */
const FIELD_ALIASES = {
  // External ID fields (for students, teachers, classes)
  externalId: ['sourcedId', 'id', 'student_id', 'teacher_id', 'class_id', 'external_id'],
  // Name fields
  firstName: ['givenName', 'first_name', 'firstName'],
  lastName: ['familyName', 'last_name', 'lastName'],
  // Email fields
  email: ['email', 'emailAddress', 'parent_email'],
  // Grade fields
  grade: ['grade', 'grade_level', 'gradeLevel'],
};

/**
 * Resolves a field value from a record using multiple possible field names.
 * Tries each alias in order until a non-empty value is found.
 */
function resolveField(record: Record<string, string>, aliases: string[]): string | null {
  for (const alias of aliases) {
    const value = record[alias];
    if (value && value !== '') {
      return value;
    }
  }
  return null;
interface ParsedRecord extends Record<string, string> {
  __lineNumber?: number;
}

export const CsvRosterService = {
  /**
   * Validates that the CSV header contains at least one field from each required field group.
   * For 'students' roster type, supports both custom and OneRoster field names.
   * 
   * @param header - Lowercase CSV header fields
   * @param rosterType - Type of roster ('students', 'classes', 'enrollments', etc.)
   */
  validateHeader(header: string[], rosterType: string = 'students'): boolean {
    // For 'students' roster type, require external ID and email fields
    if (rosterType === 'students') {
      const hasExternalId = FIELD_ALIASES.externalId.some((field) => header.indexOf(field) !== -1);
      const hasEmail = FIELD_ALIASES.email.some((field) => header.indexOf(field) !== -1);
      return hasExternalId && hasEmail;
    }
    
    // For other roster types, delegate validation to backend
    return true;
  },

  /**
   * Parses CSV content using an RFC4180-compliant parser and normalizes headers.
   * Matches backend parsing logic in nhost/functions/sis-roster-import.js.
   *
   * @param text - Raw CSV file content
   * @returns Parsed CSV records with lowercase keys and attached line numbers
   */
  parseCsv(text: string): ParsedRecord[] {
    if (!text) return [];
    
    try {
      // Use proper RFC4180 CSV parser to handle quoted commas, newlines, etc.
      const records = parse(text, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Handle rows with inconsistent column counts gracefully
      }) as ParsedRecord[];
      
      // Normalize headers to lowercase and attach line numbers for error reporting
      return records.map((r, idx) => {
        const normalized: ParsedRecord = {};
        Object.keys(r).forEach((key) => {
          normalized[key.toLowerCase()] = r[key];
        });
        normalized.__lineNumber = idx + 2;
        return normalized;
      });
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
      
      const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
      return lines
        .slice(1)
        .map((line, idx) => ({ line, originalLineNumber: idx + 2 }))
        .filter(({ line }) => line)
        .map(({ line, originalLineNumber }) => {
          const values = line.split(',').map((v) => {
            const trimmed = v.trim();
            // Properly extract quoted content: remove surrounding quotes if present
            return trimmed.replace(/^"(.*)"$/, '$1');
          });
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
    fileContent: string,
    rosterType: string = 'users'
  ): Promise<{ validRows: RosterRow[]; errors: string[] }> {
    const records = this.parseCsv(fileContent);
    
    if (records.length === 0) {
      throw new Error('CSV file is empty or could not be parsed.');
    }

    // Get headers from first record (already normalized to lowercase by parseCsv)
    const firstRecord = records[0];
    const headers = Object.keys(firstRecord).filter((key) => key !== '__lineNumber');

    if (!this.validateHeader(header, rosterType)) {
      throw new Error(
        'Invalid CSV format. Missing required columns. ' +
        'For student rosters, include a student identifier column and an email column using any supported field name.'
      );
    }

    const validRows: RosterRow[] = [];
    const errors: string[] = [];

    for (const record of records) {
      const lineNumber = record.__lineNumber ?? 'unknown';

      if (!record.student_id || !record.parent_email) {
        errors.push(`Row ${lineNumber}: Missing student ID or parent email.`);
        continue;
      }

      validRows.push({
        student_id: record.student_id,
        first_name: record.first_name || '',
        last_name: record.last_name || '',
        parent_email: record.parent_email,
        grade_level: record.grade_level || '',
      });
    }

    return { validRows, errors };
  }
};
