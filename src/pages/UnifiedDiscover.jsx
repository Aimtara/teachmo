import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import GlobalSearch from '@/components/shared/GlobalSearch';
import RecommendationsTab from '@/components/discover/RecommendationsTab';
import ActivitiesTab from '@/components/discover/ActivitiesTab';
import EventsTab from '@/components/discover/EventsTab';
import LibraryTab from '@/components/discover/LibraryTab';
import ShortsDiscoverTab from '@/components/discover/ShortsDiscoverTab';

export default function UnifiedDiscover() {
  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <Tabs defaultValue="for-you" className="w-full">
        <div className="sticky top-0 z-30 space-y-3 border-b bg-white px-4 py-3">
          <h1 className="text-xl font-bold text-slate-900">Discover</h1>
          <GlobalSearch placeholder="Try 'Math games' or 'Weekend events'..." />

          <TabsList className="no-scrollbar w-full justify-start gap-2 overflow-x-auto bg-transparent p-0">
            <TabsTrigger value="for-you" className="rounded-full border px-4 data-[state=active]:bg-slate-900 data-[state=active]:text-white">
              For You
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-full border px-4 data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
              Activities
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-full border px-4 data-[state=active]:bg-orange-500 data-[state=active]:text-white">
              Events
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-full border px-4 data-[state=active]:bg-emerald-600 data-[state=active]:text-white">
              Library
            </TabsTrigger>
            <TabsTrigger value="shorts" className="rounded-full border px-4 data-[state=active]:bg-pink-600 data-[state=active]:text-white">
              Shorts
            </TabsTrigger>
          </TabsList>
        </div>

        <div className="mx-auto max-w-7xl space-y-6 p-4">
          <TabsContent value="for-you" className="mt-0">
            <RecommendationsTab />
          </TabsContent>
          <TabsContent value="activities" className="mt-0">
            <ActivitiesTab />
          </TabsContent>
          <TabsContent value="events" className="mt-0">
            <EventsTab />
          </TabsContent>
          <TabsContent value="library" className="mt-0">
            <LibraryTab />
          </TabsContent>
          <TabsContent value="shorts" className="mt-0">
            <ShortsDiscoverTab />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
