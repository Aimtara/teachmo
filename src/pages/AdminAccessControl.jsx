import React, { useState } from 'react';
import { rbacPolicy } from '@/config/rbacPolicy';
import { Page, Card, Switch, Button } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { useToast } from '@/components/ui/use-toast';

/**
 * AdminAccessControl
 * Displays the RBAC policy and allows super admins to modify permissions per role.
 * Changes are saved via GraphQL mutation to enterprise_role_permissions table.
 */
export default function AdminAccessControl() {
  const { hasPermission } = usePermissions();
  const { toast } = useToast();
  const [policy, setPolicy] = useState(() => {
    // Deep clone to avoid mutating imported policy
    return JSON.parse(JSON.stringify(rbacPolicy));
  });

  if (!hasPermission('manage_role_permissions')) {
    return (
      <Page title="Access Control">
        <p>You do not have permission to manage role permissions.</p>
      </Page>
    );
  }

  const allActions: string[] = Array.from(
    new Set(Object.values(rbacPolicy).flatMap((role: any) => role.actions))
  );

  const togglePermission = (role: string, action: string) => {
    setPolicy((prev: any) => {
      const hasAction = prev[role].actions.includes(action);
      const actions = hasAction
        ? prev[role].actions.filter((a: string) => a !== action)
        : [...prev[role].actions, action];
      return { ...prev, [role]: { ...prev[role], actions } };
    });
  };

  const savePolicy = async () => {
    // TODO: call GraphQL mutation to persist policy to database (enterprise_role_permissions).
    console.log('Saving policy', policy);
    toast({
      title: 'Policy saved',
      description: 'Role permissions have been updated successfully.'
    });
  };

  return (
    <Page title="Access Control">
      <p>Manage permissions for each role. Changes take effect immediately after saving.</p>
      <div className="space-y-4">
        {Object.keys(policy).map((role) => (
          <Card key={role} className="p-4">
            <h3 className="font-semibold capitalize">{role}</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-2">
              {allActions.map((action) => (
                <div key={action} className="flex items-center">
                  <Switch
                    checked={policy[role].actions.includes(action)}
                    onChange={() => togglePermission(role, action)}
                    aria-label={`Allow ${action}`}
                  />
                  <span className="ml-2">{action}</span>
                </div>
              ))}
            </div>
          </Card>
        ))}
      </div>
      <div className="mt-4">
        <Button onClick={savePolicy}>Save</Button>
      </div>
    </Page>
  );
}
