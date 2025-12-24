import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const ROLE_OPTIONS = [
  { value: 'all', label: 'All roles' },
  { value: 'parent', label: 'Parent' },
  { value: 'teacher', label: 'Teacher' },
  { value: 'school_admin', label: 'School admin' },
  { value: 'district_admin', label: 'District admin' },
  { value: 'system_admin', label: 'System admin' }
];

function formatDate(value) {
  if (!value) return '';
  const date = typeof value === 'string' ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
}

export default function FiltersBar({ filters, onApply, onReset }) {
  const [local, setLocal] = useState(filters);

  useEffect(() => {
    setLocal(filters);
  }, [filters]);

  return (
    <div className="rounded-xl border bg-white p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-6">
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Start date</label>
          <Input
            type="date"
            value={formatDate(local.start)}
            onChange={(e) => setLocal((prev) => ({ ...prev, start: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">End date</label>
          <Input
            type="date"
            value={formatDate(local.end)}
            onChange={(e) => setLocal((prev) => ({ ...prev, end: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Role</label>
          <Select
            value={local.role || 'all'}
            onValueChange={(value) => setLocal((prev) => ({ ...prev, role: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLE_OPTIONS.map((role) => (
                <SelectItem key={role.value} value={role.value}>
                  {role.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">Child ID</label>
          <Input
            placeholder="child-123"
            value={local.childId || ''}
            onChange={(e) => setLocal((prev) => ({ ...prev, childId: e.target.value }))}
          />
        </div>
        <div className="space-y-1">
          <label className="text-xs text-muted-foreground">School ID</label>
          <Input
            placeholder="school-456"
            value={local.schoolId || ''}
            onChange={(e) => setLocal((prev) => ({ ...prev, schoolId: e.target.value }))}
          />
        </div>
        <div className="flex items-end gap-2">
          <Button onClick={() => onApply(local)}>Apply</Button>
          <Button variant="secondary" onClick={onReset}>
            Reset
          </Button>
        </div>
      </div>
    </div>
  );
}
