import { useNavigate } from 'react-router-dom';
import { useUserData } from '@nhost/react';
import { ArrowLeft, Compass, Search, Sparkles } from 'lucide-react';
import PersonalizedDiscoverFeed from '@/components/discover/PersonalizedDiscoverFeed';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { navigateToDashboard } from '@/components/utils/navigationHelpers';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function UnifiedDiscover() {
  const navigate = useNavigate();
  const user = useUserData();

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumbs segments={['UnifiedDiscover']} />
          <h1 className="text-3xl font-semibold text-gray-900">Discover</h1>
          <p className="text-gray-600">
            Personalized recommendations for families and classrooms, powered by the Nhost stack.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={() => navigateToDashboard(user, navigate)}>
            <ArrowLeft className="h-4 w-4" />
            Back to dashboard
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/library')}>
            <Search className="h-4 w-4" />
            Search library
          </Button>
        </div>
      </header>

      <PersonalizedDiscoverFeed />

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Always available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Discover gracefully handles missing backend functions so migration work never blocks the UI.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Compass className="h-5 w-5" />
              Explore by topic
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            Browse by subject, grade, and interest tags to build a classroom-ready learning path.
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Resource deep links
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-600">
            The route map keeps breadcrumbs synced with GitHub so content can be traced and tested quickly.
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
