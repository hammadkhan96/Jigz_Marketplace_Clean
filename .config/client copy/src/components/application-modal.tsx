import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { insertApplicationSchema } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { z } from "zod";
import type { JobWithApplications } from "@shared/schema";
import { getCurrencySymbol } from "@shared/currencies";
import { CoinWarning } from "@/components/coin-display";
import { useState } from "react";
import { Coins, CheckCircle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";

const applicationFormSchema = insertApplicationSchema.extend({
  bidAmount: z.number().min(1, "Bid amount must be greater than 0"),
  coinsBid: z.number().min(0, "Coins bid must be 0 or higher").optional(),
  message: z.string().max(1500, "Message must be 1500 characters or less"),
  experience: z.string().max(500, "Experience must be 500 characters or less").optional(),
});

type ApplicationFormData = z.infer<typeof applicationFormSchema>;

interface ApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
  job: JobWithApplications | null;
}

export default function ApplicationModal({ isOpen, onClose, job }: ApplicationModalProps) {
  const [coinError, setCoinError] = useState<{ coinsNeeded: number; coinsAvailable: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();

  // Check if user has already applied to this job
  const { data: applicationStatus, isLoading: checkingStatus } = useQuery({
    queryKey: ["/api/jobs", job?.id, "application-status"],
    enabled: isAuthenticated && isOpen && !!job?.id
  });

  // Fetch top bidders for this job
  const { data: topBidders = [] } = useQuery<Array<{ name: string; coinsBid: number }>>({
    queryKey: ["/api/jobs", job?.id, "top-bidders"],
    enabled: isAuthenticated && isOpen && !!job?.id
  });

  const form = useForm<ApplicationFormData>({
    resolver: zodResolver(applicationFormSchema),
    defaultValues: {
      jobId: "",
      bidAmount: undefined,
      coinsBid: 0,
      message: "",
      experience: "",
      status: "pending",
    },
  });

  const createApplicationMutation = useMutation({
    mutationFn: async (data: ApplicationFormData) => {
      const res = await apiRequest("POST", "/api/applications", data);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/applications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      setCoinError(null);
      const coinsBid = form.getValues("coinsBid") || 0;
      const totalCoins = 1 + coinsBid;
      const bidMessage = coinsBid > 0 ? ` + ${coinsBid} for priority bidding` : '';
      toast({
        title: "Success",
        description: `Application submitted successfully! ${totalCoins} coin${totalCoins > 1 ? 's' : ''} deducted (1 for application${bidMessage}).`,
      });
      onClose();
      form.reset();
    },
    onError: (error: any) => {
      console.error("Error submitting application:", error);
      
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
        description: error.message || "Failed to submit application. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: ApplicationFormData) => {
    if (!job) return;
    
    createApplicationMutation.mutate({
      ...data,
      jobId: job.id,
    });
  };

  const currencySymbol = getCurrencySymbol(job?.currency);
  const budgetText = (() => {
    if (!job) return "Budget negotiable";
    
    const isHourly = job.budgetType === "hourly";
    const suffix = isHourly ? "/hr" : "";
    
    if (job.minBudget && job.maxBudget) {
      return `${currencySymbol}${job.minBudget} - ${currencySymbol}${job.maxBudget}${suffix}`;
    } else if (job.minBudget) {
      return `${currencySymbol}${job.minBudget}+${suffix}`;
    } else if (job.maxBudget) {
      return `Up to ${currencySymbol}${job.maxBudget}${suffix}`;
    } else {
      return isHourly ? "Rate negotiable" : "Budget negotiable";
    }
  })();

  const hasAlreadyApplied = (applicationStatus as { hasApplied?: boolean })?.hasApplied;

  // Show "Already Applied" state if user has already applied
  if (hasAlreadyApplied && isOpen) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        {/* Backdrop */}
        <div 
          className="absolute inset-0 bg-black/50" 
          onClick={onClose}
        />
        
        {/* Modal Content */}
        <div 
          className="relative w-full h-full sm:w-auto sm:h-auto sm:max-w-lg bg-white sm:rounded-lg overflow-hidden flex flex-col sm:m-4"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Mobile Header */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between sm:hidden">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <h2 className="text-lg font-semibold">Already Applied</h2>
            </div>
            <button
              type="button"
              onClick={onClose}
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
            <h2 className="text-xl font-semibold pr-12 flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Already Applied
            </h2>
            <p className="text-gray-600 mt-1">
              You have already submitted an application for "{job?.title}"
            </p>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-800">
                  Your application has been submitted successfully. The job poster will review it and contact you if they're interested.
                </p>
              </div>
              <div className="flex justify-end">
                <Button onClick={onClose} variant="outline">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Create a full-page modal for mobile, dialog-style for desktop
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
        className="relative w-full h-full sm:w-auto sm:h-auto sm:max-w-lg sm:max-h-[90vh] bg-white sm:rounded-lg overflow-hidden flex flex-col sm:m-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile Header with Close Button */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 p-4 flex items-center justify-between sm:hidden">
          <div>
            <h2 className="text-lg font-semibold">Apply for Job</h2>
            <p className="text-sm text-gray-600">Applying costs 1 coin + priority bidding</p>
          </div>
          <button
            type="button"
            onClick={onClose}
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
          <h2 className="text-xl font-semibold pr-12">Apply for Job</h2>
          <p className="text-gray-600 mt-1">
            Submit your application with a competitive bid and message. Applying costs 1 coin, plus additional coins for priority bidding.
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
        
        {job && (
          <>
            {/* Job Summary */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="font-medium text-gray-900 mb-2">{job.title}</h3>
              <p className="text-sm text-gray-600">{job.location} • {budgetText}</p>
            </div>

            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              {/* Your Bid */}
              <div>
                <Label htmlFor="bidAmount">Your Bid Amount ({currencySymbol}) *</Label>
                <Input
                  id="bidAmount"
                  type="number"
                  placeholder="30"
                  min="1"
                  step="0.01"
                  {...form.register("bidAmount", { valueAsNumber: true })}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">Suggest a fair price for this job</p>
                {form.formState.errors.bidAmount && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.bidAmount.message}</p>
                )}
              </div>

              {/* Message */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="message">Message to Client *</Label>
                  <span className="text-xs text-gray-500">
                    {form.watch("message")?.length || 0}/1500
                  </span>
                </div>
                <Textarea
                  id="message"
                  rows={3}
                  placeholder="Hi! I'd love to help with your picture hanging. I have experience with..."
                  {...form.register("message")}
                  className="mt-1 resize-none"
                  maxLength={1500}
                />
                {form.formState.errors.message && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.message.message}</p>
                )}
              </div>

              {/* Experience */}
              <div>
                <div className="flex justify-between items-center">
                  <Label htmlFor="experience">Relevant Experience</Label>
                  <span className="text-xs text-gray-500">
                    {form.watch("experience")?.length || 0}/500
                  </span>
                </div>
                <Textarea
                  id="experience"
                  rows={2}
                  placeholder="Tell them about your relevant experience..."
                  {...form.register("experience")}
                  className="mt-1 resize-none"
                  maxLength={500}
                />
              </div>

              {/* Priority Bidding */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Coins className="h-4 w-4 text-blue-600" />
                  <Label htmlFor="coinsBid" className="text-blue-900 font-medium">
                    Priority Bidding (Optional)
                  </Label>
                </div>
                <Input
                  id="coinsBid"
                  type="number"
                  placeholder="0"
                  min="0"
                  {...form.register("coinsBid", { valueAsNumber: true })}
                  className="mb-2"
                />
                <div className="text-xs text-blue-700 space-y-1">
                  <p>• Bid coins to rank higher in the applicant list</p>
                  <p>•  The highest bidders appear at the top for clients to see first</p>
                  <p>• Cost: 1 coin (application) + coins you bid for priority</p>
                  <p className="font-medium">
                    Total cost: {1 + (form.watch("coinsBid") || 0)} coin{(1 + (form.watch("coinsBid") || 0)) !== 1 ? 's' : ''}
                  </p>
                </div>

                {/* Top Bidders */}
                {topBidders.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-blue-200">
                    <p className="text-xs text-blue-800 font-medium mb-2">Current Top Bidders:</p>
                    <div className="space-y-1">
                      {topBidders.slice(0, 4).map((bidder, index) => (
                        <div key={index} className="flex justify-between items-center text-xs text-blue-700">
                          <span>{bidder.name}</span>
                          <span className="font-medium">{bidder.coinsBid} coins</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {form.formState.errors.coinsBid && (
                  <p className="text-sm text-red-600 mt-1">{form.formState.errors.coinsBid.message}</p>
                )}
              </div>

              {/* Form Actions */}
              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createApplicationMutation.isPending}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  {createApplicationMutation.isPending ? "Submitting..." : (
                    <span className="flex items-center gap-1">
                      Submit Application ({1 + (form.watch("coinsBid") || 0)} <Coins className="h-4 w-4 text-yellow-500" />)
                    </span>
                  )}
                </Button>
              </div>
            </form>
          </>
        )}
        </div>
      </div>
    </div>
  );
}
