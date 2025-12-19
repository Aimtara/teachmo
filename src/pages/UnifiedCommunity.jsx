import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, MessageCircle, Plus } from "lucide-react";

export default function UnifiedCommunity() {
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Community</h1>
          <p className="text-gray-600">
            Community feed + pods + messaging are being migrated from Base44 into GitHub.
          </p>
        </div>

        <Button disabled className="shrink-0">
          <Plus className="w-4 h-4 mr-2" />
          New post
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Feed
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            PostCard + likes + replies will be brought in next (with safe entity adapters).
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="w-5 h-5" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Conversations UI exists in Base44. We’ll migrate it behind feature flags once API wiring is stable.
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6">
          <p className="text-sm text-gray-700">
            Next parity step: bring over Base44 <code>PostCard</code>, <code>CommunityPods</code>,
            and the reporting modal (with a stubbed <code>submitReport</code> function).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
