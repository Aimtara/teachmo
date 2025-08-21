import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar, DollarSign, Tag, Clock } from "lucide-react";

const DATE_RANGES = {
  all: "Any Date",
  today: "Today",
  this_week: "This Week", 
  this_weekend: "This Weekend",
};

const PRICE_RANGES = {
  all: "Any Price",
  free: "Free Only",
  paid: "Paid Events",
};

const CATEGORIES = [
  { value: "all", label: "All Categories" },
  { value: "creative", label: "Arts & Crafts" },
  { value: "educational", label: "Learning & Science" },
  { value: "physical", label: "Sports & Active" },
  { value: "social", label: "Community & Social" },
  { value: "emotional", label: "Wellness & Mindfulness" },
  { value: "music", label: "Music & Performance" },
  { value: "outdoor", label: "Outdoor Adventures" },
  { value: "science", label: "STEM & Discovery" },
  { value: "art", label: "Visual Arts" }
];

export default function EventFilters({ filters, onFiltersChange }) {
  const handleFilterChange = (key, value) => {
    onFiltersChange(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg border">
      {/* Date Range Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Calendar className="w-4 h-4" />
          When
        </label>
        <Select value={filters.dateRange} onValueChange={(value) => handleFilterChange('dateRange', value)}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select date range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(DATE_RANGES).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <span>{value}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Price Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <DollarSign className="w-4 h-4" />
          Price
        </label>
        <Select value={filters.price} onValueChange={(value) => handleFilterChange('price', value)}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select price range" />
          </SelectTrigger>
          <SelectContent>
            {Object.entries(PRICE_RANGES).map(([key, value]) => (
              <SelectItem key={key} value={key}>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-4 h-4" />
                  <span>{value}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {/* Category Filter */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-gray-700 flex items-center gap-1">
          <Tag className="w-4 h-4" />
          Category
        </label>
        <Select value={filters.category} onValueChange={(value) => handleFilterChange('category', value)}>
          <SelectTrigger className="bg-white">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((category) => (
              <SelectItem key={category.value} value={category.value}>
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4" />
                  <span>{category.label}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}