export interface QueryResult<Row = Record<string, unknown>> {
  rows: Row[];
  rowCount: number | null;
}

export function query<Row = Record<string, unknown>>(
  text: string,
  params?: readonly unknown[],
): Promise<QueryResult<Row>>;

export const db: {
  auditLogs: {
    create(input: { event: string; actor: string; metadata?: Record<string, unknown> }): Promise<unknown>;
  };
};
