import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Messages() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Messages</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-slate-600">
          Messaging is now served from the unified Base44 routes and components.
        </CardContent>
      </Card>
    </div>
  );
}
