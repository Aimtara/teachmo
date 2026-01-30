import React from 'react';
import { Calendar } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function OfficeHours() {
  return (
    <Card>
      <CardContent className="p-6 text-center space-y-2">
        <Calendar className="w-16 h-16 mx-auto text-gray-400" />
        <p className="text-gray-900 font-medium">Office Hours temporarily unavailable.</p>
        <p className="text-sm text-gray-600">
          Office Hours was previously backed by Supabase and is being migrated to the Nhost/Hasura backend.
        </p>
      </CardContent>
    </Card>
  );
}
