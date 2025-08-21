import React, { useState, useEffect } from 'react';
import ShortsRail from '@/components/shorts/ShortsRail';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Search, Filter } from 'lucide-react';

export default function ShortsDiscoverTab({ initialQuery = '', appliedFilters = {}, onFiltersChange }) {
  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [topicFilter, setTopicFilter] = useState(appliedFilters.topic || '');
  const [patternFilter, setPatternFilter] = useState(appliedFilters.pattern || '');
  
  useEffect(() => {
    // Notify parent of filter changes
    onFiltersChange?.({
      topic: topicFilter,
      pattern: patternFilter,
      search: searchTerm
    });
  }, [searchTerm, topicFilter, patternFilter, onFiltersChange]);

  return (
    <div className="space-y-6">
      {/* Search and Filters */}
      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search shorts by topic..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={topicFilter} onValueChange={setTopicFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Topics</SelectItem>
                <SelectItem value="math">Math</SelectItem>
                <SelectItem value="reading">Reading</SelectItem>
                <SelectItem value="science">Science</SelectItem>
                <SelectItem value="social">Social Skills</SelectItem>
              </SelectContent>
            </Select>

            <Select value={patternFilter} onValueChange={setPatternFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Patterns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>All Patterns</SelectItem>
                <SelectItem value="playful">Playful</SelectItem>
                <SelectItem value="structured">Structured</SelectItem>
                <SelectItem value="co_reg">Co-Regulation</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Popular Shorts */}
      <ShortsRail 
        title="Popular Shorts"
        topic={topicFilter || searchTerm}
      />

      {/* Recent Shorts */}
      <ShortsRail 
        title="Recently Added"
        topic={topicFilter || searchTerm}
      />

      {/* By Category */}
      {!topicFilter && !searchTerm && (
        <>
          <ShortsRail title="Math & Numbers" topic="math" />
          <ShortsRail title="Reading & Language" topic="reading" />
          <ShortsRail title="Science & Discovery" topic="science" />
        </>
      )}
    </div>
  );
}