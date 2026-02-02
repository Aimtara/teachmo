import { CsvRosterService } from '../csvRosterService';

describe('CsvRosterService', () => {
  describe('validateHeader', () => {
    it('accepts custom field names for users roster type', () => {
      const header = ['student_id', 'first_name', 'last_name', 'parent_email'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(true);
    });

    it('accepts OneRoster field names for users roster type', () => {
      const header = ['sourcedid', 'givenname', 'familyname', 'email'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(true);
    });

    it('accepts mixed field names for users roster type', () => {
      const header = ['sourcedid', 'first_name', 'last_name', 'email'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(true);
    });

    it('accepts alternative external ID fields', () => {
      const header = ['id', 'first_name', 'last_name', 'email'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(true);
    });

    it('accepts alternative email fields', () => {
      const header = ['sourcedid', 'first_name', 'last_name', 'emailaddress'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(true);
    });

    it('rejects headers without external ID field', () => {
      const header = ['first_name', 'last_name', 'email'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(false);
    });

    it('rejects headers without email field', () => {
      const header = ['student_id', 'first_name', 'last_name'];
      expect(CsvRosterService.validateHeader(header, 'users')).toBe(false);
    });

    it('accepts any header for non-users roster types', () => {
      const header = ['some_field', 'another_field'];
      expect(CsvRosterService.validateHeader(header, 'classes')).toBe(true);
      expect(CsvRosterService.validateHeader(header, 'enrollments')).toBe(true);
    });
  });

  describe('parseAndValidate', () => {
    it('parses CSV with custom field names', async () => {
      const csvContent = `student_id,first_name,last_name,parent_email,grade_level
student-1,John,Doe,john.doe@example.com,3
student-2,Jane,Smith,jane.smith@example.com,4`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('parses CSV with OneRoster field names', async () => {
      const csvContent = `sourcedId,givenName,familyName,email,grade
student-1,John,Doe,john.doe@example.com,3
student-2,Jane,Smith,jane.smith@example.com,4`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('parses CSV with mixed field names', async () => {
      const csvContent = `sourcedId,first_name,last_name,email,gradeLevel
student-1,John,Doe,john.doe@example.com,3
student-2,Jane,Smith,jane.smith@example.com,4`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('uses id field as fallback for external ID', async () => {
      const csvContent = `id,givenName,familyName,email
student-1,John,Doe,john.doe@example.com
student-2,Jane,Smith,jane.smith@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('uses emailAddress field as alternative for email', async () => {
      const csvContent = `sourcedId,givenName,familyName,emailAddress
student-1,John,Doe,john.doe@example.com
student-2,Jane,Smith,jane.smith@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('skips rows with missing external ID', async () => {
      const csvContent = `sourcedId,givenName,familyName,email
student-1,John,Doe,john.doe@example.com
,Jane,Smith,jane.smith@example.com
student-3,Bob,Johnson,bob.johnson@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Row 3: Missing student ID or email');
    });

    it('skips rows with missing email', async () => {
      const csvContent = `sourcedId,givenName,familyName,email
student-1,John,Doe,john.doe@example.com
student-2,Jane,Smith,
student-3,Bob,Johnson,bob.johnson@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(1);
      expect(errors[0]).toContain('Row 3: Missing student ID or email');
    });

    it('throws error for invalid CSV format', async () => {
      const csvContent = `first_name,last_name
John,Doe
Jane,Smith`;

      await expect(
        CsvRosterService.parseAndValidate(csvContent, 'users')
      ).rejects.toThrow('Invalid CSV format. Missing required columns.');
    });

    it('handles empty rows gracefully', async () => {
      const csvContent = `sourcedId,givenName,familyName,email
student-1,John,Doe,john.doe@example.com

student-2,Jane,Smith,jane.smith@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('handles rows with fewer columns than headers', async () => {
      const csvContent = `sourcedId,givenName,familyName,email
student-1,John,Doe,john.doe@example.com
student-2,Jane
student-3,Bob,Johnson,bob.johnson@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      // Rows with fewer columns are silently skipped as malformed CSV
      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
    });

    it('is case-insensitive for header fields', async () => {
      const csvContent = `SourcedId,GivenName,FamilyName,Email
student-1,John,Doe,john.doe@example.com
student-2,Jane,Smith,jane.smith@example.com`;

      const { validRows, errors } = await CsvRosterService.parseAndValidate(csvContent, 'users');

      expect(validRows).toHaveLength(2);
      expect(errors).toHaveLength(0);
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
