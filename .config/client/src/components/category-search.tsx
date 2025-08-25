import { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { jobCategories, categoriesWithoutAll } from "@shared/categories";

interface CategorySearchProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  includeAllCategories?: boolean;
}

export function CategorySearch({ 
  value, 
  onValueChange, 
  placeholder = "Select category...", 
  includeAllCategories = false 
}: CategorySearchProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Use all categories with "All Categories" or without based on prop
  const baseCategories = includeAllCategories ? jobCategories : categoriesWithoutAll;

  // Lazy filtering - only filter when search query changes
  const filteredCategories = useMemo(() => {
    if (!searchQuery) {
      return baseCategories;
    }

    const query = searchQuery.toLowerCase();
    return baseCategories.filter(category =>
      category.toLowerCase().includes(query)
    );
  }, [searchQuery, baseCategories]);

  const handleSelect = (category: string) => {
    onValueChange(category);
    setIsOpen(false);
    setSearchQuery("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3 py-2 border border-gray-300 rounded-md bg-white text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
      >
        <span className="text-sm text-gray-900">
          {value || placeholder}
        </span>
        <ChevronDown className="h-4 w-4 text-gray-400" />
      </button>

      {isOpen && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-[100000]" 
            onClick={() => setIsOpen(false)}
          />
          
          {/* Dropdown */}
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-md shadow-lg z-[100001] max-h-64 overflow-hidden">
            {/* Search Input */}
            <div className="p-2 border-b border-gray-200">
              <input
                type="text"
                placeholder="Search categories..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                autoFocus
              />
            </div>
            
            {/* Scrollable List */}
            <div className="overflow-y-auto max-h-48" style={{ scrollbarWidth: 'thin' }}>
              {filteredCategories.length === 0 ? (
                <div className="px-3 py-2 text-sm text-gray-500">
                  No category found.
                </div>
              ) : (
                filteredCategories.map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => handleSelect(category)}
                    className="w-full px-3 py-2 text-left text-sm hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    {category}
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