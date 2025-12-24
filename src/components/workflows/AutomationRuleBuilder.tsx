import { useState } from 'react';
import { cn } from '@/utils/cn';

const actionOptions = [
  { value: 'send_email', label: 'Send Email' },
  { value: 'create_entity', label: 'Create Entity' },
  { value: 'update_entity', label: 'Update Entity' },
];

const renderActionFields = (action: string) => {
  if (action === 'create_entity' || action === 'update_entity') {
    return (
      <>
        <label className="text-sm font-medium text-gray-700">Entity Type</label>
        <input
          type="text"
          name="entityType"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="e.g., student_profile"
        />
        <label className="text-sm font-medium text-gray-700">Field Mappings</label>
        <textarea
          name="fieldMappings"
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
          placeholder="e.g., name: trigger.name"
          rows={4}
        />
      </>
    );
  }

  return null;
};

export const AutomationRuleBuilder = () => {
  const [selectedAction, setSelectedAction] = useState(actionOptions[0].value);

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Action</label>
          <select
            className={cn('w-full rounded border border-gray-300 px-3 py-2 text-sm')}
            value={selectedAction}
            onChange={(event) => setSelectedAction(event.target.value)}
          >
            {actionOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">{renderActionFields(selectedAction)}</div>
      </div>
    </div>
  );
};

export default AutomationRuleBuilder;
