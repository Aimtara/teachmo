import sisRosterImport from '../sis-roster-import.js';
import { hasuraRequest } from '../lib/hasura.js';

jest.mock('../lib/hasura.js', () => ({
  hasuraRequest: jest.fn(),
}));

describe('sis-roster-import', () => {
  let req, res;

  beforeEach(() => {
    req = {
      method: 'POST',
      headers: {
        'x-hasura-role': 'district_admin',
        'x-hasura-user-id': 'user-123',
        'x-hasura-organization-id': 'org-456',
        'x-hasura-school-id': 'school-789',
      },
      body: {},
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    hasuraRequest.mockReset();
  });

  describe('validation logic for missing external IDs', () => {
    test('skips student rows with missing external IDs and tracks errors', async () => {
      // Mock createImportJob to return a job ID
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-123' } })
        // Mock the insert mutation for valid records
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 2 } })
        // Mock updateImportJob
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-123' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe', grade: '3' },
          { first_name: 'Jane', last_name: 'Smith', grade: '4' }, // Missing ID
          { id: 'student-2', first_name: 'Bob', last_name: 'Johnson', grade: '5' },
          { external_id: '', first_name: 'Alice', last_name: 'Brown', grade: '6' }, // Empty ID
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 2,
          skipped: 2,
          jobId: 'job-123',
          warnings: expect.arrayContaining([
            'Row 3: Missing student ID',
            'Row 5: Missing student ID',
          ]),
        })
      );

      // Verify that updateImportJob was called with correct metadata
      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      expect(updateCall).toBeTruthy();
      expect(updateCall[0].variables.changes.metadata).toMatchObject({
        record_count: 4,
        inserted_count: 2,
        skipped_count: 2,
        errors: expect.arrayContaining([
          'Row 3: Missing student ID',
          'Row 5: Missing student ID',
        ]),
      });
      expect(updateCall[0].variables.changes.status).toBe('completed_with_errors');
    });

    test('skips teacher rows with missing external IDs', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-456' } })
        .mockResolvedValueOnce({ insert_sis_roster_teachers: { affected_rows: 1 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-456' } });

      req.body = {
        rosterType: 'teachers',
        records: [
          { teacher_id: 'teacher-1', first_name: 'Alice', last_name: 'Williams', email: 'alice@example.com' },
          { first_name: 'Bob', last_name: 'Davis', email: 'bob@example.com' }, // Missing ID
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 1,
          skipped: 1,
          warnings: ['Row 3: Missing teacher ID'],
        })
      );
    });

    test('skips class rows with missing external IDs', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-789' } })
        .mockResolvedValueOnce({ insert_sis_roster_classes: { affected_rows: 1 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-789' } });

      req.body = {
        rosterType: 'classes',
        records: [
          { sourcedId: 'class-1', name: 'Math 101' },
          { name: 'English 101' }, // Missing ID
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 1,
          skipped: 1,
          warnings: ['Row 3: Missing class ID'],
        })
      );
    });

    test('skips enrollment rows with missing class ID or student ID', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-101' } })
        .mockResolvedValueOnce({ insert_sis_roster_enrollments: { affected_rows: 1 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-101' } });

      req.body = {
        rosterType: 'enrollments',
        records: [
          { classSourcedId: 'class-1', userSourcedId: 'student-1' },
          { classSourcedId: 'class-2' }, // Missing student ID
          { userSourcedId: 'student-2' }, // Missing class ID
          { classSourcedId: '', userSourcedId: 'student-3' }, // Empty class ID
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 1,
          skipped: 3,
          warnings: expect.arrayContaining([
            'Row 3: Missing class ID or student ID',
            'Row 4: Missing class ID or student ID',
            'Row 5: Missing class ID or student ID',
          ]),
        })
      );
    });
  });

  describe('error tracking mechanism', () => {
    test('tracks batch import errors and includes them in job metadata', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-error-1' } })
        .mockRejectedValueOnce(new Error('Database connection failed'))
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-error-1' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      
      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      expect(updateCall[0].variables.changes.metadata.errors).toContain(
        'Batch error: Database connection failed'
      );
      expect(updateCall[0].variables.changes.status).toBe('completed_with_errors');
    });

    test('limits error messages to 50 in job metadata', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-many-errors' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 0 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-many-errors' } });

      // Create 60 records with missing IDs
      const records = Array.from({ length: 60 }, (_, i) => ({
        first_name: `Student${i}`,
        last_name: 'Test',
      }));

      req.body = {
        rosterType: 'students',
        records,
      };

      await sisRosterImport(req, res);

      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      // Errors should be limited to 50
      expect(updateCall[0].variables.changes.metadata.errors).toHaveLength(50);
      expect(updateCall[0].variables.changes.status).toBe('completed_with_errors');
    });

    test('limits warning messages to 5 in API response', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-warnings-5' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 0 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-warnings-5' } });

      const records = Array.from({ length: 10 }, (_, i) => ({
        first_name: `Student${i}`,
        last_name: 'Test',
      }));

      req.body = {
        rosterType: 'students',
        records,
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      
      const response = res.json.mock.calls[0][0];
      // Warnings in response should be limited to 5
      expect(response.warnings.length).toBe(5);
      expect(response.warnings[0]).toContain('Missing student ID');
      // Total errors should reflect all errors, not just the truncated warnings
      expect(response.totalErrors).toBe(10);
    });

    test('handles updateImportJob failure gracefully', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-update-fail' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 1 } })
        .mockRejectedValueOnce(new Error('Failed to update job'));

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
        ],
      };

      await sisRosterImport(req, res);

      // Should still return success even if job update fails
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 1,
          skipped: 0,
        })
      );
      
      // Should log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to update SIS import job metadata',
        expect.objectContaining({
          jobId: 'job-update-fail',
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('job metadata accuracy', () => {
    test('accurately reflects record counts in job metadata', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-counts' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 2 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-counts' } });

      req.body = {
        rosterType: 'students',
        fileName: 'students.csv',
        fileSize: 1024,
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
          { sourcedId: 'student-2', first_name: 'Jane', last_name: 'Smith' },
          { first_name: 'Invalid', last_name: 'Student' }, // Will be skipped
          { sourcedId: 'student-3', first_name: 'Bob', last_name: 'Johnson' },
        ],
      };

      await sisRosterImport(req, res);

      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      
      expect(updateCall[0].variables.changes.metadata).toMatchObject({
        file_name: 'students.csv',
        file_size: 1024,
        record_count: 4,
        inserted_count: 2,
        skipped_count: 1,
      });
    });

    test('sets status to completed when no errors occur', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-success' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 2 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-success' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
          { sourcedId: 'student-2', first_name: 'Jane', last_name: 'Smith' },
        ],
      };

      await sisRosterImport(req, res);

      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      
      expect(updateCall[0].variables.changes.status).toBe('completed');
      expect(updateCall[0].variables.changes.metadata.errors).toEqual([]);
    });

    test('sets status to completed_with_errors when rows are skipped', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-partial' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 1 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-partial' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
          { first_name: 'Invalid', last_name: 'Student' },
        ],
      };

      await sisRosterImport(req, res);

      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      
      expect(updateCall[0].variables.changes.status).toBe('completed_with_errors');
    });

    test('includes finished_at timestamp in job metadata', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-timestamp' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 1 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-timestamp' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' },
        ],
      };

      const beforeTime = new Date().toISOString();
      await sisRosterImport(req, res);
      const afterTime = new Date().toISOString();

      const updateCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation UpdateJob')
      );
      
      const finishedAt = updateCall[0].variables.changes.finished_at;
      expect(finishedAt).toBeTruthy();
      expect(new Date(finishedAt).getTime()).toBeGreaterThanOrEqual(new Date(beforeTime).getTime());
      expect(new Date(finishedAt).getTime()).toBeLessThanOrEqual(new Date(afterTime).getTime());
    });
  });

  describe('CSV parsing with missing IDs', () => {
    test('parses CSV and skips rows with missing IDs', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-csv' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 2 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-csv' } });

      req.body = {
        rosterType: 'students',
        csvText: `sourcedId,first_name,last_name,grade
student-1,John,Doe,3
,Jane,Smith,4
student-2,Bob,Johnson,5`,
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 2,
          skipped: 1,
          warnings: ['Row 3: Missing student ID'],
        })
      );
    });
  });

  describe('resolveExternalId with multiple key options', () => {
    test('tries multiple ID field names in order', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-multi-keys' } })
        .mockResolvedValueOnce({ insert_sis_roster_students: { affected_rows: 3 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-multi-keys' } });

      req.body = {
        rosterType: 'students',
        records: [
          { sourcedId: 'student-1', first_name: 'John', last_name: 'Doe' }, // Uses sourcedId
          { id: 'student-2', first_name: 'Jane', last_name: 'Smith' }, // Uses id
          { student_id: 'student-3', first_name: 'Bob', last_name: 'Johnson' }, // Uses student_id
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 3,
          skipped: 0,
        })
      );

      // Verify that all three records were inserted with correct external_id
      const insertCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation InsertRoster')
      );
      expect(insertCall[0].variables.objects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ external_id: 'student-1' }),
          expect.objectContaining({ external_id: 'student-2' }),
          expect.objectContaining({ external_id: 'student-3' }),
        ])
      );
    });
  });

  describe('unknown roster type handling', () => {
    test('returns 400 error for unknown roster type', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-unknown' } });

      req.body = {
        rosterType: 'invalid_type',
        records: [
          { sourcedId: 'record-1', name: 'Test' },
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Unknown roster type: invalid_type',
      });

      // Job should be created but not updated (remains in processing state)
      // This is the current behavior - job is not marked as failed
      expect(hasuraRequest).toHaveBeenCalledTimes(1);
    });
  });

  describe('class records with required teacher IDs', () => {
    test('imports classes with teacher IDs when provided', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-class-teachers' } })
        .mockResolvedValueOnce({ insert_sis_roster_classes: { affected_rows: 2 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-class-teachers' } });

      req.body = {
        rosterType: 'classes',
        records: [
          { sourcedId: 'class-1', name: 'Math 101', teacherSourcedId: 'teacher-1' },
          { id: 'class-2', title: 'English 101', teacher_id: 'teacher-2' },
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      
      const insertCall = hasuraRequest.mock.calls.find((call) =>
        call[0].query.includes('mutation InsertRoster')
      );
      expect(insertCall[0].variables.objects).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ 
            external_id: 'class-1',
            name: 'Math 101',
            teacher_external_id: 'teacher-1',
          }),
          expect.objectContaining({ 
            external_id: 'class-2',
            name: 'English 101',
            teacher_external_id: 'teacher-2',
          }),
        ])
      );
    });

    test('skips classes with missing teacher IDs', async () => {
      hasuraRequest
        .mockResolvedValueOnce({ insert_sis_import_jobs_one: { id: 'job-class-no-teachers' } })
        .mockResolvedValueOnce({ insert_sis_roster_classes: { affected_rows: 0 } })
        .mockResolvedValueOnce({ update_sis_import_jobs_by_pk: { id: 'job-class-no-teachers' } });

      req.body = {
        rosterType: 'classes',
        records: [
          { sourcedId: 'class-3', name: 'Science 101' }, // Missing teacher ID
        ],
      };

      await sisRosterImport(req, res);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          ok: true,
          inserted: 0,
          skipped: 1,
        })
      );
    });
  });
});
