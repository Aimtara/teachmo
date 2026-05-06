import { EnterpriseDataTable, EnterpriseBadge } from './index';

const rows = Array.from({ length: 250 }, (_, index) => ({
  id: `row-${index}`,
  name: `Tenant ${index + 1}`,
  owner: index % 3 === 0 ? 'District IT' : index % 3 === 1 ? 'School Ops' : 'Success',
  status: index % 5 === 0 ? 'Risk' : 'Healthy',
  adoption: `${72 + (index % 24)}%`
}));

const columns = [
  { id: 'name', header: 'Tenant', accessor: 'name', editable: true },
  { id: 'owner', header: 'Owner', accessor: 'owner' },
  {
    id: 'status',
    header: 'Status',
    accessor: 'status',
    cell: (row) => (
      <EnterpriseBadge variant={row.status === 'Healthy' ? 'success' : 'warning'}>{row.status}</EnterpriseBadge>
    )
  },
  { id: 'adoption', header: 'Adoption', accessor: 'adoption' }
];

export default {
  title: 'Enterprise/DataTable',
  component: EnterpriseDataTable,
  parameters: {
    docs: {
      description: {
        component:
          'Virtualized table with global search, sort, saved views, column management, CSV export, inline editing, and keyboard row selection.'
      }
    }
  }
};

export function VirtualizedSavedViews() {
  return <EnterpriseDataTable rows={rows} columns={columns} ariaLabel="Storybook enterprise tenants" height={360} />;
}
