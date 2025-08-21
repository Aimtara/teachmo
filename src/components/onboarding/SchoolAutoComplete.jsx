import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Search, MapPin, Plus, Loader2 } from 'lucide-react';
import { searchSchools } from '@/api/functions';
import { submitSchoolParticipationRequest } from '@/api/functions';
import { useDebounce } from '@/components/shared/useDebounce';
import { useToast } from '@/components/ui/use-toast';

export default function SchoolAutoComplete({ onSelect, selectedSchool, placeholder = "Type your child's school name..." }) {
  const [query, setQuery] = useState(selectedSchool?.school_name || '');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showRequestForm, setShowRequestForm] = useState(false);
  const [isSubmittingRequest, setIsSubmittingRequest] = useState(false);
  const { toast } = useToast();
  
  const debouncedQuery = useDebounce(query, 300);

  useEffect(() => {
    if (debouncedQuery.length >= 2) {
      performSearch(debouncedQuery);
    } else {
      setResults([]);
      setShowResults(false);
    }
  }, [debouncedQuery]);

  const performSearch = async (searchQuery) => {
    setIsSearching(true);
    try {
      const { data } = await searchSchools({
        query: searchQuery,
        limit: 8
      });
      
      if (data.success) {
        setResults(data.schools);
        setShowResults(true);
      }
    } catch (error) {
      console.error('School search error:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSchool = (school) => {
    setQuery(school.school_name);
    setShowResults(false);
    onSelect(school);
  };

  const handleRequestSchool = async (schoolName, contactEmail = '') => {
    setIsSubmittingRequest(true);
    try {
      const { data } = await submitSchoolParticipationRequest({
        school_name: schoolName,
        contact_email: contactEmail,
        additional_notes: `Requested during child profile setup. Search query: "${query}"`
      });

      if (data.success) {
        toast({
          title: "School Request Submitted! 🎉",
          description: `We've received your request for ${schoolName}. We'll let you know when it's available!`
        });
        setShowRequestForm(false);
        setQuery('');
      } else {
        throw new Error(data.error || 'Failed to submit request');
      }
    } catch (error) {
      console.error('School request error:', error);
      toast({
        variant: "destructive",
        title: "Request Failed",
        description: error.message || "Could not submit your school request. Please try again."
      });
    } finally {
      setIsSubmittingRequest(false);
    }
  };

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-4"
          onFocus={() => {
            if (results.length > 0) setShowResults(true);
          }}
          onBlur={() => {
            // Delay hiding results to allow click on results
            setTimeout(() => setShowResults(false), 200);
          }}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 animate-spin" />
        )}
      </div>

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="absolute z-50 w-full mt-1 max-h-64 overflow-y-auto border shadow-lg bg-white">
          <div className="p-2">
            {results.map((school) => (
              <div
                key={school.school_id}
                onClick={() => handleSelectSchool(school)}
                className="flex items-center justify-between p-3 hover:bg-gray-50 cursor-pointer rounded-lg transition-colors"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{school.school_name}</span>
                    <Badge 
                      variant="secondary" 
                      className={`text-xs ${
                        school.school_type === 'public' ? 'bg-blue-100 text-blue-800' :
                        school.school_type === 'charter' ? 'bg-green-100 text-green-800' :
                        'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {school.school_type}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-3 h-3" />
                    <span>{school.district_name || school.state}</span>
                    {school.school_domain && (
                      <span className="text-gray-400">• {school.school_domain}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* No Results - Show Request Option */}
      {showResults && results.length === 0 && query.length >= 2 && !isSearching && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-white">
          <div className="p-4 text-center">
            <p className="text-gray-600 mb-3">Can't find your school?</p>
            <Button
              onClick={() => setShowRequestForm(true)}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Request "{query}"
            </Button>
          </div>
        </Card>
      )}

      {/* Request School Modal */}
      {showRequestForm && (
        <Card className="absolute z-50 w-full mt-1 border shadow-lg bg-white">
          <div className="p-4">
            <h3 className="font-medium mb-3">Request Your School</h3>
            <p className="text-sm text-gray-600 mb-4">
              We'll add "{query}" to our directory and notify you when it's available.
            </p>
            <div className="space-y-3">
              <Input
                placeholder="School contact email (optional)"
                type="email"
                id="contactEmail"
              />
              <div className="flex gap-2">
                <Button
                  onClick={() => {
                    const contactEmail = document.getElementById('contactEmail').value;
                    handleRequestSchool(query, contactEmail);
                  }}
                  disabled={isSubmittingRequest}
                  className="flex-1"
                >
                  {isSubmittingRequest ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    'Submit Request'
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowRequestForm(false)}
                  disabled={isSubmittingRequest}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}