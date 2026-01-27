import FiltersBar from './FiltersBar';

export default {
  title: 'Admin Analytics/DashboardFiltersBar',
  component: FiltersBar,
  tags: ['autodocs']
};

export const Default = {
  args: {
    filters: {
      start: '2024-11-01',
      end: '2024-11-07',
      role: 'all',
      childId: '',
      schoolId: ''
    },
    onApply: () => {},
    onReset: () => {}
  }
};
