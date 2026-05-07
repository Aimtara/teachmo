export interface RosterSyncResult {
  processedCount: number;
  stats: Record<string, unknown>;
}

export function populateSchoolDirectory(options: { mode: 'delta' | 'full' }): Promise<RosterSyncResult>;
