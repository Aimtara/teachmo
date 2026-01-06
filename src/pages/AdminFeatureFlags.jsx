import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useTenantScope } from '@/hooks/useTenantScope';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  fetchAdminFeatureFlags,
  joinList,
  splitList,
  updateAdminFeatureFlag,
} from '@/utils/featureFlagClient';

const EMPTY_FLAGS = [];

function buildDraft(flag) {
  return {
    enabled: Boolean(flag.enabled ?? flag.defaultEnabled ?? false),
    description: flag.description ?? '',
    rolloutPercentage: flag.rolloutPercentage ?? '',
    canaryPercentage: flag.canaryPercentage ?? '',
    allowlistText: joinList(flag.allowlist),
    denylistText: joinList(flag.denylist),
  };
}

export default function AdminFeatureFlags() {
  const { data: scope } = useTenantScope();
  const organizationId = scope?.organizationId ?? null;
  const schoolId = scope?.schoolId ?? null;
  const [newKey, setNewKey] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [drafts, setDrafts] = useState({});

  const flagsQuery = useQuery({
    queryKey: ['feature-flags-admin', organizationId, schoolId],
    enabled: Boolean(organizationId),
    queryFn: () => fetchAdminFeatureFlags({ organizationId, schoolId }),
  });

  const updateMutation = useMutation({
    mutationFn: updateAdminFeatureFlag,
    onSuccess: () => flagsQuery.refetch(),
  });

  useEffect(() => {
    if (!flagsQuery.data?.flags) return;
    setDrafts(() => {
      const next = {};
      flagsQuery.data.flags.forEach((flag) => {
        next[flag.key] = buildDraft(flag);
      });
      return next;
    });
  }, [flagsQuery.data]);

  const groupedFlags = useMemo(() => flagsQuery.data?.flags ?? EMPTY_FLAGS, [flagsQuery.data]);

  const updateDraft = (key, field, value) => {
    setDrafts((prev) => ({
      ...prev,
      [key]: {
        ...(prev[key] ?? buildDraft(groupedFlags.find((flag) => flag.key === key) || {})),
        [field]: value,
      },
    }));
  };

  const handleSave = (key) => {
    const draft = drafts[key];
    if (!draft) return;
    updateMutation.mutate({
      key,
      organizationId,
      schoolId,
      enabled: Boolean(draft.enabled),
      description: draft.description?.trim() || null,
      rolloutPercentage: draft.rolloutPercentage === '' ? null : Number(draft.rolloutPercentage),
      canaryPercentage: draft.canaryPercentage === '' ? null : Number(draft.canaryPercentage),
      allowlist: splitList(draft.allowlistText || ''),
      denylist: splitList(draft.denylistText || ''),
    });
  };

  const handleCreate = () => {
    if (!newKey.trim()) return;
    updateMutation.mutate({
      key: newKey.trim(),
      organizationId,
      schoolId,
      description: newDescription.trim() || null,
      enabled: false,
      rolloutPercentage: null,
      canaryPercentage: null,
      allowlist: [],
      denylist: [],
    });
    setNewKey('');
    setNewDescription('');
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Feature Flags</h1>
        <p className="text-sm text-muted-foreground">
          Toggle enterprise capabilities per tenant. Percentage rollouts apply to user-based hashing, with allowlists
          and denylists overriding staged rollouts. Updates are audited in the backend.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Create Flag</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[2fr,3fr,auto]">
          <Input value={newKey} onChange={(event) => setNewKey(event.target.value)} placeholder="ENTERPRISE_SSO" />
          <Input
            value={newDescription}
            onChange={(event) => setNewDescription(event.target.value)}
            placeholder="Description"
          />
          <Button onClick={handleCreate} disabled={!newKey.trim() || updateMutation.isLoading || !organizationId}>
            Add
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Key</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Default</TableHead>
                <TableHead>Enabled</TableHead>
                <TableHead>Rollout %</TableHead>
                <TableHead>Canary %</TableHead>
                <TableHead>Allowlist</TableHead>
                <TableHead>Denylist</TableHead>
                <TableHead>Scope</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {groupedFlags.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-sm text-muted-foreground">
                    No flags configured.
                  </TableCell>
                </TableRow>
              ) : (
                groupedFlags.map((flag) => {
                  const draft = drafts[flag.key] ?? buildDraft(flag);
                  return (
                    <TableRow key={flag.key}>
                      <TableCell className="font-mono text-xs">{flag.key}</TableCell>
                      <TableCell>
                        <Input
                          value={draft.description}
                          onChange={(event) => updateDraft(flag.key, 'description', event.target.value)}
                        />
                      </TableCell>
                      <TableCell>{flag.defaultEnabled ? 'On' : 'Off'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={Boolean(draft.enabled)}
                          onCheckedChange={(checked) => updateDraft(flag.key, 'enabled', checked)}
                          aria-label={`Toggle ${flag.key}`}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.rolloutPercentage}
                          onChange={(event) => updateDraft(flag.key, 'rolloutPercentage', event.target.value)}
                          placeholder="0-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          value={draft.canaryPercentage}
                          onChange={(event) => updateDraft(flag.key, 'canaryPercentage', event.target.value)}
                          placeholder="0-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draft.allowlistText}
                          onChange={(event) => updateDraft(flag.key, 'allowlistText', event.target.value)}
                          placeholder="tenant ids"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={draft.denylistText}
                          onChange={(event) => updateDraft(flag.key, 'denylistText', event.target.value)}
                          placeholder="tenant ids"
                        />
                      </TableCell>
                      <TableCell>{flag.scope ?? (schoolId ? 'school' : 'organization')}</TableCell>
                      <TableCell>
                        <Button
                          variant="outline"
                          onClick={() => handleSave(flag.key)}
                          disabled={updateMutation.isLoading || !organizationId}
                        >
                          Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
