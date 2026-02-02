import React, { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserData } from '@nhost/react';
import { ArrowLeft, Sparkles, Compass, Calendar, BookOpen } from 'lucide-react';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { navigateToDashboard } from '@/components/utils/navigationHelpers';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { ActivityGridSkeleton } from '@/components/shared/ImprovedSkeletons';

// Lazy load tab contents to optimize initial load
const PersonalizedDiscoverFeed = React.lazy(() => import('@/components/discover/PersonalizedDiscoverFeed'));
const ActivitiesTab = React.lazy(() => import('@/components/discover/ActivitiesTab'));
const EventsTab = React.lazy(() => import('@/components/discover/EventsTab'));
const LibraryTab = React.lazy(() => import('@/components/discover/LibraryTab'));

export default function Discover() {
  const navigate = useNavigate();
  const user = useUserData();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'foryou';

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50/50">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumbs segments={['Discover']} />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Discover</h1>
          <p className="text-gray-600 max-w-2xl">
            Explore personalized resources, activities, and events.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" className="gap-2" onClick={() => navigateToDashboard(user, navigate)}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
        </div>
      </header>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="border-b border-gray-200">
          <TabsList className="bg-transparent h-auto p-0 space-x-6">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 bg-transparent text-gray-600 data-[state=active]:text-blue-600"
            >
              <Sparkles className="w-4 h-4 mr-2" />For You
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 bg-transparent text-gray-600 data-[state=active]:text-blue-600"
            >
              <Compass className="w-4 h-4 mr-2" />Activities
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 bg-transparent text-gray-600 data-[state=active]:text-blue-600"
            >
              <Calendar className="w-4 h-4 mr-2" />Events
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none px-2 py-3 bg-transparent text-gray-600 data-[state=active]:text-blue-600"
            >
              <BookOpen className="w-4 h-4 mr-2" />Library
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-[500px]">
          <Suspense
            fallback={(
              <div className="space-y-8">
                <Skeleton className="h-64 w-full rounded-xl" />
                <ActivityGridSkeleton count={3} />
              </div>
            )}
          >
            <TabsContent value="foryou" className="mt-0 focus-visible:outline-none">
              <PersonalizedDiscoverFeed />
            </TabsContent>
            <TabsContent value="activities" className="mt-0 focus-visible:outline-none">
              <ActivitiesTab />
            </TabsContent>
            <TabsContent value="events" className="mt-0 focus-visible:outline-none">
              <EventsTab />
            </TabsContent>
            <TabsContent value="library" className="mt-0 focus-visible:outline-none">
              <LibraryTab />
            </TabsContent>
          </Suspense>
        </div>
      </Tabs>
    </div>
  );
}
