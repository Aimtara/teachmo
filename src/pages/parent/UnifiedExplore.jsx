import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import ActivitiesTab from '@/components/explore/ActivitiesTab';
import EventsTab from '@/components/explore/EventsTab';
import ForYouTab from '@/components/explore/ForYouTab';
import LibraryTab from '@/components/explore/LibraryTab';

const TABS = {
  FOR_YOU: 'for-you',
  ACTIVITIES: 'activities',
  EVENTS: 'events',
  LIBRARY: 'library'
};

export default function UnifiedExplore() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || TABS.FOR_YOU;
  const [activeTab, setActiveTab] = useState(initialTab);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Explore</h1>
        <p className="text-gray-600">
          Discover activities, events, and resources for your family.
        </p>
      </header>

      <div className="flex border-b border-gray-200 mb-6 overflow-x-auto">
        {Object.values(TABS).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 font-medium text-sm whitespace-nowrap border-b-2 transition-colors ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.replace('-', ' ').toUpperCase()}
          </button>
        ))}
      </div>

      <main className="min-h-[50vh]">
        {activeTab === TABS.FOR_YOU && <ForYouTab />}
        {activeTab === TABS.ACTIVITIES && <ActivitiesTab />}
        {activeTab === TABS.EVENTS && <EventsTab />}
        {activeTab === TABS.LIBRARY && <LibraryTab />}
      </main>
    </div>
  );
}
