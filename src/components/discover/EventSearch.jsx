import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, Loader2, Sparkles } from "lucide-react";

export default function EventSearch({ onSearch, isSearching }) {
  const [query, setQuery] = useState("");

  const handleSearchClick = () => {
    if (query.trim()) {
      onSearch(query.trim());
    }
  };
  
  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearchClick();
    }
  };

  const suggestedSearches = [
    "story time library",
    "kids art classes",
    "family outdoor activities",
    "science museums",
    "music lessons children"
  ];

  return (
    <div className="space-y-3">
      <div className="flex gap-2 p-2 rounded-xl bg-white/90 backdrop-blur-sm shadow-md">
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Search for family activities, classes, or events..."
          className="flex-grow border-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
        <Button 
          onClick={handleSearchClick} 
          disabled={isSearching || !query.trim()}
          style={{backgroundColor: 'var(--teachmo-sage)'}}
        >
          {isSearching ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : (
            <Search className="w-5 h-5" />
          )}
        </Button>
      </div>
      
      {!isSearching && (
        <div className="flex flex-wrap gap-2">
          <span className="text-xs text-gray-500 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Try:
          </span>
          {suggestedSearches.map((suggestion, index) => (
            <Button
              key={index}
              variant="ghost"
              size="sm"
              onClick={() => {
                setQuery(suggestion);
                onSearch(suggestion);
              }}
              className="text-xs h-6 px-2 text-gray-600 hover:bg-gray-100"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}