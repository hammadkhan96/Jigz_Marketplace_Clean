import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Plus, Upload, Search, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CoinWarning } from "@/components/coin-display";
import { CurrencySearch } from "@/components/currency-search";
import { jobCategories } from "@shared/categories";
import { topCities, allWorldCities } from "@shared/cities";

interface PostServiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingService?: any;
  isEditing?: boolean;
}

export default function PostServiceModal({ isOpen, onClose, editingService, isEditing = false }: PostServiceModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
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
    tags: ""
  });

  // Category search state
  const [categorySearch, setCategorySearch] = useState("");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  
  // Location search state  
  const [locationSearch, setLocationSearch] = useState("");
  const [showLocationDropdown, setShowLocationDropdown] = useState(false);
  
  // Specific area editing state
  const [isSpecificAreaEditing, setIsSpecificAreaEditing] = useState(false);
  
  // Image upload state
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [coinError, setCoinError] = useState<{ coinsNeeded: number; coinsAvailable: number } | null>(null);

  // Filter categories and locations
  const filteredCategories = jobCategories.filter(cat => 
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  ).slice(0, 8);
  
  const filteredLocations = allWorldCities.filter(loc => 
    loc.toLowerCase().includes(locationSearch.toLowerCase())
  ).slice(0, 8);

  // File upload handlers
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...newFiles].slice(0, 5));
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Reset form
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
      tags: ""
    });
    setSelectedFiles([]);
    setCoinError(null);
    setIsSpecificAreaEditing(false);
  };

  // Initialize form data when editing
  React.useEffect(() => {
    if (isEditing && editingService) {
      setFormData({
        title: editingService.title || "",
        description: editingService.description || "",
        category: editingService.category || "",
        location: editingService.location || "",
        specificArea: editingService.specificArea || "",
        priceFrom: editingService.priceFrom?.toString() || "",
        priceTo: editingService.priceTo?.toString() || "",
        priceType: editingService.priceType || "per_project",
        currency: editingService.currency || "USD",
        experienceLevel: editingService.experienceLevel || "intermediate",
        deliveryTime: editingService.deliveryTime || "",
        serviceDuration: editingService.serviceDuration || "",
        website: editingService.website || "",
        tags: editingService.tags?.join(", ") || ""
      });
      setCategorySearch(editingService.category || "");
      setLocationSearch(editingService.location || "");
    }
  }, [isEditing, editingService]);

  const createServiceMutation = useMutation({
    mutationFn: async (serviceData: any) => {
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

      const url = isEditing ? `/api/services/${editingService?.id}` : "/api/services";
      const method = isEditing ? "PUT" : "POST";
      
      const res = await fetch(url, {
        method,
        body: formDataToSend,
      });

      if (!res.ok) {
        const error = await res.json();
        throw error;
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      setCoinError(null);
      toast({
        title: isEditing ? "Service updated!" : "Service submitted!",
        description: isEditing 
          ? "Your service has been updated and resubmitted for admin approval. 5 coins have been deducted." 
          : "Your service has been submitted for admin approval. You'll be notified once it's reviewed. 15 coins have been deducted.",
      });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error("Error posting service:", error);
      
      // Check if it's a coin-related error
      if (error.coinsNeeded && error.coinsAvailable !== undefined) {
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
      specificArea: formData.specificArea.trim(),
      priceFrom: parseFloat(formData.priceFrom),
      priceTo: formData.priceTo ? parseFloat(formData.priceTo) : undefined,
      priceType: formData.priceType,
      currency: formData.currency,
      experienceLevel: formData.experienceLevel,
      deliveryTime: formData.deliveryTime,
      serviceDuration: formData.serviceDuration,
      website: formData.website.trim(),
      tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0) : [],
    };

    createServiceMutation.mutate(serviceData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 md:p-4">
      <div className="bg-white w-full h-full md:rounded-lg md:max-w-4xl md:max-h-[90vh] md:h-auto overflow-y-auto">
        <div className="sticky top-0 bg-white border-b px-4 md:px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg md:text-xl font-semibold">{isEditing ? "Edit Service" : "Post a Service"}</h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-4 md:p-6">
          {coinError && (
            <div className="mb-6">
              <CoinWarning 
                coinsNeeded={coinError.coinsNeeded}
                coinsAvailable={coinError.coinsAvailable}
              />
            </div>
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredCategories.map((category, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, category }));
                            setShowCategoryDropdown(false);
                          }}
                        >
                          {category}
                        </button>
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
                      setTimeout(() => setShowLocationDropdown(false), 200);
                    }}
                    placeholder="Search locations..."
                    className="w-full"
                  />
                  <Search className="absolute right-3 top-3 h-4 w-4 text-gray-400" />
                  
                  {showLocationDropdown && filteredLocations.length > 0 && (
                    <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-auto">
                      {filteredLocations.map((location, index) => (
                        <button
                          key={index}
                          type="button"
                          className="w-full px-3 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                          onClick={() => {
                            setFormData(prev => ({ ...prev, location }));
                            setShowLocationDropdown(false);
                          }}
                        >
                          {location}
                        </button>
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
                  <div className="flex flex-col items-start text-left w-full">
                    <span className="text-sm font-medium">
                      {formData.specificArea ? "Edit Specific Area" : "Add Specific Area"}
                    </span>
                    <span className="text-xs text-gray-500 mt-1 break-words max-w-full md:max-w-none">
                      {formData.specificArea 
                        ? `Area: ${formData.specificArea}` 
                        : (
                          <>
                            <span className="md:hidden">Add neighborhood or area details</span>
                            <span className="hidden md:inline">Click to add neighborhood, district, or specific location details</span>
                          </>
                        )}
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

            {/* Experience Level and Delivery Time */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <p className="text-sm text-gray-500 mt-1">Showcase your portfolio or business website for clients to learn more about your services</p>
              </div>
            </div>

            {/* Service Images - matching services page */}
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
                    onChange={handleFileChange}
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
                  onClose();
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
                      <span>{isEditing ? "Update Service" : "Submit"}</span>
                      <span className="ml-1">
                        {isEditing ? "5" : "15"}<Coins className="h-4 w-4 inline text-yellow-500 ml-0.5" />
                      </span>
                    </>
                  )}
                </span>
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}