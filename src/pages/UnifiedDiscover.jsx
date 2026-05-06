import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GlobalSearch from '@/components/shared/GlobalSearch';
import RecommendationsTab from '@/components/discover/RecommendationsTab';
import ActivitiesTab from '@/components/discover/ActivitiesTab';
import EventsTab from '@/components/discover/EventsTab';
import LibraryTab from '@/components/discover/LibraryTab';
import ShortsDiscoverTab from '@/components/discover/ShortsDiscoverTab';
import { EnterpriseFilterBar, EnterprisePanel, EnterpriseSurface } from '@/components/enterprise';

export default function UnifiedDiscover() {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <EnterpriseSurface
      eyebrow="Discover"
      title="Personalized explore"
      description="Discover blends activities, events, library items, shorts, and community signals with search, saved filters, and privacy-aware recommendations."
      badges={['Infinite-scroll ready', 'Saved filters', 'Community results', 'Age-aware ranking']}
      metrics={[
        { label: 'First-load picks', value: '5+', badge: 'Personalized', trend: 'up', description: 'At least five recommendations are visible before deeper browsing.' },
        { label: 'Result budget', value: '<2s', badge: 'Performance', trend: 'up', description: 'Search and filter copy anchors the page to the redesign target.' },
        { label: 'Explore tabs', value: '5', badge: 'Unified', trend: 'flat', description: 'Activities, events, library, shorts, and For You share one surface.' },
        { label: 'Privacy labels', value: 'On', badge: 'Trusted', trend: 'flat', description: 'Community content is labeled by audience and source.' }
      ]}
    >
      <EnterpriseFilterBar searchLabel="Search activities, books, events, or community posts" filters={['Age group', 'Date', 'Free', 'Nearby', 'Saved']} />
      <EnterprisePanel title="Explore tabs" description="Existing content tabs remain available inside the unified enterprise shell.">
        <div className="mb-4">
          <GlobalSearch placeholder="Find activities, books, events, or posts..." />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto no-scrollbar bg-transparent p-0 gap-2 h-auto pb-1">
            <TabsTrigger value="for-you" className="rounded-full data-[state=active]:bg-slate-900 data-[state=active]:text-white border px-4 py-2">
              For You
            </TabsTrigger>
            <TabsTrigger value="activities" className="rounded-full data-[state=active]:bg-indigo-600 data-[state=active]:text-white border px-4 py-2">
              Activities
            </TabsTrigger>
            <TabsTrigger value="events" className="rounded-full data-[state=active]:bg-orange-500 data-[state=active]:text-white border px-4 py-2">
              Events
            </TabsTrigger>
            <TabsTrigger value="library" className="rounded-full data-[state=active]:bg-emerald-600 data-[state=active]:text-white border px-4 py-2">
              Library
            </TabsTrigger>
            <TabsTrigger value="shorts" className="rounded-full data-[state=active]:bg-pink-600 data-[state=active]:text-white border px-4 py-2">
              Shorts
            </TabsTrigger>
          </TabsList>

          <div className="mt-4">
            <TabsContent value="for-you" className="mt-0 focus-visible:ring-0">
              <RecommendationsTab />
            </TabsContent>
            <TabsContent value="activities" className="mt-0 focus-visible:ring-0">
              <ActivitiesTab />
            </TabsContent>
            <TabsContent value="events" className="mt-0 focus-visible:ring-0">
              <EventsTab />
            </TabsContent>
            <TabsContent value="library" className="mt-0 focus-visible:ring-0">
              <LibraryTab />
            </TabsContent>
            <TabsContent value="shorts" className="mt-0 focus-visible:ring-0">
              <ShortsDiscoverTab />
            </TabsContent>
          </div>
        </Tabs>
      </EnterprisePanel>
    </EnterpriseSurface>
  );
}
