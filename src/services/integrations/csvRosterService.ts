/**
 * Handles manual roster ingestion for schools without automated SIS.
 * Validates schema conformity before processing.
 * Supports both custom field names and OneRoster standard field names.
 */

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
}

export const CsvRosterService = {
  /**
   * Validates that the CSV header contains at least one field from each required field group.
   * For 'users' roster type, supports both custom and OneRoster field names.
   * 
   * @param header - Lowercase CSV header fields
   * @param rosterType - Type of roster ('users', 'classes', 'enrollments', etc.)
   */
  validateHeader(header: string[], rosterType: string = 'users'): boolean {
    // For 'users' roster type, require external ID and email fields
    if (rosterType === 'users') {
      const hasExternalId = FIELD_ALIASES.externalId.some((field) => header.indexOf(field) !== -1);
      const hasEmail = FIELD_ALIASES.email.some((field) => header.indexOf(field) !== -1);
      return hasExternalId && hasEmail;
    }
    
    // For other roster types, delegate validation to backend
    return true;
  },

  /**
   * Parses and validates CSV content, supporting both custom and OneRoster field names.
   * 
   * @param fileContent - Raw CSV file content
   * @param rosterType - Type of roster ('users', 'classes', 'enrollments', etc.)
   */
  async parseAndValidate(
    fileContent: string,
    rosterType: string = 'users'
  ): Promise<{ validRows: RosterRow[]; errors: string[] }> {
    const lines = fileContent.split('\n');
    const header = lines[0].split(',').map((value) => value.trim().toLowerCase());

    if (!this.validateHeader(header, rosterType)) {
      throw new Error(
        'Invalid CSV format. Missing required columns. ' +
        'For student rosters, provide either sourcedId/student_id and email/parent_email.'
      );
    }

    const validRows: RosterRow[] = [];
    const errors: string[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const row = lines[i].split(',').map((value) => value.trim());
      if (row.length < header.length) {
        continue;
      }

      const rowData: Record<string, string> = {};
      header.forEach((key, index) => {
        rowData[key] = row[index];
      });

      // Resolve external ID and email using field aliases
      const externalId = resolveField(rowData, FIELD_ALIASES.externalId);
      const email = resolveField(rowData, FIELD_ALIASES.email);

      if (!externalId || !email) {
        errors.push(`Row ${i + 1}: Missing student ID or email.`);
        continue;
      }

      validRows.push(rowData as any as RosterRow);
    }

    return { validRows, errors };
  }
};
