/**
 * Handles manual roster ingestion for schools without automated SIS.
 * Validates schema conformity before processing.
 */

export interface RosterRow {
  student_id: string;
  first_name: string;
  last_name: string;
  parent_email: string;
  grade_level: string;
}

export const CsvRosterService = {
  validateHeader(header: string[]): boolean {
    const required = ['student_id', 'first_name', 'last_name', 'parent_email'];
    return required.every((field) => header.includes(field));
  },

  async parseAndValidate(
    fileContent: string
  ): Promise<{ validRows: RosterRow[]; errors: string[] }> {
    const lines = fileContent.split('\n');
    const header = lines[0].split(',').map((value) => value.trim().toLowerCase());

    if (!this.validateHeader(header)) {
      throw new Error('Invalid CSV format. Missing required columns.');
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

      if (!rowData.student_id || !rowData.parent_email) {
        errors.push(`Row ${i + 1}: Missing student ID or parent email.`);
        continue;
      }

      validRows.push(rowData as RosterRow);
    }

    return { validRows, errors };
  }
};
