import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Search, Filter, MapPin, Clock, Star, DollarSign, Tag, User, Plus, X, Upload, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { getCurrencySymbol } from "@shared/currencies";
import { jobCategories } from "@shared/categories";
import { topCities, allWorldCities } from "@shared/cities";
import { apiRequest } from "@/lib/queryClient";
import type { ServiceWithRequests, InsertService } from "@shared/schema";
import type { ApiError } from "@/types/interfaces";
import { CoinWarning } from "@/components/ui-components/coin-display";
import { CurrencySearch } from "@/components/search/currency-search";
import { CitySearch } from "@/components/search/city-search";
import { CategorySearch } from "@/components/search/category-search";

const CATEGORIES = jobCategories;
const LOCATIONS = topCities;
const LOCATION_OPTIONS = topCities.filter(loc => loc !== "All Locations");

const BUDGET_RANGES = [
  { label: "Any Budget", value: "any" },
  { label: "Less than $50", value: "0-50", min: 0, max: 50 },
  { label: "$50 - $250", value: "50-250", min: 50, max: 250 },
  { label: "$250 - $750", value: "250-750", min: 250, max: 750 },
  { label: "$750 - $3500", value: "750-3500", min: 750, max: 3500 },
  { label: "$3500+", value: "3500+", min: 3500, max: undefined }
];

// Type definitions for form data
interface InquiryPayload {
  serviceId: string;
  message: string;
  contactEmail: string;
  contactPhone: string;
}

interface ServiceFormData {
  title: string;
  description: string;
  category: string;
  location: string;
  specificArea?: string;
  priceFrom: number;
  priceTo?: number;
  priceType: string;
  currency: string;
  deliveryTime: string;
  serviceDuration?: string;
  experienceLevel: string;
  website?: string;
  tags?: string[];
  email?: string;
  phone?: string;
}

// Extended error type for coin-related errors
interface CoinError extends ApiError {
  coinsNeeded?: number;
  coinsAvailable?: number;
}

const EXPERIENCE_LEVELS = [
  { value: "any", label: "Any Level" },
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "expert", label: "Expert" }
];

const formatTimeAgo = (date: Date | string | null) => {
  if (!date) return "Recently";
  
  const now = new Date();
  const past = new Date(date);
  const diffInMinutes = Math.floor((now.getTime() - past.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 60) {
    return `${diffInMinutes} minutes ago`;
  }
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return `${diffInHours} hours ago`;
  }
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) {
    return `${diffInDays} days ago`;
  }
  
  const diffInMonths = Math.floor(diffInDays / 30);
  return `${diffInMonths} months ago`;
};

export default function Services() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All Categories");
  const [selectedLocation, setSelectedLocation] = useState("All Locations");
  const [selectedBudgetRange, setSelectedBudgetRange] = useState("any");
  const [selectedExperience, setSelectedExperience] = useState("any");
  const [showPostService, setShowPostService] = useState(false);
  
  // Inquiry modal state
  const [showInquiryModal, setShowInquiryModal] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceWithRequests | null>(null);
  const [inquiryData, setInquiryData] = useState({
    message: "",
    contactEmail: "",
    contactPhone: ""
  });

  // Service form state
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    location: "",
    specificArea: "",
    priceFrom: "",
    priceTo: "",
    priceType: "per_project",
    currency: "USD",
    experienceLevel: "intermediate",
    deliveryTime: "",
    serviceDuration: "",
    website: "",
    email: "",
    phone: "",
    tags: ""
  });

  // Image upload state (matching job form)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);

  // Coin error state for insufficient coins
  const [coinError, setCoinError] = useState<{ coinsNeeded: number; coinsAvailable: number } | null>(null);

  // Location search state
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // Category search state
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  // Specific area editing state
  const [isSpecificAreaEditing, setIsSpecificAreaEditing] = useState(false);

  // Reset form data
  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      location: "",
      specificArea: "",
      priceFrom: "",
      priceTo: "",
      priceType: "per_project",
      currency: "USD",
      experienceLevel: "intermediate",
      deliveryTime: "",
      serviceDuration: "",
      website: "",
      email: "",
      phone: "",
      tags: ""
    });
    setSelectedFiles([]);
    setLocationSearch("");
    setShowLocationDropdown(false);
    setCategorySearch("");
    setShowCategoryDropdown(false);
  };

  // Image handling functions (matching job form)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 images
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Filter locations based on search
  const filteredLocations = useMemo(() => {
    const searchTerm = locationSearch || formData.location;
    if (!searchTerm) return LOCATION_OPTIONS.slice(0, 15);
    
    // Use comprehensive world cities database for searching
    const filtered = allWorldCities.filter(location => 
      location.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Return top results from comprehensive search
    return filtered.slice(0, 15);
  }, [locationSearch, formData.location]);

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    const searchTerm = categorySearch || formData.category;
    if (!searchTerm) return CATEGORIES.filter(cat => cat !== "All Categories").slice(0, 10);
    return CATEGORIES.filter(category => 
      category !== "All Categories" && 
      category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [categorySearch, formData.category]);

  // Get budget range object
  const budgetRange = BUDGET_RANGES.find(range => range.value === selectedBudgetRange);

  // Active filters count
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (searchQuery) count++;
    if (selectedLocation !== "All Locations") count++;
    if (selectedCategory !== "All Categories") count++;
    if (selectedBudgetRange !== "any") count++;
    if (selectedExperience !== "any") count++;
    return count;
  }, [searchQuery, selectedLocation, selectedCategory, selectedBudgetRange, selectedExperience]);

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedLocation("All Locations");
    setSelectedCategory("All Categories");
    setSelectedBudgetRange("any");
    setSelectedExperience("any");
  };

  // Service inquiry mutation
  const submitInquiryMutation = useMutation({
    mutationFn: async (inquiryPayload: InquiryPayload) => {
      const response = await fetch(`/api/services/${inquiryPayload.serviceId}/requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inquiryPayload.message,
          budget: 1, // Minimum valid budget to pass validation
          timeline: "Flexible", // Default timeline since field is removed
          contactEmail: inquiryPayload.contactEmail,
          contactPhone: inquiryPayload.contactPhone
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to send inquiry");
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Inquiry Sent!",
        description: "Your inquiry has been sent to the service provider. They will contact you soon. 1 coin has been deducted."
      });
      setShowInquiryModal(false);
      setSelectedService(null);
      setInquiryData({
        message: "",
        contactEmail: "",
        contactPhone: ""
      });
    },
    onError: (error: Error | ApiError) => {
      // Check if it's a coin-related error
      if (error.message && error.message.includes("insufficient coins")) {
        toast({
          title: "Insufficient Coins",
          description: "You need 1 coin to send an inquiry. Visit the Buy Coins page to get more coins.",
          variant: "destructive"
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to send inquiry. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Handle inquiry form submission
  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedService) return;
    
    // Basic validation
    if (!inquiryData.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a message describing your inquiry.",
        variant: "destructive"
      });
      return;
    }


    


    const inquiryPayload = {
      serviceId: selectedService.id,
      message: inquiryData.message,
      contactEmail: inquiryData.contactEmail,
      contactPhone: inquiryData.contactPhone
    };

    submitInquiryMutation.mutate(inquiryPayload);
  };

  // Create service mutation (matching job form approach)
  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: ServiceFormData) => {
      const formDataToSend = new FormData();
      
      // Append service data
      Object.entries(serviceData).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          formDataToSend.append(key, value.toString());
        }
      });
      
      // Append images
      selectedFiles.forEach((file) => {
        formDataToSend.append("images", file);
      });

      const res = await fetch("/api/services", {
        method: "POST",
        body: formDataToSend,
      });

      if (!res.ok) {
        throw new Error("Failed to create service");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      setCoinError(null);
      toast({
        title: "Service submitted!",
        description: "Your service has been submitted for admin approval. You'll be notified once it's reviewed. 20 coins have been deducted.",
      });
      setShowPostService(false);
      resetForm();
    },
    onError: (error: Error | ApiError | CoinError) => {
      console.error("Error posting service:", error);
      
      // Check if it's a coin-related error
      if ('coinsNeeded' in error && 'coinsAvailable' in error && error.coinsNeeded && error.coinsAvailable !== undefined) {
        setCoinError({
          coinsNeeded: error.coinsNeeded,
          coinsAvailable: error.coinsAvailable
        });
        return;
      }
      
      toast({
        title: "Error",
        description: error.message || "Failed to submit service. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Basic validation
    if (!formData.title.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a service title.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.description.trim()) {
      toast({
        title: "Validation Error", 
        description: "Please enter a service description.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.category) {
      toast({
        title: "Validation Error",
        description: "Please select a category.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.location.trim()) {
      toast({
        title: "Validation Error",
        description: "Please enter a location.",
        variant: "destructive",
      });
      return;
    }
    
    if (!formData.priceFrom || parseFloat(formData.priceFrom) <= 0) {
      toast({
        title: "Validation Error",
        description: "Please enter a valid starting price.",
        variant: "destructive",
      });
      return;
    }

    // Prepare service data
    const serviceData = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      category: formData.category,
      location: formData.location.trim(),
      priceFrom: parseFloat(formData.priceFrom),
      priceTo: formData.priceTo ? parseFloat(formData.priceTo) : undefined,
      priceType: formData.priceType,
      currency: formData.currency,
      experienceLevel: formData.experienceLevel,
      deliveryTime: formData.deliveryTime,
      serviceDuration: formData.serviceDuration,
      website: formData.website.trim(),
      email: formData.email.trim(),
      phone: formData.phone.trim(),
      tags: formData.tags ? formData.tags.split(',').map((tag: string) => tag.trim()).filter((tag: string) => tag.length > 0) : [],
    };

    createServiceMutation.mutate(serviceData);
  };

  // Get user coins - only for authenticated users
  const { data: userCoinsData } = useQuery({
    queryKey: ["/api/user/coins"],
    enabled: !!user,
  });

  const userCoins = (userCoinsData as { coins: number })?.coins || 0;

  // Fetch services
  const { data: services = [], isLoading } = useQuery<ServiceWithRequests[]>({
    queryKey: ["/api/services", { 
      query: searchQuery,
      category: selectedCategory === "All Categories" ? undefined : selectedCategory,
      location: selectedLocation === "All Locations" ? undefined : selectedLocation,
      experienceLevel: selectedExperience === "any" ? undefined : selectedExperience,
      budgetRange: selectedBudgetRange === "any" ? undefined : selectedBudgetRange
    }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("query", searchQuery);
      if (selectedCategory !== "All Categories") params.append("category", selectedCategory);
      if (selectedLocation !== "All Locations") params.append("location", selectedLocation);
      if (selectedExperience !== "any") params.append("experienceLevel", selectedExperience);
      if (budgetRange?.min !== undefined) params.append("minBudget", budgetRange.min.toString());
      if (budgetRange?.max !== undefined) params.append("maxBudget", budgetRange.max.toString());
      
      const response = await fetch(`/api/services?${params}`);
      if (!response.ok) {
        throw new Error("Failed to fetch services");
      }
      const data = await response.json();
      return data.services || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  const handleSearch = () => {
    // Query will automatically refetch due to dependency on searchQuery
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-900 mb-4">
          {user ? "Offer Your Services" : "Browse Available Services"}
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto mb-8">
          {user 
            ? "Share your skills with people in your community who need expert help"
            : "Discover professional services in your area. Sign up to inquire about services and offer your own."
          }
        </p>
        {user ? (
          <Dialog open={showPostService} onOpenChange={setShowPostService}>
            <DialogTrigger asChild>
              <Button 
                className="bg-blue-600 hover:bg-blue-700 text-white"
                size="lg"
              >
                <Plus className="h-5 w-5 mr-2" />
                Post a Service
              </Button>
            </DialogTrigger>
            <DialogContent className="w-screen h-screen max-w-none max-h-none m-0 rounded-none sm:w-[896px] sm:h-auto sm:max-w-4xl sm:max-h-[90vh] sm:m-4 sm:rounded-lg overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Post a Service</DialogTitle>
              </DialogHeader>
              {coinError && (
                <CoinWarning 
                  coinsNeeded={coinError.coinsNeeded} 
                  coinsAvailable={coinError.coinsAvailable} 
                />
              )}

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Service Title */}
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="title">Service Title *</Label>
                    <span className={`text-xs ${formData.title.length > 100 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.title.length}/100
                    </span>
                  </div>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => {
                      if (e.target.value.length <= 100) {
                        setFormData(prev => ({ ...prev, title: e.target.value }));
                      }
                    }}
                    placeholder="e.g., Professional Logo Design Service"
                    className="mt-1"
                    maxLength={100}
                  />
                </div>

                {/* Service Description */}
                <div>
                  <div className="flex justify-between items-center">
                    <Label htmlFor="description">Description *</Label>
                    <span className={`text-xs ${formData.description.length > 1500 ? 'text-red-500' : 'text-gray-500'}`}>
                      {formData.description.length}/1500
                    </span>
                  </div>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => {
                      if (e.target.value.length <= 1500) {
                        setFormData(prev => ({ ...prev, description: e.target.value }));
                      }
                    }}
                    placeholder="Describe your service, what you'll deliver, and what makes you unique..."
                    rows={4}
                    className="mt-1"
                    maxLength={1500}
                  />
                </div>

                {/* Category and Location */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Category *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="category"
                        value={formData.category}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, category: value }));
                          setCategorySearch(value);
                          setShowCategoryDropdown(value.length > 0);
                        }}
                        onFocus={() => {
                          setCategorySearch(formData.category);
                          setShowCategoryDropdown(true);
                        }}
                        onBlur={() => {
                          setTimeout(() => setShowCategoryDropdown(false), 200);
                        }}
                        placeholder="Search categories..."
                        className="w-full"
                      />
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      
                      {showCategoryDropdown && filteredCategories.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-[100] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                          {filteredCategories.slice(0, 10).map((category) => (
                            <div
                              key={category}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onMouseDown={(e) => {
                                e.preventDefault();
                              }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, category }));
                                setCategorySearch("");
                                setShowCategoryDropdown(false);
                              }}
                            >
                              <Tag className="h-3 w-3 inline mr-2 text-gray-400" />
                              {category}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="location">Location *</Label>
                    <div className="relative mt-1">
                      <Input
                        id="location"
                        value={formData.location}
                        onChange={(e) => {
                          const value = e.target.value;
                          setFormData(prev => ({ ...prev, location: value }));
                          setLocationSearch(value);
                          setShowLocationDropdown(value.length > 0);
                        }}
                        onFocus={() => {
                          setLocationSearch(formData.location);
                          setShowLocationDropdown(true);
                        }}
                        onBlur={() => {
                          // Delay hiding dropdown to allow clicks
                          setTimeout(() => setShowLocationDropdown(false), 200);
                        }}
                        placeholder="Search locations"
                        className="w-full"
                      />
                      <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                      
                      {showLocationDropdown && filteredLocations.length > 0 && (
                        <div className="absolute top-full left-0 right-0 z-[100] bg-white border border-gray-200 rounded-md shadow-lg max-h-48 overflow-y-auto mt-1">
                          {filteredLocations.slice(0, 10).map((location) => (
                            <div
                              key={location}
                              className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b border-gray-100 last:border-b-0"
                              onMouseDown={(e) => {
                                // Prevent onBlur from firing before onClick
                                e.preventDefault();
                              }}
                              onClick={() => {
                                setFormData(prev => ({ ...prev, location }));
                                setLocationSearch("");
                                setShowLocationDropdown(false);
                              }}
                            >
                              <MapPin className="h-3 w-3 inline mr-2 text-gray-400" />
                              {location}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Specific Area */}
                <div>
                  <Label htmlFor="specificArea">Specific Area (Optional)</Label>
                  {isSpecificAreaEditing ? (
                    <div className="flex flex-col sm:flex-row gap-2 mt-1">
                      <Input
                        id="specificArea"
                        placeholder="e.g., Downtown, Upper East Side, Financial District"
                        value={formData.specificArea}
                        onChange={(e) => setFormData(prev => ({ ...prev, specificArea: e.target.value }))}
                        className="flex-1"
                        autoFocus
                        onBlur={() => setIsSpecificAreaEditing(false)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            setIsSpecificAreaEditing(false);
                          }
                          if (e.key === 'Escape') {
                            setIsSpecificAreaEditing(false);
                          }
                        }}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => setIsSpecificAreaEditing(false)}
                        className="w-full sm:w-auto"
                      >
                        Done
                      </Button>
                    </div>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full justify-start text-left h-auto p-3 mt-1"
                      onClick={() => setIsSpecificAreaEditing(true)}
                    >
                      <div className="flex flex-col items-start text-left">
                        <span className="text-sm font-medium">
                          {formData.specificArea ? "Edit Specific Area" : "Add Specific Area"}
                        </span>
                        <span className="text-xs text-gray-500 mt-1 break-words">
                          {formData.specificArea 
                            ? `Area: ${formData.specificArea}` 
                            : "Click to add neighborhood, district, or specific location details"}
                        </span>
                      </div>
                    </Button>
                  )}
                </div>

                {/* Pricing */}
                <div className="space-y-4">
                  <div>
                    <Label>Price Type</Label>
                    <div className="grid grid-cols-3 gap-2 mt-1">
                      <Button
                        type="button"
                        variant={formData.priceType === "per_project" ? "default" : "outline"}
                        className={`text-sm ${formData.priceType === "per_project" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        onClick={() => setFormData(prev => ({ ...prev, priceType: "per_project" }))}
                      >
                        Per Project
                      </Button>
                      <Button
                        type="button"
                        variant={formData.priceType === "hourly" ? "default" : "outline"}
                        className={`text-sm ${formData.priceType === "hourly" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        onClick={() => setFormData(prev => ({ ...prev, priceType: "hourly", priceTo: "" }))}
                      >
                        Hourly Rate
                      </Button>
                      <Button
                        type="button"
                        variant={formData.priceType === "per_day" ? "default" : "outline"}
                        className={`text-sm ${formData.priceType === "per_day" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                        onClick={() => setFormData(prev => ({ ...prev, priceType: "per_day", priceTo: "" }))}
                      >
                        Per Day
                      </Button>
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <div className="mt-1">
                      <CurrencySearch
                        value={formData.currency}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, currency: value }))}
                        placeholder="Select currency..."
                      />
                    </div>
                  </div>
                  
                  {formData.priceType === "per_project" ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="priceFrom">Starting Price *</Label>
                        <Input
                          id="priceFrom"
                          type="number"
                          min="1"
                          step="1"
                          value={formData.priceFrom}
                          onChange={(e) => setFormData(prev => ({ ...prev, priceFrom: e.target.value }))}
                          placeholder="100"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="priceTo">Max Price</Label>
                        <Input
                          id="priceTo"
                          type="number"
                          min="1"
                          step="1"
                          value={formData.priceTo}
                          onChange={(e) => setFormData(prev => ({ ...prev, priceTo: e.target.value }))}
                          placeholder="500 (optional)"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  ) : (
                    <div>
                      <Label htmlFor="priceFrom">
                        {formData.priceType === "hourly" ? "Hourly Rate *" : "Daily Rate *"}
                      </Label>
                      <Input
                        id="priceFrom"
                        type="number"
                        min="1"
                        step="1"
                        value={formData.priceFrom}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          priceFrom: e.target.value,
                          priceTo: "" // Clear max price for flat rates
                        }))}
                        placeholder={formData.priceType === "hourly" ? "50" : "400"}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                {/* Experience Level and Timing */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="experienceLevel">Experience Level</Label>
                    <Select value={formData.experienceLevel} onValueChange={(value) => setFormData(prev => ({ ...prev, experienceLevel: value }))}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="beginner">Beginner</SelectItem>
                        <SelectItem value="intermediate">Intermediate</SelectItem>
                        <SelectItem value="expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="deliveryTime">Delivery Time</Label>
                    <Input
                      id="deliveryTime"
                      value={formData.deliveryTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, deliveryTime: e.target.value }))}
                      placeholder="e.g., 3-5 business days"
                      className="mt-1"
                    />
                  </div>
                </div>

                {/* Service Duration */}
                <div>
                  <Label htmlFor="serviceDuration">Service Duration (Optional)</Label>
                  <Input
                    id="serviceDuration"
                    value={formData.serviceDuration}
                    onChange={(e) => setFormData(prev => ({ ...prev, serviceDuration: e.target.value }))}
                    placeholder="e.g., 2 hours, 1 day, 1-2 weeks"
                    className="mt-1"
                  />
                  <p className="text-sm text-gray-500 mt-1">How long does the service typically take to complete?</p>
                </div>



                {/* Contact Information */}
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="website">Website (Optional)</Label>
                    <Input
                      id="website"
                      type="url"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      placeholder="https://yourportfolio.com"
                      className="mt-1"
                    />
                    <p className="text-sm text-gray-500 mt-1">Showcase your portfolio or business website</p>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Contact Email (Optional)</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="your@email.com"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone Number (Optional)</Label>
                      <Input
                        id="phone"
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="+1 (555) 123-4567"
                        className="mt-1"
                      />
                    </div>
                  </div>
                  <p className="text-sm text-gray-500">Additional contact methods for clients to reach you</p>
                </div>

                {/* Service Images - matching job form */}
                <div>
                  <Label>Photos (Optional)</Label>
                  <div className="mt-1">
                    <label className="border-2 border-dashed border-gray-300 rounded-md p-4 sm:p-6 text-center hover:border-blue-600 transition-colors cursor-pointer block">
                      <Upload className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-xs sm:text-sm text-gray-600">Click to upload photos or drag and drop</p>
                      <p className="text-xs text-gray-500 mt-1">PNG, JPG up to 10MB each (max 5 photos)</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileSelect}
                        className="hidden"
                      />
                    </label>
                  </div>
                  
                  {/* Preview selected files */}
                  {selectedFiles.length > 0 && (
                    <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 sm:gap-4">
                      {selectedFiles.map((file, index) => (
                        <div key={index} className="relative">
                          <img
                            src={URL.createObjectURL(file)}
                            alt={`Preview ${index + 1}`}
                            className="w-full h-16 sm:h-20 object-cover rounded border"
                          />
                          <button
                            type="button"
                            onClick={() => removeFile(index)}
                            className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 bg-red-500 text-white rounded-full w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-xs hover:bg-red-600"
                          >
                            <X className="h-3 w-3 sm:h-4 sm:w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="grid grid-cols-2 gap-4 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setShowPostService(false);
                      resetForm();
                    }}
                    className="w-full"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createServiceMutation.isPending}
                    className="bg-blue-600 hover:bg-blue-700 w-full"
                  >
                    <span className="flex items-center justify-center gap-1">
                      {createServiceMutation.isPending ? (
                        "Submitting..."
                      ) : (
                        <>
                          <span>Submit</span>
                          <span className="ml-1">
                            10<Coins className="h-4 w-4 inline text-yellow-500 ml-0.5" />
                          </span>
                        </>
                      )}
                    </span>
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        ) : (
          <Button 
            onClick={() => window.location.href = "/login"}
            className="bg-gray-600 hover:bg-gray-700 text-white"
            size="lg"
          >
            Login to Post Service
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
                placeholder="Search services..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-full"
              />
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            </div>
          </div>
          
          {/* Filter dropdowns */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <CitySearch
                value={selectedLocation}
                onValueChange={setSelectedLocation}
                placeholder="All Locations"
              />
            </div>
            <div>
              <CategorySearch
                value={selectedCategory}
                onValueChange={setSelectedCategory}
                placeholder="All Categories"
              />
            </div>
            <div>
              <Select value={selectedBudgetRange} onValueChange={setSelectedBudgetRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Budget" />
                </SelectTrigger>
                <SelectContent>
                  {BUDGET_RANGES.map((budget) => (
                    <SelectItem key={budget.value} value={budget.value}>
                      {budget.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={selectedExperience} onValueChange={setSelectedExperience}>
                <SelectTrigger>
                  <SelectValue placeholder="Any Level" />
                </SelectTrigger>
                <SelectContent>
                  {EXPERIENCE_LEVELS.map((level) => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={clearFilters}
                className="bg-blue-600 hover:bg-blue-700 text-white w-full"
              >
                Clear filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Services Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {isLoading ? (
          // Loading skeleton
          Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-6 bg-gray-200 rounded mb-4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
                <div className="flex items-center space-x-2 mb-4">
                  <div className="w-8 h-8 bg-gray-200 rounded-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-24"></div>
                </div>
                <div className="h-10 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))
        ) : services.length === 0 ? (
          <div className="col-span-full">
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services found</h3>
                <p className="text-gray-600">
                  {searchQuery || selectedCategory !== "All Categories" || selectedLocation !== "All Locations" || selectedBudgetRange !== "any" || selectedExperience !== "any"
                    ? "Try adjusting your search filters to find more services."
                    : "Be the first to post a service and start offering your skills!"
                  }
                </p>
              </CardContent>
            </Card>
          </div>
        ) : (
          services.map((service) => (
            <Card key={service.id} className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                {/* Clickable Service Content */}
                <div 
                  className="cursor-pointer" 
                  onClick={() => setLocation(`/service/${service.id}`)}
                >
                  {/* Service Header */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2 hover:text-blue-600 transition-colors">
                        {service.title}
                      </h3>
                      <div className="flex flex-wrap gap-1 mb-3">
                        <Badge variant="secondary" className="text-xs">
                          {service.category}
                        </Badge>
                        {service.tags && service.tags.length > 0 && service.tags.slice(0, 2).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="h-3 w-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Service Details */}
                  <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                    {service.description}
                  </p>

                  {/* Service Info */}
                  <div className="space-y-2 mb-4">
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="truncate">{service.location}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Clock className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span>Delivery: {service.deliveryTime || "Flexible"}</span>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <DollarSign className="h-4 w-4 mr-2 flex-shrink-0" />
                      <span className="font-medium">
                        From {getCurrencySymbol(service.currency)}{service.priceFrom}
                        {service.priceTo && ` - ${getCurrencySymbol(service.currency)}${service.priceTo}`}
                        {service.priceType === "hourly" && "/hr"}
                        {service.priceType === "per_project" && "/project"}
                      </span>
                    </div>

                  </div>

                  {/* Provider Info */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="flex items-center space-x-2">
                      <Avatar className="w-8 h-8">
                        <AvatarImage src={service.user?.profileImageUrl || `/api/placeholder/avatar`} alt={service.user?.name || "Provider"} />
                        <AvatarFallback className="text-xs">
                          {service.user?.name?.charAt(0).toUpperCase() || service.title.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{service.user?.name || "Service Provider"}</p>
                        <p className="text-xs text-gray-600">{formatTimeAgo(service.createdAt)}</p>
                      </div>
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                      <span>{service.averageRating ? service.averageRating.toFixed(1) : "N/A"}</span>
                      <span className="ml-1 text-xs">({service.reviewCount || 0} reviews)</span>
                    </div>
                  </div>
                </div>

                {/* Action Button - Separate from clickable area */}
                {user ? (
                  <Button 
                    className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedService(service);
                      setShowInquiryModal(true);
                      setInquiryData({
                        message: "",
                        contactEmail: user.email || "",
                        contactPhone: ""
                      });
                    }}
                  >
                    Inquire
                  </Button>
                ) : (
                  <Button 
                    className="w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.location.href = "/login";
                    }}
                  >
                    Login to Inquire
                  </Button>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Service Inquiry Modal */}
      <Dialog open={showInquiryModal} onOpenChange={setShowInquiryModal}>
        <DialogContent className="max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle>Inquire About Service</DialogTitle>
          </DialogHeader>
          
          {selectedService && (
            <form onSubmit={handleInquirySubmit} className="space-y-4">
              <div>
                <h4 className="font-medium text-gray-900 mb-2">{selectedService.title}</h4>
                <p className="text-sm text-gray-600 mb-4">
                  From {getCurrencySymbol(selectedService.currency)}{selectedService.priceFrom}
                  {selectedService.priceTo && ` - ${getCurrencySymbol(selectedService.currency)}${selectedService.priceTo}`}
                  {selectedService.priceType === "hourly" && "/hr"}
                  {selectedService.priceType === "per_project" && "/project"}
                </p>
              </div>

              <div>
                <Label htmlFor="inquiry-message">Message *</Label>
                <Textarea
                  id="inquiry-message"
                  placeholder="Describe your project requirements and any specific questions..."
                  value={inquiryData.message}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, message: e.target.value }))}
                  className="mt-1"
                  rows={4}
                  required
                />
              </div>



              <div>
                <Label htmlFor="inquiry-email">Contact Email (Optional)</Label>
                <Input
                  id="inquiry-email"
                  type="email"
                  placeholder="your-email@example.com"
                  value={inquiryData.contactEmail}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, contactEmail: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="inquiry-phone">Phone Number (Optional)</Label>
                <Input
                  id="inquiry-phone"
                  type="tel"
                  placeholder="+1 (555) 123-4567"
                  value={inquiryData.contactPhone}
                  onChange={(e) => setInquiryData(prev => ({ ...prev, contactPhone: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowInquiryModal(false)}
                  disabled={submitInquiryMutation.isPending}
                  className="w-full"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-green-600 hover:bg-green-700 w-full"
                  disabled={submitInquiryMutation.isPending}
                >
                  {submitInquiryMutation.isPending ? "Sending..." : (
                    <>
                      Send Inquiry
                      <Coins className="h-4 w-4 ml-2 text-yellow-400" />
                      1
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}