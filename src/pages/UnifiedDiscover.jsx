import React, { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import GlobalSearch from '@/components/shared/GlobalSearch';
import RecommendationsTab from '@/components/discover/RecommendationsTab';
import ActivitiesTab from '@/components/discover/ActivitiesTab';
import EventsTab from '@/components/discover/EventsTab';
import LibraryTab from '@/components/discover/LibraryTab';
import ShortsDiscoverTab from '@/components/discover/ShortsDiscoverTab';

export default function UnifiedDiscover() {
  const [activeTab, setActiveTab] = useState('for-you');

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-0">
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-3 space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-900">Discover</h1>
        </div>

        <GlobalSearch placeholder="Find activities, books, or events..." />

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
      </div>
    </div>
  );
}
