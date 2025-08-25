import { useState, useEffect } from "react";
import { ChevronDown, MapPin } from "lucide-react";
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
  const [availableCities, setAvailableCities] = useState<string[]>(topCities.slice(0, 20));
  const [isLoading, setIsLoading] = useState(false);

  // Search cities via API when user types
  useEffect(() => {
    const searchCities = async () => {
      if (searchTerm.length < 2) {
        setAvailableCities(topCities.slice(0, 20));
        return;
      }

      setIsLoading(true);
      try {
        const response = await fetch(`/api/cities/search?q=${encodeURIComponent(searchTerm)}&limit=100`);
        if (response.ok) {
          const cities = await response.json();
          setAvailableCities(cities);
        } else {
          console.error('Failed to search cities');
          setAvailableCities(topCities.slice(0, 20));
        }
      } catch (error) {
        console.error('City search error:', error);
        setAvailableCities(topCities.slice(0, 20));
      } finally {
        setIsLoading(false);
      }
    };

    const debounceTimer = setTimeout(searchCities, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchTerm]);

  const handleSelect = (city: string) => {
    onValueChange(city);
    setIsOpen(false);
    setSearchTerm("");
  };

  return (
    <div className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <div className="flex items-center">
          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
          <span className="text-sm text-gray-900 truncate">
            {value || placeholder}
          </span>
        </div>
        <ChevronDown className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100000]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[100001] max-h-64 overflow-hidden w-full">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search from 48,000+ cities worldwide..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            
            {/* Scrollable List */}
            <div className="overflow-y-auto max-h-48" style={{ scrollbarWidth: 'thin' }}>
              {isLoading ? (
                <div className="px-3 py-6 text-center text-sm text-gray-500">
                  Searching cities...
                </div>
              ) : availableCities.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No city found. Try a different search term.
                </div>
              ) : (
                availableCities.map((city) => (
                  <button
                    key={`${city}-${Math.random()}`}
                    type="button"
                    onClick={() => handleSelect(city)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none flex items-center"
                  >
                    <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                    <span>{city}</span>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}