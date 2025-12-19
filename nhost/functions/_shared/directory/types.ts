export type DirectoryContact = {
  email: string;
  contactType: 'parent_guardian' | 'teacher' | 'staff' | 'student' | 'other';
  sourceRole?: string;
  externalId?: string;
  firstName?: string;
  lastName?: string;
  metadata?: Record<string, any>;
};

export type HasuraClient = (query: string, variables?: Record<string, any>) => Promise<any>;

export type DirectoryRowInput = { email?: string | null; contact_type?: string | null; rowNumber?: number };
export type DirectoryRowNormalized = { email: string; contact_type: string };
export type JobError = { reason: string; message?: string; row?: number };
export type DirectorySchemaVersion = {
  version: string;
  required_headers: string[];
  optional_headers: string[];
  rules: Record<string, any>;
};
export type DirectoryInvalidRow = {
  rowNumber: number;
  raw: Record<string, any>;
  raw_redacted?: Record<string, any>;
  reason: string;
};
export type DirectoryDiff = {
  counts: { toAdd: number; toUpdate: number; toDeactivate: number; invalid: number; currentActive: number };
  samples: {
    toAdd: Array<{ email: string; contact_type: string }>;
    toUpdate: Array<{ email: string; from?: string; to: string; wasInactive?: boolean }>;
    toDeactivate: Array<{ email: string; contact_type?: string }>;
    invalid: Array<{ rowNumber: number; reason: string; email?: string | null; contact_type?: string | null }>;
  };
  existingCount: number;
};
