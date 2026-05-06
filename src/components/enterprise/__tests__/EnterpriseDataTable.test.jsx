import { render, screen, fireEvent, within } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { EnterpriseDataTable } from '../EnterpriseDataTable';

const rows = Array.from({ length: 10000 }, (_, index) => ({
  id: `row-${index}`,
  name: `Tenant ${index}`,
  owner: index % 2 === 0 ? 'District IT' : 'School Ops',
  status: index % 10 === 0 ? 'Risk' : 'Healthy'
}));

const columns = [
  { id: 'name', header: 'Tenant', accessor: 'name', editable: true },
  { id: 'owner', header: 'Owner', accessor: 'owner' },
  { id: 'status', header: 'Status', accessor: 'status' }
];

describe('EnterpriseDataTable', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:test'),
      revokeObjectURL: vi.fn()
    });
  });

  it('virtualizes large row sets and exposes row count for assistive tech', () => {
    render(<EnterpriseDataTable rows={rows} columns={columns} height={240} ariaLabel="Tenants" />);

    expect(screen.getByRole('table', { name: 'Tenants' })).toHaveAttribute('aria-rowcount', '10000');
    expect(screen.getAllByRole('row').length).toBeLessThan(30);
  });

  it('filters, saves views, and supports inline editing callbacks', () => {
    const onInlineEdit = vi.fn();
    render(
      <EnterpriseDataTable
        rows={rows}
        columns={columns}
        height={240}
        storageKey="test_table_views"
        onInlineEdit={onInlineEdit}
      />
    );

    fireEvent.change(screen.getByPlaceholderText(/search 10k/i), { target: { value: 'Tenant 42' } });
    expect(screen.getByRole('table')).toHaveAttribute('aria-rowcount', '111');

    fireEvent.change(screen.getByLabelText('Saved view name'), { target: { value: 'Risk triage' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));
    expect(screen.getByRole('button', { name: /risk triage/i })).toBeInTheDocument();

    const firstRow = screen.getAllByRole('row')[1];
    const input = within(firstRow).getByLabelText('Edit Tenant');
    fireEvent.change(input, { target: { value: 'Renamed tenant' } });
    fireEvent.blur(input);
    expect(onInlineEdit).toHaveBeenCalledWith(expect.objectContaining({ id: 'row-42' }), 'name', 'Renamed tenant');
  });
});
