import { useState } from "react";
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Upload, Coins } from "lucide-react";
// Removed Dialog imports - using custom modal instead
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { insertJobSchema, type JobWithApplications } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import { CitySearch } from "@/components/city-search";
import { CurrencySearch } from "@/components/currency-search";
import { CategorySearch } from "@/components/category-search";
import { CoinWarning } from "@/components/coin-display";

const jobFormSchema = insertJobSchema.extend({
  images: z.any().optional(),
  specificArea: z.string().optional(),
  duration: z.string().optional(),
  customDuration: z.string().optional(),
  budgetType: z.string().default("fixed"),
  title: z.string().min(1, "Title is required").max(150, "Title must be 150 characters or less"),
  description: z.string().min(1, "Description is required").max(2500, "Description must be 2500 characters or less"),
});

type JobFormData = z.infer<typeof jobFormSchema>;

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingJob?: JobWithApplications | null;
  isEditing?: boolean;
}

// Categories are now handled by CategorySearch component

export default function PostJobModal({ isOpen, onClose, editingJob, isEditing = false }: PostJobModalProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [coinError, setCoinError] = useState<{ coinsNeeded: number; coinsAvailable: number } | null>(null);
  const [isSpecificAreaEditing, setIsSpecificAreaEditing] = useState(false);
  const [showCustomDuration, setShowCustomDuration] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Debug logging


  const form = useForm<JobFormData>({
    resolver: zodResolver(jobFormSchema),
    defaultValues: {
      title: "",
      description: "",
      category: "",
      location: "",
      maxBudget: undefined,
      budgetType: "fixed",
      currency: "USD",
      experienceLevel: "any",
      status: "open",
      images: [],
      specificArea: "",
      duration: "",
      customDuration: "",
      freelancersNeeded: 1,
    },
  });

  // Reset form when modal opens/closes or when editing job changes
  React.useEffect(() => {
    if (isOpen && isEditing && editingJob) {
      form.reset({
        title: editingJob.title || "",
        description: editingJob.description || "",
        category: editingJob.category || "",
        location: editingJob.location || "",
        specificArea: editingJob.specificArea || "",
        maxBudget: editingJob.maxBudget || undefined,
        minBudget: editingJob.minBudget || undefined,
        budgetType: editingJob.budgetType || "fixed",
        currency: editingJob.currency || "USD",
        experienceLevel: editingJob.experienceLevel || "any",
        duration: editingJob.duration || "",
        customDuration: editingJob.customDuration || "",
        status: editingJob.status || "open",
        images: [],
        freelancersNeeded: editingJob.freelancersNeeded || 1,
      });
      setShowCustomDuration(editingJob.duration === "custom");
    } else if (isOpen && !isEditing) {
      form.reset({
        title: "",
        description: "",
        category: "",
        location: "",
        specificArea: "",
        maxBudget: undefined,
        budgetType: "fixed",
        currency: "USD",
        experienceLevel: "any",
        status: "open",
        images: [],
        duration: "",
        customDuration: "",
        freelancersNeeded: 1,
      });
      setShowCustomDuration(false);
    }
    if (!isOpen) {
      setSelectedFiles([]);
    }
  }, [isOpen, isEditing, editingJob, form]);

  const createJobMutation = useMutation({
    mutationFn: async (data: JobFormData) => {
      const formData = new FormData();
      
      // Append job data
      Object.entries(data).forEach(([key, value]) => {
        if (key !== "images" && value !== undefined && value !== null) {
          formData.append(key, value.toString());
        }
      });
      
      // Append images
      selectedFiles.forEach((file) => {
        formData.append("images", file);
      });

      const method = isEditing ? "PUT" : "POST";
      const url = isEditing ? `/api/jobs/${editingJob?.id}` : "/api/jobs";

      const res = await fetch(url, {
        method,
        body: formData,
      });

      if (!res.ok) {
        throw new Error(isEditing ? "Failed to update job" : "Failed to create job");
      }

      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      setCoinError(null);
      toast({
        title: "Success",
        description: isEditing 
          ? "Job updated successfully! Your updated job is now under review by our team and will be approved within 30 minutes. 1 coin has been deducted." 
          : "Job posted successfully! Your posting is now under review by our team. Most jobs are approved within 30 minutes and we're working tirelessly to get it live! 3 coins have been deducted.",
      });
      onClose();
      form.reset();
      setSelectedFiles([]);
    },
    onError: (error: any) => {
      console.error("Error posting job:", error);
      
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
        description: error.message || "Failed to post job. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(prev => [...prev, ...files].slice(0, 5)); // Max 5 images
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: JobFormData) => {
    createJobMutation.mutate(data);
  };



  // Create a simple modal without Dialog component complications
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div 
        className="relative w-full h-full sm:w-auto sm:h-auto sm:max-w-4xl sm:max-h-[90vh] bg-white sm:rounded-lg overflow-hidden flex flex-col sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header with Close Button */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between sm:hidden">
          <div>
            <h2 className="text-lg font-semibold">{isEditing ? "Edit Job" : "Post Job"}</h2>
            <p className="text-sm text-gray-600">{isEditing ? "Editing costs 1 coin" : "Posting costs 3 coins"}</p>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();

              onClose();
            }}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        {/* Desktop Header */}
        <div className="pb-4 hidden sm:block p-6 border-b border-gray-200 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-full transition-colors"
            type="button"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
          <h2 className="text-xl font-semibold pr-12">{isEditing ? "Edit Job" : "Post a New Job"}</h2>
          <p className="text-gray-600 mt-1">
            {isEditing ? "Update the details below to modify your job posting. Editing costs 1 coin and requires admin re-approval." : "Fill out the details below to post your job and start receiving applications. Posting costs 3 coins."}
          </p>
        </div>
        
        {/* Content Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        
          {coinError && (
            <CoinWarning 
              coinsNeeded={coinError.coinsNeeded} 
              coinsAvailable={coinError.coinsAvailable} 
            />
          )}
          
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6 w-full pb-20 sm:pb-0 sm:grid sm:gap-6 sm:grid-cols-1">
          {/* Job Title */}
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="title">Job Title *</Label>
              <span className="text-xs text-gray-500">
                {form.watch("title")?.length || 0}/150
              </span>
            </div>
            <Input
              id="title"
              placeholder="e.g., Help hang picture frames"
              {...form.register("title")}
              className="mt-1 text-sm sm:text-base w-full"
              maxLength={150}
            />
            {form.formState.errors.title && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.title.message}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <div className="flex justify-between items-center">
              <Label htmlFor="description">Description *</Label>
              <span className="text-xs text-gray-500">
                {form.watch("description")?.length || 0}/2500
              </span>
            </div>
            <Textarea
              id="description"
              rows={3}
              placeholder="Describe what you need help with..."
              {...form.register("description")}
              className="mt-1 resize-none text-sm sm:text-base w-full"
              maxLength={2500}
            />
            {form.formState.errors.description && (
              <p className="text-sm text-red-600 mt-1">{form.formState.errors.description.message}</p>
            )}
          </div>

          {/* Job Duration */}
          <div>
            <Label>How long will this job take?</Label>
            <Select 
              value={form.watch("duration") || ""}
              onValueChange={(value) => {
                form.setValue("duration", value);
                setShowCustomDuration(value === "custom");
                if (value !== "custom") {
                  form.setValue("customDuration", "");
                }
              }}
            >
              <SelectTrigger className="mt-1 w-full">
                <SelectValue placeholder="Select expected duration" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="a couple hours">A couple hours</SelectItem>
                <SelectItem value="a day">A day</SelectItem>
                <SelectItem value="a couple of days">A couple of days</SelectItem>
                <SelectItem value="a week">A week</SelectItem>
                <SelectItem value="less than a month">Less than a month</SelectItem>
                <SelectItem value="1-3 months">1-3 months</SelectItem>
                <SelectItem value="3+ months">3+ months</SelectItem>
                <SelectItem value="custom">Custom length</SelectItem>
              </SelectContent>
            </Select>
            
            {/* Custom Duration Input */}
            {showCustomDuration && (
              <div className="mt-2">
                <Input
                  placeholder="Describe the expected duration..."
                  {...form.register("customDuration")}
                  className="mt-1"
                />
              </div>
            )}
          </div>

          {/* Category and Location - Desktop Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Category */}
            <div>
              <Label>Category *</Label>
              <div className="mt-1 w-full">
                <CategorySearch
                  value={form.watch("category") || ""}
                  onValueChange={(value) => form.setValue("category", value)}
                  placeholder="Search and select category..."
                />
              </div>
              {form.formState.errors.category && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.category.message}</p>
              )}
            </div>

            {/* Location */}
            <div>
              <Label>City *</Label>
              <div className="mt-1 w-full">
                <CitySearch
                  value={form.watch("location") || ""}
                  onValueChange={(value) => form.setValue("location", value)}
                  placeholder="Search and select your city..."
                />
              </div>
              {form.formState.errors.location && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.location.message}</p>
              )}
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
                  {...form.register("specificArea")}
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
                    {form.watch("specificArea") ? "Edit Specific Area" : "Add Specific Area"}
                  </span>
                  <span className="text-xs text-gray-500 mt-1 break-words">
                    {form.watch("specificArea") 
                      ? `Area: ${form.watch("specificArea")}` 
                      : "Click to add neighborhood, district, or specific location details"}
                  </span>
                </div>
              </Button>
            )}
          </div>

          {/* Budget Type */}
          <div>
            <Label>Budget Type</Label>
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Button
                type="button"
                variant={form.watch("budgetType") === "fixed" ? "default" : "outline"}
                className={`flex-1 ${form.watch("budgetType") === "fixed" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => form.setValue("budgetType", "fixed")}
              >
                Fixed Price
              </Button>
              <Button
                type="button"
                variant={form.watch("budgetType") === "hourly" ? "default" : "outline"}
                className={`flex-1 ${form.watch("budgetType") === "hourly" ? "bg-blue-600 hover:bg-blue-700" : ""}`}
                onClick={() => form.setValue("budgetType", "hourly")}
              >
                Hourly Rate
              </Button>
            </div>
          </div>

          {/* Budget and Currency */}
          <div>
            <Label htmlFor="maxBudget">
              {form.watch("budgetType") === "hourly" ? "Hourly Rate" : "Budget"}
            </Label>
            <div className="flex gap-0 mt-1 w-full">
              <div className="w-auto min-w-[120px]">
                <CurrencySearch
                  value={form.watch("currency") || "USD"}
                  onValueChange={(value) => form.setValue("currency", value || "USD")}
                />
              </div>
              <Input
                id="maxBudget"
                type="number"
                placeholder={form.watch("budgetType") === "hourly" ? "25" : "50"}
                {...form.register("maxBudget", { valueAsNumber: true })}
                className="flex-1 rounded-l-none border-l-0"
              />
            </div>
            {form.watch("budgetType") === "hourly" && (
              <p className="text-xs text-gray-500 mt-1">Enter your hourly rate</p>
            )}
          </div>

          {/* Experience Level and Freelancers Needed - Desktop Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Experience Level */}
            <div>
              <Label>Experience Level</Label>
              <Select onValueChange={(value) => form.setValue("experienceLevel", value)} defaultValue="any">
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue placeholder="Select experience level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="beginner">Beginner</SelectItem>
                  <SelectItem value="intermediate">Intermediate</SelectItem>
                  <SelectItem value="expert">Expert</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Number of Freelancers Needed */}
            <div>
              <Label htmlFor="freelancersNeeded">Number of Freelancers Needed</Label>
              <Input
                id="freelancersNeeded"
                type="number"
                min="1"
                max="50"
                placeholder="1"
                {...form.register("freelancersNeeded", { valueAsNumber: true })}
                className="mt-1 w-full"
              />
              <p className="text-xs text-gray-500 mt-1">How many freelancers do you need for this job? (Default: 1)</p>
              {form.formState.errors.freelancersNeeded && (
                <p className="text-sm text-red-600 mt-1">{form.formState.errors.freelancersNeeded.message}</p>
              )}
            </div>
          </div>

          {/* Image Upload */}
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

          {/* Form Actions */}
          <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-gray-200">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="w-full flex-1 order-2 sm:order-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={createJobMutation.isPending}
              className="w-full flex-1 bg-blue-600 hover:bg-blue-700 order-1 sm:order-2"
            >
              <span className="flex items-center justify-center gap-1">
                {createJobMutation.isPending ? (
                  isEditing ? "Updating..." : "Posting..."
                ) : (
                  <>
                    <span>
                      {isEditing ? "Update Job" : "Post Job"}
                    </span>
                    <span className="ml-1">
                      ({isEditing ? "1" : "3"}<Coins className="h-4 w-4 inline text-yellow-500 ml-0.5" />)
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
