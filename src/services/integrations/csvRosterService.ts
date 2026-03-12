/**
 * Handles manual roster ingestion for schools without automated SIS.
 * Validates schema conformity before processing.
 */
import { z } from 'zod';

const rosterRowSchema = z.object({
  student_id: z.string().min(1),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  parent_email: z.string().email(),
  grade_level: z.string().optional().default(''),
});

export type RosterRow = z.infer<typeof rosterRowSchema>;

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
        rowData[key] = row[index] ?? '';
      });

      const parsed = rosterRowSchema.safeParse(rowData);
      if (!parsed.success) {
        const reasons = parsed.error.issues
          .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
          .join('; ');
        errors.push(`Row ${i + 1}: Invalid row data – ${reasons}`);
        continue;
      }

      validRows.push(parsed.data);
    }

    return { validRows, errors };
  }
};
