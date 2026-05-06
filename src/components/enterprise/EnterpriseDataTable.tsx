import { useEffect, useMemo, useRef, useState } from 'react';
import { cn } from '@/lib/utils';
import { EnterpriseBadge } from './EnterpriseBadge';

const DEFAULT_ROW_HEIGHT = 56;
const DEFAULT_HEIGHT = 420;

function getCellValue(row, column) {
  if (typeof column.accessor === 'function') return column.accessor(row);
  return row?.[column.accessor ?? column.id];
}

function normalize(value) {
  return String(value ?? '').toLowerCase();
}

function readSavedViews(storageKey) {
  if (!storageKey || typeof window === 'undefined') return [];
  try {
    return JSON.parse(window.localStorage.getItem(storageKey) || '[]');
  } catch {
    return [];
  }
}

export function EnterpriseDataTable({
  ariaLabel = 'Enterprise data table',
  rows = [],
  columns = [],
  rowHeight = DEFAULT_ROW_HEIGHT,
  height = DEFAULT_HEIGHT,
  storageKey = 'teachmo_enterprise_table_views',
  onRowSelect,
  selectedRowId,
  getRowId = (row) => row.id,
  onInlineEdit,
  className
}) {
  const scrollRef = useRef(null);
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState({ id: columns[0]?.id, direction: 'asc' });
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleColumnIds, setVisibleColumnIds] = useState(() => columns.map((column) => column.id));
  const [views, setViews] = useState(() => readSavedViews(storageKey));
  const [viewName, setViewName] = useState('');

  useEffect(() => {
    setVisibleColumnIds((current) => {
      const ids = columns.map((column) => column.id);
      const kept = current.filter((id) => ids.includes(id));
      return kept.length > 0 ? kept : ids;
    });
  }, [columns]);

  useEffect(() => {
    if (!storageKey || typeof window === 'undefined') return;
    window.localStorage.setItem(storageKey, JSON.stringify(views));
  }, [storageKey, views]);

  const visibleColumns = useMemo(
    () => columns.filter((column) => visibleColumnIds.includes(column.id)),
    [columns, visibleColumnIds]
  );

  const filteredRows = useMemo(() => {
    const q = normalize(query.trim());
    const searched = q
      ? rows.filter((row) =>
          columns.some((column) => normalize(getCellValue(row, column)).includes(q))
        )
      : rows;

    const sorted = [...searched];
    const sortColumn = columns.find((column) => column.id === sort.id);
    if (!sortColumn) return sorted;
    sorted.sort((a, b) => {
      const left = getCellValue(a, sortColumn);
      const right = getCellValue(b, sortColumn);
      return normalize(left).localeCompare(normalize(right), undefined, { numeric: true }) * (sort.direction === 'asc' ? 1 : -1);
    });
    return sorted;
  }, [columns, query, rows, sort]);

  const totalHeight = filteredRows.length * rowHeight;
  const startIndex = Math.max(0, Math.floor(scrollTop / rowHeight) - 4);
  const visibleCount = Math.ceil(height / rowHeight) + 8;
  const virtualRows = filteredRows.slice(startIndex, startIndex + visibleCount);

  const toggleColumn = (id) => {
    setVisibleColumnIds((current) =>
      current.includes(id) ? current.filter((columnId) => columnId !== id) : [...current, id]
    );
  };

  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    setViews((current) => [
      ...current.filter((view) => view.name !== name),
      { name, visibleColumnIds, sort, query }
    ]);
    setViewName('');
  };

  const applyView = (view) => {
    setVisibleColumnIds(view.visibleColumnIds);
    setSort(view.sort);
    setQuery(view.query ?? '');
  };

  const exportCsv = () => {
    const header = visibleColumns.map((column) => column.header).join(',');
    const body = filteredRows
      .map((row) =>
        visibleColumns
          .map((column) => `"${String(getCellValue(row, column) ?? '').replace(/"/g, '""')}"`)
          .join(',')
      )
      .join('\n');
    const blob = new Blob([[header, body].filter(Boolean).join('\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'teachmo-command-center.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className={cn('rounded-2xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] shadow-sm', className)}>
      <div className="flex flex-col gap-3 border-b border-[var(--enterprise-border)] p-4 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative flex-1 text-sm">
          <span className="sr-only">Search rows</span>
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--enterprise-muted)]" aria-hidden="true">/</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="enterprise-focus w-full rounded-xl border border-[var(--enterprise-border)] bg-transparent py-2 pl-9 pr-3 text-[var(--enterprise-foreground)] placeholder:text-[var(--enterprise-muted)]"
            placeholder="Search 10k+ rows, filters, owners..."
          />
        </label>
        <div className="flex flex-wrap items-center gap-2">
          <details className="relative">
            <summary className="enterprise-focus enterprise-motion flex cursor-pointer items-center gap-2 rounded-xl border border-[var(--enterprise-border)] px-3 py-2 text-sm text-[var(--enterprise-foreground)] hover:-translate-y-0.5">
              <span aria-hidden="true">[ ]</span>
              Columns
            </summary>
            <div className="absolute right-0 z-20 mt-2 w-56 rounded-xl border border-[var(--enterprise-border)] bg-[var(--enterprise-surface)] p-3 shadow-[var(--enterprise-shadow)]">
              {columns.map((column) => (
                <label key={column.id} className="flex items-center gap-2 py-1 text-sm text-[var(--enterprise-foreground)]">
                  <input
                    type="checkbox"
                    checked={visibleColumnIds.includes(column.id)}
                    onChange={() => toggleColumn(column.id)}
                  />
                  {column.header}
                </label>
              ))}
            </div>
          </details>
          <input
            value={viewName}
            onChange={(event) => setViewName(event.target.value)}
            className="enterprise-focus w-36 rounded-xl border border-[var(--enterprise-border)] bg-transparent px-3 py-2 text-sm"
            placeholder="View name"
            aria-label="Saved view name"
          />
          <button className="enterprise-focus enterprise-motion rounded-xl border border-[var(--enterprise-border)] px-3 py-2 text-sm hover:-translate-y-0.5" onClick={saveView}>
            <span className="mr-1" aria-hidden="true">+</span>
            Save
          </button>
          <button className="enterprise-focus enterprise-motion rounded-xl border border-[var(--enterprise-border)] px-3 py-2 text-sm hover:-translate-y-0.5" onClick={exportCsv}>
            Export CSV
          </button>
        </div>
      </div>

      {views.length > 0 ? (
        <div className="flex flex-wrap gap-2 border-b border-[var(--enterprise-border)] px-4 py-3">
          {views.map((view) => (
            <button key={view.name} className="enterprise-focus" onClick={() => applyView(view)}>
              <EnterpriseBadge variant="info">{view.name}</EnterpriseBadge>
            </button>
          ))}
        </div>
      ) : null}

      <div
        ref={scrollRef}
        className="overflow-auto"
        style={{ height }}
        onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
        role="table"
        aria-label={ariaLabel}
        aria-rowcount={filteredRows.length}
      >
        <div className="sticky top-0 z-10 grid border-b border-[var(--enterprise-border)] bg-[var(--enterprise-surface)]" style={{ gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(9rem, 1fr))` }} role="row">
          {visibleColumns.map((column) => (
            <button
              key={column.id}
              className="enterprise-focus px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-[var(--enterprise-muted)]"
              onClick={() => setSort((current) => ({ id: column.id, direction: current.id === column.id && current.direction === 'asc' ? 'desc' : 'asc' }))}
              role="columnheader"
              aria-sort={sort.id === column.id ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
            >
              {column.header}
            </button>
          ))}
        </div>
        <div className="relative" style={{ height: totalHeight || rowHeight }}>
          {virtualRows.length === 0 ? (
            <p className="p-6 text-sm text-[var(--enterprise-muted)]">No rows match this view.</p>
          ) : (
            virtualRows.map((row, virtualIndex) => {
              const rowId = getRowId(row);
              return (
                <div
                  key={rowId}
                  className={cn(
                    'enterprise-motion absolute left-0 right-0 grid border-b border-[var(--enterprise-border)] text-sm hover:bg-[color-mix(in_srgb,var(--enterprise-primary)_8%,transparent)]',
                    selectedRowId === rowId && 'bg-[color-mix(in_srgb,var(--enterprise-primary)_12%,transparent)]'
                  )}
                  style={{
                    gridTemplateColumns: `repeat(${visibleColumns.length}, minmax(9rem, 1fr))`,
                    height: rowHeight,
                    transform: `translateY(${(startIndex + virtualIndex) * rowHeight}px)`
                  }}
                  role="row"
                  tabIndex={0}
                  onClick={() => onRowSelect?.(row)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') onRowSelect?.(row);
                  }}
                >
                  {visibleColumns.map((column) => {
                    const value = getCellValue(row, column);
                    return (
                      <div key={column.id} className="flex min-w-0 items-center px-4 py-2 text-[var(--enterprise-foreground)]" role="cell">
                        {column.editable ? (
                          <input
                            className="enterprise-focus w-full rounded-lg border border-transparent bg-transparent px-2 py-1 hover:border-[var(--enterprise-border)] focus:border-[var(--enterprise-primary)]"
                            defaultValue={value ?? ''}
                            aria-label={`Edit ${column.header}`}
                            onBlur={(event) => onInlineEdit?.(row, column.id, event.target.value)}
                          />
                        ) : column.cell ? (
                          column.cell(row, value)
                        ) : (
                          <span className="truncate">{value}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
