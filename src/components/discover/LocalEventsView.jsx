
import React, { useState, useEffect, useCallback } from "react";
import { realEventSearch } from "@/api/functions";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, MapPin, AlertTriangle, Sparkles, Calendar, Filter } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import LocalEventCard from "./LocalEventCard";
import EventFilters from "./EventFilters";
import { debounce } from "lodash";

export default function LocalEventsView({ user, selectedChild, generalCategoryFilter }) {
    const [searchLocation, setSearchLocation] = useState(user?.location || "");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [error, setError] = useState(null);
    const [hasSearched, setHasSearched] = useState(false);
    const [searchMeta, setSearchMeta] = useState(null);
    
    const [filters, setFilters] = useState({
        dateRange: 'all',
        price: 'all',
        category: 'all',
    });

    // Auto-search on load if user has location
    useEffect(() => {
        if (user?.location && !hasSearched) {
            performSearch(user.location, filters, selectedChild, generalCategoryFilter);
        }
    }, [user, selectedChild, generalCategoryFilter]);

    // Re-search when filters change
    useEffect(() => {
        if (hasSearched && searchLocation) {
            performSearch(searchLocation, filters, selectedChild, generalCategoryFilter);
        }
    }, [filters, selectedChild, generalCategoryFilter]);

    const performSearch = useCallback(async (location, currentFilters, child, generalCategory) => {
        if (!location?.trim()) {
            setError("Please enter a location to search for events.");
            setIsSearching(false);
            return;
        }

        setIsSearching(true);
        setError(null);
        setSearchResults([]);
        setHasSearched(true);

        const age = child ? (typeof child.age === 'object' ? child.age.years : child.age) : null;

        try {
            const { data } = await realEventSearch({
                location: location,
                ageGroup: age ? `${age}` : 'all',
                interests: child?.interests || [],
                dateRange: currentFilters.dateRange,
                price: currentFilters.price,
                categories: currentFilters.category !== 'all' ? [currentFilters.category] : (generalCategory && generalCategory !== 'all' ? [generalCategory] : ['all']),
                radius: 25
            });

            if (data.success) {
                setSearchResults(data.events || []);
                setSearchMeta(data.meta);
                
                // Show special notice if using mock data
                if (data.meta?.search_method === "Mock Data Fallback") {
                    setError("⚠️ Showing sample events. AI-powered search is temporarily unavailable due to API limits. Real event search will return soon!");
                } else if (!data.events || data.events.length === 0) {
                    setError("No events found for this location and criteria. Try expanding your search area or adjusting filters.");
                }
            } else {
                setError(data.error || "An error occurred during search.");
            }
        } catch (err) {
            console.error("Event search failed:", err);
            
            // More user-friendly error messages
            if (err.message?.includes('500')) {
                setError("Event search is temporarily unavailable. Our team is working to restore the service. Please try again in a few minutes.");
            } else if (err.message?.includes('Network')) {
                setError("Connection issue detected. Please check your internet connection and try again.");
            } else {
                setError("Unable to search for events right now. Please try again later.");
            }
        }
        setIsSearching(false);
    }, []);

    const handleManualSearch = (e) => {
        e.preventDefault();
        performSearch(searchLocation, filters, selectedChild, generalCategoryFilter);
    };

    const getFilterSummary = () => {
        const activeSummary = [];
        if (filters.dateRange !== 'all') {
            const dateLabels = {
                today: 'Today',
                this_week: 'This Week', 
                this_weekend: 'This Weekend'
            };
            activeSummary.push(dateLabels[filters.dateRange]);
        }
        if (filters.price !== 'all') {
            activeSummary.push(filters.price === 'free' ? 'Free Events' : 'Paid Events');
        }
        if (filters.category !== 'all') {
            activeSummary.push(filters.category.charAt(0).toUpperCase() + filters.category.slice(1));
        }
        if (selectedChild) {
            activeSummary.push(`For ${selectedChild.name} (${selectedChild.age}yo)`);
        }
        
        return activeSummary.length > 0 ? activeSummary.join(' • ') : 'All Events';
    };

    return (
        <div className="space-y-6">
            {/* Enhanced Search Header with Better Guidance */}
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
                <CardHeader className="pb-4">
                    <CardTitle className="flex items-center gap-2">
                        <MapPin className="w-5 h-5 text-red-500" />
                        Discover Local Events
                        {searchMeta && (
                            <Badge variant="outline" className="ml-2">
                                {searchMeta.total_found} events found
                            </Badge>
                        )}
                    </CardTitle>
                    {selectedChild && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Sparkles className="w-4 h-4" />
                            <span>Personalized for {selectedChild.name} ({selectedChild.age} years old)</span>
                            {selectedChild.interests && selectedChild.interests.length > 0 && (
                                <span>• Interests: {selectedChild.interests.join(', ')}</span>
                            )}
                        </div>
                    )}
                    {!user?.location && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mt-3">
                            <p className="text-sm text-yellow-800">
                                💡 <strong>Tip:</strong> Add your location in settings to get more accurate event recommendations!
                            </p>
                        </div>
                    )}
                </CardHeader>
                <CardContent className="space-y-4">
                    <form onSubmit={handleManualSearch} className="flex flex-col sm:flex-row gap-2">
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                            <Input
                                placeholder="Enter your city, state, or zip code..."
                                value={searchLocation}
                                onChange={(e) => setSearchLocation(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <Button type="submit" disabled={isSearching} className="gap-2" style={{backgroundColor: 'var(--teachmo-sage)'}}>
                            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                            {isSearching ? 'Searching...' : 'Find Events'}
                        </Button>
                    </form>
                    
                    {/* Enhanced Filters with visual feedback */}
                    <div className="space-y-3">
                        <EventFilters filters={filters} onFiltersChange={setFilters} />
                        
                        {hasSearched && (
                            <div className="flex items-center justify-between text-sm">
                                <div className="flex items-center gap-2 text-gray-600">
                                    <Filter className="w-4 h-4" />
                                    <span>Showing: {getFilterSummary()}</span>
                                </div>
                                {searchMeta?.sources_used && (
                                    <div className="text-xs text-gray-500">
                                        Sources: {searchMeta.sources_used.join(', ')}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Enhanced Error Display with actionable guidance */}
            {error && (
                <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription className="flex flex-col gap-2">
                        <span>{error}</span>
                        {!searchLocation && (
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => setSearchLocation(user?.location || '')}
                                className="self-start"
                            >
                                {user?.location ? `Try "${user.location}"` : 'Enter your location'}
                            </Button>
                        )}
                    </AlertDescription>
                </Alert>
            )}

            {/* Loading State */}
            {isSearching && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i} className="animate-pulse border-0 shadow-md">
                            <CardContent className="p-6 space-y-4">
                                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                                <div className="h-3 bg-gray-200 rounded"></div>
                                <div className="h-3 bg-gray-200 rounded w-5/6"></div>
                                <div className="flex gap-2">
                                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Results Grid */}
            <AnimatePresence>
                {searchResults.length > 0 && !isSearching && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                    >
                        {/* Results Summary */}
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-semibold text-gray-900">
                                Events Near {searchLocation}
                            </h3>
                            <div className="text-sm text-gray-500">
                                {searchResults.length} events • Sorted by relevance
                            </div>
                        </div>

                        {/* Event Cards */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {searchResults.map((event, index) => (
                                <motion.div
                                    key={event.id}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                >
                                    <LocalEventCard 
                                        event={event} 
                                        child={selectedChild}
                                        showRelevanceScore={true}
                                    />
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State */}
            {!isSearching && !error && searchResults.length === 0 && hasSearched && (
                <div className="text-center py-12">
                    <Calendar className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No Events Found</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        We couldn't find any events matching your criteria in {searchLocation}. Try expanding your search area or adjusting your filters.
                    </p>
                    <Button 
                        onClick={() => setFilters({ dateRange: 'all', price: 'all', category: 'all' })}
                        variant="outline"
                    >
                        Clear All Filters
                    </Button>
                </div>
            )}

            {/* Welcome State */}
            {!hasSearched && !user?.location && (
                <div className="text-center py-12">
                    <Search className="w-16 h-16 mx-auto text-gray-300 mb-4" />
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Discover Local Events</h3>
                    <p className="text-gray-500 mb-6 max-w-md mx-auto">
                        Enter your location above to find family-friendly events and activities in your area.
                    </p>
                </div>
            )}
        </div>
    );
}
