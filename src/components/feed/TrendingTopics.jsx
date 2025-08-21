import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { TrendingUp, Hash } from 'lucide-react';

export default function TrendingTopics() {
  const trendingTopics = [
    { tag: 'ToddlerLife', posts: 234 },
    { tag: 'SchoolPrep', posts: 189 },
    { tag: 'PlayTime', posts: 156 },
    { tag: 'HealthyEating', posts: 143 },
    { tag: 'BedtimeStruggles', posts: 128 },
    { tag: 'CreativeKids', posts: 98 },
    { tag: 'OutdoorFun', posts: 87 }
  ];

  return (
    <Card className="bg-white/80 backdrop-blur-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <TrendingUp className="w-5 h-5 text-orange-500" />
          Trending Topics
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {trendingTopics.map((topic, index) => (
          <button
            key={topic.tag}
            className="w-full text-left p-2 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Hash className="w-4 h-4 text-gray-400" />
                <span className="font-medium text-gray-900">#{topic.tag}</span>
              </div>
              <Badge variant="secondary" className="text-xs">
                {topic.posts}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-1 ml-6">
              {topic.posts} posts this week
            </p>
          </button>
        ))}
      </CardContent>
    </Card>
  );
}