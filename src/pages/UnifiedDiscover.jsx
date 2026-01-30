import React, { Suspense } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useUserData } from '@nhost/react';
import { ArrowLeft, Search, Sparkles, Compass, Calendar, BookOpen } from 'lucide-react';
import Breadcrumbs from '@/components/shared/Breadcrumbs';
import { navigateToDashboard } from '@/components/utils/navigationHelpers';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';

const PersonalizedDiscoverFeed = React.lazy(() => import('@/components/discover/PersonalizedDiscoverFeed'));
const ActivitiesTab = React.lazy(() => import('@/components/discover/ActivitiesTab'));
const EventsTab = React.lazy(() => import('@/components/discover/EventsTab'));
const LibraryTab = React.lazy(() => import('@/components/discover/LibraryTab'));

export default function UnifiedDiscover() {
  const navigate = useNavigate();
  const user = useUserData();
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'foryou';

  const handleTabChange = (value) => {
    setSearchParams({ tab: value });
  };

  const TabLoading = () => (
    <div className="space-y-4 mt-4">
      <Skeleton className="h-32 w-full rounded-lg" />
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    </div>
  );

  return (
    <div className="p-6 space-y-6 min-h-screen bg-gray-50/50">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <Breadcrumbs segments={['UnifiedDiscover']} />
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Discover</h1>
          <p className="text-gray-600 max-w-2xl">
            Explore personalized resources, activities, and events for your classroom and family.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" className="gap-2" onClick={() => navigateToDashboard(user, navigate)}>
            <ArrowLeft className="h-4 w-4" />
            Dashboard
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/discover?tab=library&search=true')}>
          <Button variant="outline" className="gap-2" onClick={() => navigate('/library?search=true')}>
            <Search className="h-4 w-4" />
            Global Search
          </Button>
        </div>
      </header>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full space-y-6">
        <div className="border-b border-gray-200">
          <TabsList className="bg-transparent h-auto p-0 space-x-6">
            <TabsTrigger
              value="foryou"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              For You
            </TabsTrigger>
            <TabsTrigger
              value="activities"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
            >
              <Compass className="w-4 h-4 mr-2" />
              Activities
            </TabsTrigger>
            <TabsTrigger
              value="events"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Events
            </TabsTrigger>
            <TabsTrigger
              value="library"
              className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 data-[state=active]:shadow-none rounded-none px-2 py-3 bg-transparent hover:bg-transparent"
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Library
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="min-h-[500px]">
          <Suspense fallback={<TabLoading />}>
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
