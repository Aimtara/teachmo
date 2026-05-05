import { graphql } from '@/lib/graphql';

export function listBackupJobs() {
  return graphql(
    `query BackupJobs {
      backup_jobs(order_by: {created_at: desc}) {
        id
        environment
        status
        created_at
      }
    }`,
  ).then((res) => res?.backup_jobs ?? []);
}

export function runBackupJob(environment: string) {
  return graphql(
    `mutation RunBackup($env: String!) {
      admin_run_backup(environment: $env)
    }`,
    { env: environment },
  );
}

export function restoreBackupJob(id: string) {
  return graphql(
    `mutation RestoreBackup($id: uuid!) {
      admin_restore_backup(id: $id)
    }`,
    { id },
  );
}
