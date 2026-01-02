import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// AIPromptLibrary page
//
// This interface allows administrators to manage all prompts used by
// Teachmo's AI features. It supports viewing, editing, versioning, and
// testing prompts. Administrators can maintain consistent voice and
// tone, update instructions as policies evolve, and experiment in a
// controlled environment.

export default function AIPromptLibrary() {
  return (
    <ProtectedRoute allowedRoles={['system_admin', 'admin']}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">AI Prompt Library</h1>
        <p className="mb-6 text-gray-700">
          Manage the prompts that drive Teachmo's AI features. View existing
          prompts, edit them with version control, and test changes before
          rolling them out.
        </p>
        <Card>
          <CardHeader>Prompts</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              A catalog of stored prompts will appear here. Select a prompt to
              view its history, edit its content, or duplicate it. A sandbox
              allows testing prompts with example inputs.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
