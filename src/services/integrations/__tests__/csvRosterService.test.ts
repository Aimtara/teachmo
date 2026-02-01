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

      // Row 3 should be skipped due to fewer columns than headers
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
    });
  });
});
