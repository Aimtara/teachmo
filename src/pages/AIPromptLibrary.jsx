import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { API_BASE_URL } from '@/config/api';
import { nhost } from '@/lib/nhostClient';

async function fetchJson(url, opts = {}) {
  const response = await fetch(url, opts);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Request failed');
  }
  return response.json();
}

export default function AIPromptLibrary() {
  const [selectedPromptId, setSelectedPromptId] = useState(null);
  const [newPrompt, setNewPrompt] = useState({ name: '', description: '', content: '' });
  const [versionContent, setVersionContent] = useState('');
  const [promptDetails, setPromptDetails] = useState({ name: '', description: '', isArchived: false });

  const headersQuery = useQuery({
    queryKey: ['ai-prompts-token'],
    queryFn: async () => {
      const token = await nhost.auth.getAccessToken();
      return {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
    },
  });

  const promptsQuery = useQuery({
    queryKey: ['ai-prompts-admin'],
    enabled: Boolean(headersQuery.data),
    queryFn: async () => fetchJson(`${API_BASE_URL}/admin/ai/prompts`, { headers: headersQuery.data }),
  });

  const versionsQuery = useQuery({
    queryKey: ['ai-prompts-versions', selectedPromptId],
    enabled: Boolean(headersQuery.data && selectedPromptId),
    queryFn: async () =>
      fetchJson(`${API_BASE_URL}/admin/ai/prompts/${selectedPromptId}/versions`, { headers: headersQuery.data }),
    onSuccess: (data) => {
      if (data?.prompt) {
        setPromptDetails({
          name: data.prompt.name || '',
          description: data.prompt.description || '',
          isArchived: Boolean(data.prompt.is_archived),
        });
      }
      const active = (data?.versions || []).find((v) => v.is_active);
      setVersionContent(active?.content || '');
    },
  });

  const createPromptMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/ai/prompts`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({
          name: newPrompt.name,
          description: newPrompt.description,
          content: newPrompt.content,
        }),
      });
    },
    onSuccess: (data) => {
      promptsQuery.refetch();
      setSelectedPromptId(data?.id || null);
      setNewPrompt({ name: '', description: '', content: '' });
    },
  });

  const updatePromptMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/ai/prompts/${selectedPromptId}`, {
        method: 'PUT',
        headers: headersQuery.data,
        body: JSON.stringify({
          name: promptDetails.name,
          description: promptDetails.description,
          isArchived: promptDetails.isArchived,
        }),
      });
    },
    onSuccess: () => {
      promptsQuery.refetch();
      versionsQuery.refetch();
    },
  });

  const createVersionMutation = useMutation({
    mutationFn: async () => {
      return fetchJson(`${API_BASE_URL}/admin/ai/prompts/${selectedPromptId}/versions`, {
        method: 'POST',
        headers: headersQuery.data,
        body: JSON.stringify({
          content: versionContent,
          setActive: true,
        }),
      });
    },
    onSuccess: () => {
      versionsQuery.refetch();
      promptsQuery.refetch();
    },
  });

  const promptList = useMemo(() => promptsQuery.data?.prompts || [], [promptsQuery.data]);

  return (
    <ProtectedRoute allowedRoles={['system_admin', 'admin']}>
      <div className="p-6 space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold">AI Prompt Library</h1>
          <p className="text-sm text-muted-foreground">
            Create, version, and manage prompts used across Teachmo's AI features. Active versions can be promoted
            instantly for tenant-safe rollouts.
          </p>
        </header>

        <div className="grid gap-6 lg:grid-cols-[1.2fr_2fr]">
          <Card>
            <CardHeader>
              <CardTitle>Prompt Catalog</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {promptList.length === 0 ? (
                <p className="text-sm text-muted-foreground">No prompts yet. Create the first prompt to get started.</p>
              ) : (
                <ul className="space-y-2">
                  {promptList.map((prompt) => (
                    <li key={prompt.id}>
                      <button
                        type="button"
                        onClick={() => setSelectedPromptId(prompt.id)}
                        className={`w-full text-left border rounded-lg p-3 transition ${
                          selectedPromptId === prompt.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">{prompt.name}</div>
                            <div className="text-xs text-muted-foreground">{prompt.description || 'No description'}</div>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            v{prompt.version ?? '—'} {prompt.is_archived ? '• Archived' : ''}
                          </div>
                        </div>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Create New Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Name</div>
                  <Input
                    value={newPrompt.name}
                    onChange={(e) => setNewPrompt((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="e.g., Attendance summary"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Description</div>
                  <Input
                    value={newPrompt.description}
                    onChange={(e) => setNewPrompt((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Short description for admins"
                  />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Prompt content</div>
                  <Textarea
                    value={newPrompt.content}
                    onChange={(e) => setNewPrompt((prev) => ({ ...prev, content: e.target.value }))}
                    rows={6}
                    placeholder="You are a helpful assistant..."
                  />
                </div>
                <Button
                  onClick={() => createPromptMutation.mutate()}
                  disabled={!newPrompt.name || !newPrompt.content || createPromptMutation.isPending}
                >
                  {createPromptMutation.isPending ? 'Creating…' : 'Create prompt'}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Selected Prompt</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {!selectedPromptId ? (
                  <p className="text-sm text-muted-foreground">Select a prompt to edit or add versions.</p>
                ) : (
                  <>
                    <div className="grid gap-3 md:grid-cols-2">
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Name</div>
                        <Input
                          value={promptDetails.name}
                          onChange={(e) => setPromptDetails((prev) => ({ ...prev, name: e.target.value }))}
                        />
                      </div>
                      <div>
                        <div className="text-xs text-muted-foreground mb-1">Description</div>
                        <Input
                          value={promptDetails.description}
                          onChange={(e) => setPromptDetails((prev) => ({ ...prev, description: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={promptDetails.isArchived}
                          onChange={(e) => setPromptDetails((prev) => ({ ...prev, isArchived: e.target.checked }))}
                        />
                        Archive prompt
                      </label>
                      <Button
                        variant="secondary"
                        onClick={() => updatePromptMutation.mutate()}
                        disabled={updatePromptMutation.isPending}
                      >
                        {updatePromptMutation.isPending ? 'Saving…' : 'Save details'}
                      </Button>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-1">New version content</div>
                      <Textarea
                        value={versionContent}
                        onChange={(e) => setVersionContent(e.target.value)}
                        rows={8}
                      />
                      <div className="mt-2 flex justify-end">
                        <Button
                          onClick={() => createVersionMutation.mutate()}
                          disabled={!versionContent || createVersionMutation.isPending}
                        >
                          {createVersionMutation.isPending ? 'Publishing…' : 'Publish new version'}
                        </Button>
                      </div>
                    </div>

                    <div>
                      <div className="text-xs text-muted-foreground mb-2">Version history</div>
                      {versionsQuery.data?.versions?.length ? (
                        <ul className="space-y-2 text-sm">
                          {versionsQuery.data.versions.map((version) => (
                            <li key={version.id} className="border rounded-lg p-2">
                              <div className="flex justify-between">
                                <div>v{version.version}</div>
                                <div className="text-xs text-muted-foreground">
                                  {version.is_active ? 'Active' : 'Archived'} ·{' '}
                                  {version.created_at ? new Date(version.created_at).toLocaleString() : '—'}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-sm text-muted-foreground">No versions recorded yet.</p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  );
}
