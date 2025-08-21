import React from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SlidersHorizontal, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const categories = [
  "creative", "educational", "physical", "social", 
  "emotional", "problem_solving", "science", "art", 
  "music", "outdoor"
];

const durations = ["<15 min", "15-30 min", "30-60 min", ">60 min"];
const ages = ["0-2", "3-5", "6-8", "9-12", "13+"];

const FilterSection = ({ title, options, selected, onSelect, multiSelect = false }) => (
  <div className="mb-4">
    <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const isSelected = multiSelect ? (selected || []).includes(option) : selected === option;
        return (
          <motion.div key={option} whileTap={{ scale: 0.95 }}>
            <Button
              variant={isSelected ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSelect(option)}
              className={`capitalize transition-all duration-200 rounded-full h-8 text-xs ${isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-100'}`}
            >
              {option.replace(/_/g, ' ')}
            </Button>
          </motion.div>
        );
      })}
    </div>
  </div>
);

export default function ActivityFilters({ currentFilters = {}, onFilterChange, onReset }) {
  // Ensure currentFilters has default values to prevent undefined access
  const filters = {
    categories: [],
    duration: null,
    age: null,
    ...currentFilters
  };

  const handleCategoryChange = (category) => {
    const newCategories = (filters.categories || []).includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...(filters.categories || []), category];
    onFilterChange('categories', newCategories);
  };

  const handleDurationChange = (duration) => {
    const newDuration = filters.duration === duration ? null : duration;
    onFilterChange('duration', newDuration);
  };

  const handleAgeChange = (age) => {
    const newAge = filters.age === age ? null : age;
    onFilterChange('age', newAge);
  };

  const hasActiveFilters = 
    (filters.categories || []).length > 0 || 
    filters.duration || 
    filters.age;

  return (
    <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-800">Filter Activities</h3>
          </div>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" onClick={onReset} className="text-sm text-blue-600 hover:text-blue-700">
              <X className="w-4 h-4 mr-1" />
              Reset All
            </Button>
          )}
        </div>
        <FilterSection 
          title="Categories" 
          options={categories} 
          selected={filters.categories} 
          onSelect={handleCategoryChange} 
          multiSelect 
        />
        <FilterSection 
          title="Duration" 
          options={durations} 
          selected={filters.duration} 
          onSelect={handleDurationChange} 
        />
        <FilterSection 
          title="Age Group" 
          options={ages} 
          selected={filters.age} 
          onSelect={handleAgeChange} 
        />
      </CardContent>
    </Card>
  );
}