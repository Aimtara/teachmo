import React, { useEffect, useState } from 'react';
import { Page, Card, Button, TextInput } from '@/components/ui';
import { usePermissions } from '@/hooks/usePermissions';
import { nhost } from '@/utils/nhost';

/**
 * AdminPromptManagement
 * Allows administrators to manage AI prompt definitions and versions.
 * Prompts are stored in the database via GraphQL and loaded via the API.
 */
export default function AdminPromptManagement() {
  const { hasPermission } = usePermissions();
  const [prompts, setPrompts] = useState<any[]>([]);
  const [editingPrompt, setEditingPrompt] = useState<string | null>(null);
  const [form, setForm] = useState<any>({
    id: null,
    key: '',
    description: '',
    model: 'gpt-4o',
    fallback_model: 'gpt-3.5-turbo',
    budget_threshold: 0.8,
  });

  const loadPrompts = async () => {
    try {
      const res: any = await nhost.graphql.request(
        `
          query ListPrompts {
            ai_prompts {
              id
              key
              description
              model
              fallback_model
              budget_threshold
            }
          }
        `,
        {}
      );
      setPrompts(res?.ai_prompts || []);
    } catch (err) {
      console.error('Failed to load prompts', err);
    }
  };

  useEffect(() => {
    if (hasPermission('manage_prompts')) {
      loadPrompts();
    }
  }, [hasPermission]);

  const savePrompt = async () => {
    const { id, ...data } = form;
    const mutation = id
      ? `
          mutation UpdatePrompt($id: uuid!, $changes: ai_prompts_set_input!) {
            update_ai_prompts_by_pk(pk_columns: { id: $id }, _set: $changes) {
              id
            }
          }
        `
      : `
          mutation InsertPrompt($object: ai_prompts_insert_input!) {
            insert_ai_prompts_one(object: $object) { id }
          }
        `;
    try {
      if (id) {
        await nhost.graphql.request(mutation, { id, changes: data });
      } else {
        await nhost.graphql.request(mutation, { object: data });
      }
      setEditingPrompt(null);
      loadPrompts();
    } catch (err) {
      console.error('Failed to save prompt', err);
    }
  };

  const startEdit = (prompt: any) => {
    setEditingPrompt(prompt?.id || 'new');
    setForm({
      id: prompt?.id || null,
      key: prompt?.key || '',
      description: prompt?.description || '',
      model: prompt?.model || 'gpt-4o',
      fallback_model: prompt?.fallback_model || 'gpt-3.5-turbo',
      budget_threshold: prompt?.budget_threshold ?? 0.8,
    });
  };

  if (!hasPermission('manage_prompts')) {
    return (
      <Page title="Prompt Management">
        <p>You do not have permission to manage prompts.</p>
      </Page>
    );
  }

  return (
    <Page title="Prompt Management">
      <p>Define and manage AI prompt definitions and fallback models.</p>
      <div className="space-y-4">
        {prompts.map((prompt: any) => (
          <Card key={prompt.id} className="p-4 flex justify-between items-start">
            <div>
              <h3 className="font-semibold">{prompt.key}</h3>
              <p className="text-sm">{prompt.description}</p>
              <p className="text-sm">Model: {prompt.model}</p>
              <p className="text-sm">Fallback: {prompt.fallback_model}</p>
              <p className="text-sm">Budget threshold: {prompt.budget_threshold}</p>
            </div>
            <Button onClick={() => startEdit(prompt)}>Edit</Button>
          </Card>
        ))}
        <Button onClick={() => startEdit(null)}>Add Prompt</Button>
      </div>
      {editingPrompt !== null && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-50 flex justify-center items-center z-50">
          <Card className="p-6 w-full max-w-lg">
            <h3 className="text-lg font-semibold mb-4">
              {form.id ? 'Edit Prompt' : 'Add Prompt'}
            </h3>
            <div className="space-y-2">
              <TextInput
                label="Key"
                value={form.key}
                onChange={(e: any) => setForm((f: any) => ({ ...f, key: e.target.value }))}
              />
              <TextInput
                label="Description"
                value={form.description}
                onChange={(e: any) => setForm((f: any) => ({ ...f, description: e.target.value }))}
              />
              <TextInput
                label="Primary Model"
                value={form.model}
                onChange={(e: any) => setForm((f: any) => ({ ...f, model: e.target.value }))}
              />
              <TextInput
                label="Fallback Model"
                value={form.fallback_model}
                onChange={(e: any) => setForm((f: any) => ({ ...f, fallback_model: e.target.value }))}
              />
              <TextInput
                label="Budget Threshold (0-1)"
                type="number"
                min={0}
                max={1}
                step={0.01}
                value={form.budget_threshold}
                onChange={(e: any) =>
                  setForm((f: any) => ({ ...f, budget_threshold: parseFloat(e.target.value) || 0 }))
                }
              />
            </div>
            <div className="flex justify-end mt-4 space-x-2">
              <Button variant="secondary" onClick={() => setEditingPrompt(null)}>
                Cancel
              </Button>
              <Button onClick={savePrompt}>Save</Button>
            </div>
          </Card>
        </div>
      )}
    </Page>
  );
}
