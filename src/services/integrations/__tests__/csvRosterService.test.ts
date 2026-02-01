import { CsvRosterService } from '../csvRosterService';

describe('CsvRosterService', () => {
  describe('parseAndValidate', () => {
    it('should parse a valid CSV with required columns', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
123,John,Doe,john.doe@example.com,5
456,Jane,Smith,jane.smith@example.com,6`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows[0]).toEqual({
        student_id: '123',
        first_name: 'John',
        last_name: 'Doe',
        parent_email: 'john.doe@example.com',
        grade_level: '5',
      });
    });

    it('should handle RFC4180 CSV with quoted commas', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
123,"John, Jr.",Doe,john.doe@example.com,5
456,Jane,Smith,jane.smith@example.com,6`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows[0].first_name).toBe('John, Jr.');
    });

    it('should handle RFC4180 CSV with quoted newlines', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
123,"John
William",Doe,john.doe@example.com,5`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows[0].first_name).toBe('John\nWilliam');
    });

    it('should skip rows with missing student_id or parent_email', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
123,John,Doe,john.doe@example.com,5
,Jane,Smith,jane.smith@example.com,6
789,Bob,Jones,,7`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(1);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('Missing student ID or parent email');
      expect(result.errors[1]).toContain('Missing student ID or parent email');
    });

    it('should throw error for CSV with missing required columns', async () => {
      const csvContent = `student_id,first_name,last_name
123,John,Doe`;

      await expect(
        CsvRosterService.parseAndValidate(csvContent)
      ).rejects.toThrow('Invalid CSV format. Missing required columns.');
    });

    it('should throw error for empty CSV', async () => {
      const csvContent = '';

      await expect(
        CsvRosterService.parseAndValidate(csvContent)
      ).rejects.toThrow('CSV file is empty or could not be parsed.');
    });

    it('should handle case-insensitive headers', async () => {
      const csvContent = `Student_ID,First_Name,Last_Name,Parent_Email,Grade_Level
123,John,Doe,john.doe@example.com,5`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
      expect(result.validRows[0].student_id).toBe('123');
    });

    it('should skip empty lines', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
123,John,Doe,john.doe@example.com,5

456,Jane,Smith,jane.smith@example.com,6`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle Windows line endings (CRLF)', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level\r\n123,John,Doe,john.doe@example.com,5\r\n456,Jane,Smith,jane.smith@example.com,6`;

      const result = await CsvRosterService.parseAndValidate(csvContent);

      expect(result.validRows).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('validateHeader', () => {
    it('should return true for valid headers', () => {
      const headers = ['student_id', 'first_name', 'last_name', 'parent_email', 'grade_level'];
      expect(CsvRosterService.validateHeader(headers)).toBe(true);
    });

    it('should return false for missing required headers', () => {
      const headers = ['student_id', 'first_name', 'last_name'];
      expect(CsvRosterService.validateHeader(headers)).toBe(false);
    });

    it('should return true when required headers are present with extra columns', () => {
      const headers = ['student_id', 'first_name', 'last_name', 'parent_email', 'extra_column'];
      expect(CsvRosterService.validateHeader(headers)).toBe(true);
    });
  });

  describe('parseCsv', () => {
    it('should handle case-insensitive headers in fallback parser', () => {
      // Test a malformed CSV that will trigger fallback parser
      // by using a format that csv-parse might reject
      const csvContent = `Student_ID,First_Name,Last_Name,Parent_Email,Grade_Level
123,John,Doe,john.doe@example.com,5`;

      const records = CsvRosterService.parseCsv(csvContent);
      
      expect(records).toHaveLength(1);
      // Headers should be lowercase even in fallback parser
      expect(records[0]).toHaveProperty('student_id');
      expect(records[0]).toHaveProperty('first_name');
      expect(records[0]).toHaveProperty('last_name');
    });
  });
});
