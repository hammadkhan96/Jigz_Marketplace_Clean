import { useState, useEffect, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Search, Plus, LogIn, Filter, SortAsc, SortDesc, Clock, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import JobCard from "@/components/job-card";
import PostJobModal from "@/components/post-job-modal";
import ApplicationModal from "@/components/application-modal";
import { CitySearch } from "@/components/city-search";
import { CategorySearch } from "@/components/category-search";
import { useAuth } from "@/hooks/useAuth";
import type { JobWithApplications, SearchParams, SearchResult } from "@shared/schema";
import { jobCategories } from "@shared/categories";

// Using comprehensive job categories from shared/categories.ts
const categories = jobCategories;

const budgetRanges = [
  { label: "Any Budget", value: "any" },
  { label: "Less than $50", value: "0-50", min: 0, max: 50 },
  { label: "$50 - $250", value: "50-250", min: 50, max: 250 },
  { label: "$250 - $750", value: "250-750", min: 250, max: 750 },
  { label: "$750 - $3500", value: "750-3500", min: 750, max: 3500 },
  { label: "$3500+", value: "3500+", min: 3500, max: undefined }
];

const experienceLevels = [
  { label: "Any Experience", value: "any" },
  { label: "Entry Level", value: "entry" },
  { label: "Intermediate", value: "intermediate" },
  { label: "Expert", value: "expert" }
];

// Custom hook for debounced search
function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);
  
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);
    
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);
  
  return debouncedValue;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCity, setSelectedCity] = useState("All Locations");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("any");
  const [selectedExperienceLevel, setSelectedExperienceLevel] = useState("any");
  const [sortBy, setSortBy] = useState<'relevance' | 'date' | 'budget_low' | 'budget_high'>('relevance');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [isApplicationModalOpen, setIsApplicationModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<JobWithApplications | null>(null);

  // Debounce search term to reduce API calls
  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const budgetRange = budgetRanges.find(range => range.value === selectedBudgetRange);

  // Build search parameters
  const searchParams: SearchParams = useMemo(() => ({
    query: debouncedSearchTerm || undefined,
    category: selectedCategory !== "All Categories" ? selectedCategory : undefined,
    location: selectedCity !== "All Locations" ? selectedCity : undefined,
    experienceLevel: selectedExperienceLevel !== "any" ? selectedExperienceLevel : undefined,
    minBudget: budgetRange?.min,
    maxBudget: budgetRange?.max,
    page: currentPage,
    limit: 20,
    sortBy,
    sortOrder
  }), [debouncedSearchTerm, selectedCategory, selectedCity, selectedExperienceLevel, budgetRange, currentPage, sortBy, sortOrder]);

  // Reset page when search parameters change
  useEffect(() => {
    if (currentPage !== 1) {
      setCurrentPage(1);
    }
  }, [debouncedSearchTerm, selectedCategory, selectedCity, selectedExperienceLevel, selectedBudgetRange, sortBy, sortOrder]);

  const { data: searchResult, isLoading, error } = useQuery<SearchResult>({
    queryKey: ["/api/search/jobs", searchParams],
    queryFn: async () => {
      const params = new URLSearchParams();
      
      Object.entries(searchParams).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      
      const url = `/api/search/jobs?${params.toString()}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Search failed');
      return res.json();
    },
    enabled: true, // Always enabled for real-time search
    staleTime: 30000, // Cache results for 30 seconds
  });

  const jobs = searchResult?.jobs || [];
  const pagination = searchResult?.pagination;
  const searchMeta = searchResult?.searchMeta;

  const handleApplyToJob = (job: JobWithApplications) => {
    setSelectedJob(job);
    setIsApplicationModalOpen(true);
  };

  // Sorting handlers
  const handleSortChange = useCallback((newSortBy: string) => {
    if (newSortBy === sortBy) {
      // Toggle sort order if same sort option is selected
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy as 'relevance' | 'date' | 'budget_low' | 'budget_high');
      setSortOrder('desc');
    }
  }, [sortBy, sortOrder]);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm("");
    setSelectedCity("All Locations");
    setSelectedCategory("All Categories");
    setSelectedBudgetRange("any");
    setSelectedExperienceLevel("any");
    setSortBy('relevance');
    setSortOrder('desc');
    setCurrentPage(1);
  }, []);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchTerm) count++;
    if (selectedCity !== "All Locations") count++;
    if (selectedCategory !== "All Categories") count++;
    if (selectedBudgetRange !== "any") count++;
    if (selectedExperienceLevel !== "any") count++;
    return count;
  }, [searchTerm, selectedCity, selectedCategory, selectedBudgetRange, selectedExperienceLevel]);



  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {isAuthenticated ? "Find Local Jobs Near You" : "Browse Available Jobs"}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {isAuthenticated 
            ? "Connect with people in your community who need help with everyday tasks"
            : "Discover opportunities in your area. Sign up to apply for jobs and post your own."
          }
        </p>
        {isAuthenticated ? (
          <Button 
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              setIsPostJobModalOpen(true);
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white"
            size="lg"
          >
            <Plus className="h-5 w-5 mr-2" />
            Post a Job
          </Button>
        ) : (
          <Button 
            onClick={() => window.location.href = "/login"}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            size="lg"
          >
            <LogIn className="h-5 w-5 mr-2" />
            Login to Post Job
          </Button>
        )}
      </div>

      {/* Search and Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          {/* Full-width search bar */}
          <div className="mb-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search jobs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {/* Filter dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <CitySearch
                value={selectedCity}
                onValueChange={setSelectedCity}
                placeholder="All Locations"
              />
            </div>
            <div>
              <CategorySearch
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="All Categories"
                includeAllCategories={true}
              />
            </div>
            <div>
              <Select value={selectedExperienceLevel} onValueChange={setSelectedExperienceLevel}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Experience" />
                </SelectTrigger>
                <SelectContent>
                  {experienceLevels.map((level) => (
                    <SelectItem key={level.label} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedBudgetRange} onValueChange={setSelectedBudgetRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Budget" />
                </SelectTrigger>
                <SelectContent>
                  {budgetRanges.map((range) => (
                    <SelectItem key={range.label} value={range.value}>
                      {range.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Button 
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCity("All Locations");
                  setSelectedCategory("All Categories");
                  setSelectedBudgetRange("any");
                  setSelectedExperienceLevel("any");
                }}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search Results Header with Performance Metrics */}
      {searchResult && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="text-sm text-gray-600">
              {searchTerm ? (
                <>Showing {pagination?.total || 0} result{(pagination?.total || 0) !== 1 ? 's' : ''} for "{searchTerm}"</>
              ) : (
                <>Found {pagination?.total || 0} job{(pagination?.total || 0) !== 1 ? 's' : ''}</>
              )}
            </div>
            {searchMeta && (
              <div className="flex items-center gap-2 text-xs text-gray-500">
                <Clock className="h-3 w-3" />
                {searchMeta.executionTime}ms
              </div>
            )}
            {activeFiltersCount > 0 && (
              <Badge variant="outline" className="text-xs">
                <Filter className="h-3 w-3 mr-1" />
                {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>

          {/* Sort Controls */}
          <div className="flex items-center gap-2">
            <Select value={sortBy} onValueChange={handleSortChange}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">
                  <div className="flex items-center gap-2">
                    <Search className="h-3 w-3" />
                    Relevance
                  </div>
                </SelectItem>
                <SelectItem value="date">
                  <div className="flex items-center gap-2">
                    <Clock className="h-3 w-3" />
                    Date
                  </div>
                </SelectItem>
                <SelectItem value="budget_low">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Budget (Low)
                  </div>
                </SelectItem>
                <SelectItem value="budget_high">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-3 w-3" />
                    Budget (High)
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSortChange(sortBy)}
              className="px-2"
            >
              {sortOrder === 'asc' ? <SortAsc className="h-4 w-4" /> : <SortDesc className="h-4 w-4" />}
            </Button>
            {activeFiltersCount > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="text-xs"
              >
                Clear All
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Job Listings */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-64 w-full" />
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-red-600 mb-2">Search Error</h3>
            <p className="text-gray-600 mb-4">
              There was a problem searching for jobs. Please try again.
            </p>
            <Button onClick={() => window.location.reload()} variant="outline">
              Reload Page
            </Button>
          </CardContent>
        </Card>
      ) : jobs.length > 0 ? (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {jobs.map((job: JobWithApplications) => (
              <JobCard
                key={job.id}
                job={job}
                onApply={handleApplyToJob}
              />
            ))}
          </div>

          {/* Pagination */}
          {pagination && pagination.pages > 1 && (
            <div className="mt-8 flex justify-center items-center gap-4">
              <Button
                variant="outline"
                disabled={!pagination.hasPrev}
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-600">
                  Page {pagination.page} of {pagination.pages}
                </span>
              </div>
              <Button
                variant="outline"
                disabled={!pagination.hasNext}
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedCity !== "All Locations" || selectedCategory !== "All Categories" || selectedBudgetRange !== "any" || selectedExperienceLevel !== "any"
                ? "Try adjusting your search filters"
                : "Be the first to post a job in your area"}
            </p>
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();

                setIsPostJobModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Post a Job
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <PostJobModal
        isOpen={isPostJobModalOpen}
        onClose={() => setIsPostJobModalOpen(false)}
      />
      
      <ApplicationModal
        isOpen={isApplicationModalOpen}
        onClose={() => setIsApplicationModalOpen(false)}
        job={selectedJob}
      />
    </div>
  );
}
