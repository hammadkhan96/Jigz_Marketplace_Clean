import { useState, useEffect, useRef, useCallback } from "react";
import { ChevronDown, MapPin, Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { topCities } from "@shared/cities";

interface CitySearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export function CitySearch({ value, onValueChange, placeholder = "Select city...", className }: CitySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [availableCities, setAvailableCities] = useState<string[]>(topCities.slice(0, 50));
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Reset search when dropdown closes
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm("");
      setHasSearched(false);
      setAvailableCities(topCities.slice(0, 50));
      setIsLoading(false);
    }
  }, [isOpen]);

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Search cities with proper debouncing and error handling
  const searchCities = useCallback(async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setAvailableCities(topCities.slice(0, 50));
      setHasSearched(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setHasSearched(true);

    try {
      const response = await fetch(`/api/cities/search?q=${encodeURIComponent(query)}&limit=1000`);
      if (response.ok) {
        const cities = await response.json();
        setAvailableCities(cities.length > 0 ? cities : []);
      } else {
        console.error('Failed to search cities');
        setAvailableCities([]);
      }
    } catch (error) {
      console.error('City search error:', error);
      setAvailableCities([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Debounced search effect
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Set new timeout for search
    searchTimeoutRef.current = setTimeout(() => {
      searchCities(searchTerm);
    }, 300);

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchTerm, searchCities]);

  // Handle input change with immediate feedback
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    
    // Immediately show initial cities if search is cleared
    if (!value.trim()) {
      setAvailableCities(topCities.slice(0, 50));
      setHasSearched(false);
      setIsLoading(false);
    }
  };

  // Handle city selection
  const handleSelect = (city: string) => {
    onValueChange(city);
    setIsOpen(false);
    setSearchTerm("");
    setHasSearched(false);
  };

  // Handle dropdown toggle
  const toggleDropdown = () => {
    setIsOpen(!isOpen);
  };

  // Handle backdrop click
  const handleBackdropClick = () => {
    setIsOpen(false);
  };

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [isOpen]);

  return (
    <div className={cn("relative", className)}>
      {/* Main Button */}
      <button
        type="button"
        onClick={toggleDropdown}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 hover:border-gray-400 transition-colors"
      >
        <div className="flex items-center min-w-0 flex-1">
          <MapPin className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
          <span className="text-sm text-gray-900 truncate">
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className={cn(
          "h-4 w-4 text-gray-400 ml-2 flex-shrink-0 transition-transform",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100000]" 
            onClick={handleBackdropClick}
          />
          
          {/* Dropdown Container */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[100001] w-full max-h-96 overflow-hidden">
            {/* Search Input */}
            <div className="p-3 border-b border-gray-200 bg-gray-50">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  ref={inputRef}
                  type="text"
                  placeholder="Search from 48,000+ cities worldwide..."
                  value={searchTerm}
                  onChange={handleInputChange}
                  className="w-full pl-10 pr-10 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                {searchTerm && (
                  <button
                    type="button"
                    onClick={() => setSearchTerm("")}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 hover:bg-gray-200 rounded"
                  >
                    <X className="h-3 w-3 text-gray-400" />
                  </button>
                )}
              </div>
            </div>
            
            {/* Cities List */}
            <div className="overflow-y-auto max-h-80">
              {isLoading ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500 mx-auto mb-2"></div>
                  Searching cities...
                </div>
              ) : availableCities.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-gray-500">
                  {hasSearched ? (
                    <>
                      <p className="mb-2">No cities found for "{searchTerm}"</p>
                      <p className="text-xs text-gray-400">Try a different search term</p>
                    </>
                  ) : (
                    <p>No cities available</p>
                  )}
                </div>
              ) : (
                <div className="py-1">
                  {availableCities.map((city, index) => (
                    <button
                      key={`${city}-${index}`}
                      type="button"
                      onClick={() => handleSelect(city)}
                      className="w-full px-4 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none focus:ring-1 focus:ring-blue-500 flex items-center transition-colors"
                    >
                      <MapPin className="h-4 w-4 mr-3 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{city}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {!isLoading && availableCities.length > 0 && (
              <div className="px-4 py-2 border-t border-gray-200 bg-gray-50 text-xs text-gray-500 text-center">
                {hasSearched 
                  ? `Showing ${availableCities.length} cities for "${searchTerm}"`
                  : `Showing ${availableCities.length} popular cities`
                }
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}