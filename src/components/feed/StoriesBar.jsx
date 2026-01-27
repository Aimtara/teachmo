import React from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Camera } from 'lucide-react';

export default function StoriesBar({ user }) {
  const mockStories = [
    { id: 1, user: 'Sarah M.', avatar: null, hasStory: true },
    { id: 2, user: 'Mike R.', avatar: null, hasStory: true },
    { id: 3, user: 'Emma K.', avatar: null, hasStory: true },
    { id: 4, user: 'David L.', avatar: null, hasStory: false },
  ];

  return (
    <Card className="p-4 bg-white/80 backdrop-blur-sm mb-6">
      <div className="flex items-center gap-4 overflow-x-auto">
        {/* Add Story Button */}
        <div className="flex-shrink-0 text-center">
          <button className="relative w-16 h-16 rounded-full bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center mb-2 hover:scale-105 transition-transform">
            <Plus className="w-6 h-6 text-white" />
          </button>
          <p className="text-xs text-gray-600 font-medium">Your Story</p>
        </div>

        {/* Stories */}
        {mockStories.map((story) => (
          <div key={story.id} className="flex-shrink-0 text-center">
            <button className={`relative w-16 h-16 rounded-full flex items-center justify-center mb-2 hover:scale-105 transition-transform ${
              story.hasStory 
                ? 'bg-gradient-to-br from-orange-400 to-pink-500 p-0.5' 
                : 'bg-gray-200'
            }`}>
              <div className={`w-full h-full rounded-full flex items-center justify-center ${
                story.hasStory ? 'bg-white p-0.5' : ''
              }`}>
                {story.avatar ? (
                  <img src={story.avatar} alt={story.user} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className={`w-full h-full rounded-full flex items-center justify-center ${
                    story.hasStory ? 'bg-gray-100' : 'bg-gray-200'
                  }`}>
                    <span className="text-sm font-semibold text-gray-600">
                      {story.user.split(' ').map(n => n[0]).join('')}
                    </span>
                  </div>
                )}
              </div>
            </button>
            <p className="text-xs text-gray-600 font-medium truncate w-16">
              {story.user.split(' ')[0]}
            </p>
          </div>
        ))}
      </div>
    </Card>
  );
}

export { StoriesBar };
