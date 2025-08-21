import React from 'react';
import { Button } from "@/components/ui/button";
import { Landmark, Sprout, Music, BookOpen, Palette, Drama, FlaskConical, Plane, Dumbbell, Sparkles } from 'lucide-react';

const CATEGORIES = [
  { name: "Museums", icon: Landmark },
  { name: "Outdoors", icon: Sprout },
  { name: "Music", icon: Music },
  { name: "Story Time", icon: BookOpen },
  { name: "Art", icon: Palette },
  { name: "Theater", icon: Drama },
  { name: "STEM", icon: FlaskConical },
  { name: "Travel", icon: Plane },
  { name: "Sports", icon: Dumbbell },
  { name: "Festivals", icon: Sparkles },
];

export default function CategoryFilters({ onSelectCategory, isSearching }) {
  return (
    <div className="py-2">
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 custom-scrollbar">
        {CATEGORIES.map(category => (
          <Button
            key={category.name}
            variant="outline"
            className="flex-shrink-0 flex items-center gap-2 bg-white/80 backdrop-blur-sm"
            onClick={() => onSelectCategory(category.name)}
            disabled={isSearching}
          >
            <category.icon className="w-4 h-4" />
            {category.name}
          </Button>
        ))}
      </div>
    </div>
  );
}