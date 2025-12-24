import React from 'react';
import { useUserData } from '@nhost/react';
import EnhancedAIAssistant from '@/components/ai/EnhancedAIAssistant';
import { Card } from '@/components/ui/card';

export default function AIAssistant() {
  const user = useUserData();
  return (
    <div className="p-6">
      <Card className="max-w-5xl mx-auto">
        <EnhancedAIAssistant user={user} />
      </Card>
    </div>
  );
}
