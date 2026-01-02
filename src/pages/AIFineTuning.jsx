import React from 'react';
import ProtectedRoute from '@/components/shared/ProtectedRoute';
import { Card, CardHeader, CardContent } from '@/components/ui/card';

// AIFineTuning page
//
// This page allows system administrators to manage fine-tuned AI models for
// specific enterprise needs. It provides an interface to view existing
// custom models, track their training status, and initiate new fine-tuning
// jobs. The actual training pipeline will run on the backend and is
// configured separately.

export default function AIFineTuning() {
  return (
    <ProtectedRoute allowedRoles={['system_admin']}>
      <div className="p-4">
        <h1 className="text-2xl font-bold mb-4">AI Fine-Tuning Management</h1>
        <p className="mb-6 text-gray-700">
          Configure and deploy custom fine-tuned models. These models allow
          Teachmo to better serve specific curricula, cultural contexts, or
          enterprise-specific requirements while maintaining safety and
          reliability.
        </p>
        <Card>
          <CardHeader>Fine-Tuned Models</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              A list of custom models will appear here with status (draft,
              training, live, archived) and usage metrics. You can select a
              model to view details or decommission it.
            </p>
          </CardContent>
        </Card>
        <Card className="mt-4">
          <CardHeader>Create New Model</CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Upload training datasets and configure hyperparameters to
              initiate a fine-tuning job. A wizard will guide you through
              selecting the base model, specifying epochs, and estimating
              compute costs.
            </p>
          </CardContent>
        </Card>
      </div>
    </ProtectedRoute>
  );
}
