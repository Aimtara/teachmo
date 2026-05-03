import {
  mapDirectoryIdentities,
  IDENTITY_MATCH_ACTIONS,
  IDENTITY_MATCH_REASONS,
} from '../_shared/directory/identityMapping.js';

describe('directory identity mapping', () => {
  const existing = [
    {
      stableId: 'existing-ext',
      schoolId: 'school-1',
      externalId: 'stu-100',
      sourceSystemId: 'sis-a',
      email: 'student100@example.edu',
      givenName: 'Ava',
      familyName: 'Nguyen',
      dateOfBirth: '2015-01-02',
    },
    {
      stableId: 'existing-email',
      schoolId: 'school-1',
      email: 'guardian@example.edu',
      givenName: 'Pat',
      familyName: 'Guardian',
    },
    {
      stableId: 'existing-relationship',
      schoolId: 'school-1',
      guardianExternalId: 'guardian-1',
      studentExternalId: 'stu-200',
    },
  ];

  test('uses external ID before scoped email', () => {
    const result = mapDirectoryIdentities({
      schoolId: 'school-1',
      existingRecords: existing,
      incomingRows: [
        {
          externalId: 'stu-100',
          sourceSystemId: 'sis-a',
          email: 'changed@example.edu',
        },
      ],
    });

    expect(result.decisions[0]).toMatchObject({
      action: IDENTITY_MATCH_ACTIONS.MATCH,
      reason: IDENTITY_MATCH_REASONS.EXACT_EXTERNAL_ID,
      stableId: 'existing-ext',
    });
  });

  test('matches scoped email only when enabled', () => {
    const result = mapDirectoryIdentities({
      schoolId: 'school-1',
      existingRecords: existing,
      incomingRows: [{ email: 'GUARDIAN@example.edu' }],
      allowScopedEmailMatch: true,
    });

    expect(result.decisions[0]).toMatchObject({
      action: IDENTITY_MATCH_ACTIONS.MATCH,
      reason: IDENTITY_MATCH_REASONS.SCOPED_EMAIL,
      stableId: 'existing-email',
    });
  });

  test('routes name and date of birth similarity to manual review', () => {
    const result = mapDirectoryIdentities({
      schoolId: 'school-1',
      existingRecords: existing,
      incomingRows: [{ givenName: 'Ava', familyName: 'Nguyen', dateOfBirth: '2015-01-02' }],
    });

    expect(result.decisions[0]).toMatchObject({
      action: IDENTITY_MATCH_ACTIONS.REVIEW,
      reason: IDENTITY_MATCH_REASONS.LOW_CONFIDENCE_NAME_DOB,
      candidateStableIds: ['existing-ext'],
    });
  });

  test('detects duplicate incoming rows and does not silently merge', () => {
    const result = mapDirectoryIdentities({
      schoolId: 'school-1',
      existingRecords: [],
      incomingRows: [
        { externalId: 'dup-1', sourceSystemId: 'sis-a', email: 'one@example.edu' },
        { externalId: 'dup-1', sourceSystemId: 'sis-a', email: 'two@example.edu' },
      ],
    });

    expect(result.decisions[1]).toMatchObject({
      action: IDENTITY_MATCH_ACTIONS.REVIEW,
      reason: IDENTITY_MATCH_REASONS.DUPLICATE_INCOMING,
    });
    expect(result.conflicts).toHaveLength(1);
  });
});
