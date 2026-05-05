import { graphql } from '@/lib/graphql';

export function getSISSyncConfig() {
  return graphql(
    `query GetSISSyncConfig {
      sis_sync_config { provider mode }
      sis_sync_jobs(order_by: {created_at: desc}, limit: 10) { id provider mode status created_at }
    }`,
  );
}

export function updateSISSyncConfig(provider: string, mode: string) {
  return graphql(
    `mutation UpsertSISSyncConfig($provider: String!, $mode: String!) {
      insert_sis_sync_config_one(
        object: {provider: $provider, mode: $mode},
        on_conflict: {constraint: sis_sync_config_pkey, update_columns: [mode]}
      ) { provider mode }
    }`,
    { provider, mode },
  );
}

export function runSISSync(provider: string) {
  return graphql(
    `mutation RunSISSync($provider: String!) {
      run_sis_sync(provider: $provider) { message }
    }`,
    { provider },
  );
}

export function getScheduledReports() {
  return graphql(
    `query ScheduledReports {
      scheduled_reports(order_by: {created_at: desc}) {
        id name interval format metrics recipients { email }
      }
    }`,
  );
}

export function subscribeToScheduledReport(reportId: string, email: string) {
  return graphql(
    `mutation Subscribe($reportId: uuid!, $email: String!) {
      insert_scheduled_report_recipients_one(
        object: {report_id: $reportId, email: $email},
        on_conflict: {constraint: scheduled_report_recipients_pkey, update_columns: []}
      ) { email }
    }`,
    { reportId, email },
  );
}

export function unsubscribeFromScheduledReport(reportId: string, email: string) {
  return graphql(
    `mutation Unsubscribe($reportId: uuid!, $email: String!) {
      delete_scheduled_report_recipients_by_pk(report_id: $reportId, email: $email) { email }
    }`,
    { reportId, email },
  );
}

const SIS_TABLES = [
  { name: 'sis_roster_students', columns: ['id', 'student_id', 'student_name', 'grade', 'status'] },
  { name: 'sis_roster_teachers', columns: ['id', 'teacher_id', 'teacher_name', 'status'] },
  { name: 'sis_roster_classes', columns: ['id', 'class_id', 'class_name', 'term', 'status'] },
  { name: 'sis_roster_enrollments', columns: ['id', 'enrollment_id', 'student_id', 'class_id', 'status'] },
] as const;

export function getSISTables() {
  return SIS_TABLES.map((table) => ({ ...table, columns: [...table.columns] }));
}

export function getSISTableRecords(tableName: string) {
  const table = SIS_TABLES.find((item) => item.name === tableName);
  if (!table) throw new Error('Unsupported SIS table');
  const cols = table.columns.join(', ');
  return graphql(`query GetRecords { ${tableName}(limit: 20) { ${cols} } }`);
}

export function updateSISTableRecord(tableName: string, id: string, data: Record<string, unknown>) {
  const table = SIS_TABLES.find((item) => item.name === tableName);
  if (!table) throw new Error('Unsupported SIS table');
  return graphql(
    `mutation UpdateRecord($id: uuid!, $data: ${tableName}_set_input!) {
      update_${tableName}_by_pk(pk_columns: {id: $id}, _set: $data) { id }
    }`,
    { id, data },
  );
}

export function listSISRoleMappings() {
  return graphql(
    `query SISRoleMappings {
      sis_role_mappings(order_by: {sis_role: asc}) {
        id
        sis_role
        app_role
      }
    }`,
  );
}

export function updateSISRoleMapping(id: string, appRole: string) {
  return graphql(
    `mutation UpdateSISRoleMapping($id: uuid!, $app_role: String!) {
      update_sis_role_mappings_by_pk(pk_columns: { id: $id }, _set: { app_role: $app_role }) {
        id
      }
    }`,
    { id, app_role: appRole },
  );
}
