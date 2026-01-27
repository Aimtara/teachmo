import React, { useCallback, useMemo, useState } from 'react';

type AskIntent = {
  tab?: string | null;
  query?: string;
};

type AskTeachmoProps = {
  defaultTab?: string;
  onIntentHandled?: (tab: string, query: string) => void;
  navigateTo?: (path: string) => void;
};

const ALLOWED_TABS = ['overview', 'recommendations', 'history', 'safety'];

function normalizeTab(tab?: string | null, fallback: string): string {
  if (!tab) return fallback;
  return ALLOWED_TABS.includes(tab) ? tab : fallback;
}

export default function AskTeachmo({ defaultTab = 'overview', onIntentHandled, navigateTo }: AskTeachmoProps) {
  const [question, setQuestion] = useState('');
  const [activeTab, setActiveTab] = useState(() => normalizeTab(defaultTab, 'overview'));

  const navigateFn = useMemo(
    () =>
      navigateTo ??
      ((path: string) => {
        if (typeof window !== 'undefined') {
          window.location.hash = path;
        } else {
          console.info('Navigation requested:', path);
        }
      }),
    [navigateTo],
  );

  const handleIntent = useCallback(
    (intent: AskIntent) => {
      const safeTab = normalizeTab(intent?.tab, 'overview');
      if (safeTab !== intent?.tab) {
        console.warn(`Blocked navigation to invalid AskTeachmo tab "${intent?.tab}", defaulting to "${safeTab}".`);
      }

      const path = `/ask?tab=${safeTab}`;
      navigateFn(path);
      setActiveTab(safeTab);
      onIntentHandled?.(safeTab, intent?.query ?? '');
    },
    [navigateFn, onIntentHandled],
  );

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-base font-semibold text-gray-900">Ask Teachmo</p>
          <p className="text-sm text-gray-600">Get quick answers and guidance tailored to your role.</p>
        </div>
        <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-800">Tab: {activeTab}</span>
      </header>

      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <input
          aria-label="Ask Teachmo question"
          className="flex-1 rounded border border-gray-300 px-3 py-2 text-sm focus:border-sky-500 focus:outline-none focus:ring-2 focus:ring-sky-500"
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="How do I onboard a new parent?"
          value={question}
        />
        <button
          className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!question.trim()}
          onClick={() => handleIntent({ tab: activeTab, query: question.trim() })}
          type="button"
        >
          Submit
        </button>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {ALLOWED_TABS.map((tab) => (
          <button
            key={tab}
            className={`rounded-full px-3 py-1 ${tab === activeTab ? 'bg-sky-100 text-sky-800' : 'bg-gray-100 text-gray-700'}`}
            onClick={() => handleIntent({ tab })}
            type="button"
          >
            {tab}
          </button>
        ))}
      </div>
    </div>
  );
}

export { AskTeachmo };
