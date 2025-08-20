import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { SlidersHorizontal, X } from 'lucide-react';

const categories = [
  'communication', 'discipline', 'development', 'education', 
  'health', 'creativity', 'social_skills', 'emotional_intelligence',
  'independence', 'confidence', 'safety', 'nutrition'
];

const types = ['article', 'video', 'guide', 'research'];
const difficulties = ['beginner', 'intermediate', 'advanced'];

const FilterSection = ({ title, options, selected, onSelect, multiSelect = false }) => (
  <div className="mb-4">
    <h4 className="font-semibold text-sm text-gray-700 mb-2">{title}</h4>
    <div className="flex flex-wrap gap-2">
      {options.map(option => {
        const isSelected = multiSelect ? (selected || []).includes(option) : selected === option;
        return (
          <Button
            key={option}
            variant={isSelected ? 'default' : 'outline'}
            size="sm"
            onClick={() => onSelect(option)}
            className={`capitalize transition-all duration-200 rounded-full h-8 text-xs ${
              isSelected ? 'bg-blue-600 text-white shadow-md' : 'bg-white hover:bg-gray-100'
            }`}
          >
            {option.replace(/_/g, ' ')}
          </Button>
        );
      })}
    </div>
  </div>
);

export default function LibraryFilters({ currentFilters = {}, onFilterChange, onReset }) {
  // Ensure currentFilters has default values to prevent undefined access
  const filters = {
    categories: [],
    types: [],
    difficulty: null,
    ...currentFilters
  };

  const handleCategoryChange = (category) => {
    const newCategories = (filters.categories || []).includes(category)
      ? filters.categories.filter(c => c !== category)
      : [...(filters.categories || []), category];
    onFilterChange('categories', newCategories);
  };

  const handleTypeChange = (type) => {
    const newTypes = (filters.types || []).includes(type)
      ? filters.types.filter(t => t !== type)
      : [...(filters.types || []), type];
    onFilterChange('types', newTypes);
  };

  const handleDifficultyChange = (difficulty) => {
    const newDifficulty = filters.difficulty === difficulty ? null : difficulty;
    onFilterChange('difficulty', newDifficulty);
  };

  const hasActiveFilters = 
    (filters.categories || []).length > 0 || 
    (filters.types || []).length > 0 || 
    filters.difficulty;

  return (
    <Card className="mb-6 bg-white/70 backdrop-blur-sm border-0 shadow-md">
      <CardContent className="p-4">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-5 h-5 text-gray-700" />
            <h3 className="text-lg font-bold text-gray-800">Filter Resources</h3>
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
          title="Content Types" 
          options={types} 
          selected={filters.types} 
          onSelect={handleTypeChange} 
          multiSelect 
        />
        
        <FilterSection 
          title="Difficulty" 
          options={difficulties} 
          selected={filters.difficulty} 
          onSelect={handleDifficultyChange} 
        />

        {hasActiveFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-700">Active Filters:</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {(filters.categories || []).map(category => (
                <Badge key={category} variant="secondary" className="bg-blue-100 text-blue-800">
                  {category.replace(/_/g, ' ')}
                </Badge>
              ))}
              {(filters.types || []).map(type => (
                <Badge key={type} variant="secondary" className="bg-purple-100 text-purple-800">
                  {type}
                </Badge>
              ))}
              {filters.difficulty && (
                <Badge variant="secondary" className="bg-green-100 text-green-800">
                  {filters.difficulty}
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}