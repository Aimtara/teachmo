import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Sparkles, BookOpen, Target } from "lucide-react";

export default function UnifiedDiscover() {
  return (
    <div className="p-6 space-y-6">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Discover</h1>
          <p className="text-gray-600">
            Personalized recommendations are being migrated from Base44 into this GitHub repo.
          </p>
        </div>

        <Button variant="outline" className="shrink-0">
          <Search className="w-4 h-4 mr-2" />
          Search
        </Button>
      </header>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Feed + ranking logic will be ported next. This page is now routable and safe to iterate on.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Activities
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Activity discovery cards + save flows will be reconnected once entity/function adapters are finalized.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" />
              Resources
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Resource detail routing is ready in the route map; component parity work will wire it up.
          </CardContent>
        </Card>
      </div>

      <Card className="border-dashed">
        <CardContent className="p-6">
          <p className="text-sm text-gray-700">
            Next parity step: migrate Base44 <code>PersonalizedDiscoverFeed</code> + its UI components,
            and add a safe data adapter that falls back gracefully when backend calls are unavailable.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
