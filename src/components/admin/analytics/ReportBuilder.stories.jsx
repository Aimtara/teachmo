import ReportBuilder from './ReportBuilder';

export default {
  title: 'Admin Analytics/ReportBuilder',
  component: ReportBuilder,
  tags: ['autodocs']
};

export const Default = {
  args: {
    tenant: { organizationId: 'demo-org', schoolId: null },
    filters: {
      start: '2024-11-01',
      end: '2024-11-07',
      role: null,
      childId: null,
      schoolId: null
    }
  }
};
