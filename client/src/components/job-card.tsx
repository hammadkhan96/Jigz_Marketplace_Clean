import { MapPin, Clock, Users, LogIn, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RatingDisplay } from "@/components/ui-components/rating-display";
import { Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useQuery } from "@tanstack/react-query";
import type { JobWithApplications } from "@shared/schema";
import { getCurrencySymbol } from "@shared/currencies";

interface JobCardProps {
  job: JobWithApplications;
  onApply: (job: JobWithApplications) => void;
}

const getCategoryColor = (category: string) => {
  const colors = {
    "Home Improvement": "bg-blue-100 text-blue-800",
    "Cleaning": "bg-green-100 text-green-800",
    "Delivery": "bg-orange-100 text-orange-800",
    "Moving": "bg-orange-100 text-orange-800",
    "Gardening": "bg-green-100 text-green-800",
    "Other": "bg-gray-100 text-gray-800"
  };
  return colors[category as keyof typeof colors] || colors["Other"];
};

const getStatusColor = (status: string) => {
  const colors = {
    "open": "bg-green-500 text-white",
    "in_progress": "bg-orange-500 text-white",
    "completed": "bg-gray-500 text-white"
  };
  return colors[status as keyof typeof colors] || colors["open"];
};

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
  return `${diffInDays} days ago`;
};

export default function JobCard({ job, onApply }: JobCardProps) {
  const { isAuthenticated } = useAuth();
  const currencySymbol = getCurrencySymbol(job.currency);
  
  const budgetText = (() => {
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

  // Check if user has already applied to this job
  const { data: applicationStatus } = useQuery({
    queryKey: ["/api/jobs", job.id, "application-status"],
    enabled: isAuthenticated
  });

  const hasAlreadyApplied = (applicationStatus as { hasApplied?: boolean })?.hasApplied;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow duration-200">
      <Link href={`/job/${job.id}`}>
        <div className="p-4 sm:p-6 cursor-pointer">
          <div className="flex items-start justify-between mb-3 gap-3">
            <h3 className="text-lg font-semibold text-neutral-900 flex-1 min-w-0 break-words">{job.title}</h3>
            <Badge className={`${getStatusColor(job.status)} flex-shrink-0`}>
              {job.status === "open" ? "Open" : job.status === "in_progress" ? "Closed" : "Completed"}
            </Badge>
          </div>
        
        <p className="text-neutral-600 text-sm mb-4 line-clamp-2">
          {job.description}
        </p>
        
        <div className="flex items-center text-sm text-neutral-500 mb-4 flex-wrap gap-2">
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 flex-shrink-0" />
            <span className="truncate">{job.location}</span>
          </div>
          {job.duration && (
            <>
              <span className="mx-2 text-gray-400">•</span>
              <span className="text-blue-600 font-medium">
                {job.duration === "custom" ? job.customDuration : job.duration}
              </span>
            </>
          )}
        </div>
        
        {/* Poster Rating */}
        {job.posterRating !== undefined && job.posterRating > 0 && (
          <div className="mb-4">
            <RatingDisplay 
              rating={job.posterRating} 
              totalReviews={job.posterReviewCount}
              size="sm"
              showNumber={false}
              className="text-xs"
            />
          </div>
        )}
        
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex-1 min-w-0">
            <span className="text-lg font-semibold text-neutral-900 break-words">{budgetText}</span>
            <span className="text-sm text-neutral-500 ml-1">
              {job.budgetType === "hourly" ? "rate" : "budget"}
            </span>
          </div>
          {isAuthenticated ? (
            hasAlreadyApplied ? (
              <Button 
                disabled
                className="bg-green-600 text-white cursor-not-allowed gap-2 flex-shrink-0"
              >
                <CheckCircle className="h-4 w-4" />
                Applied
              </Button>
            ) : (
              <Button 
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onApply(job);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 flex-shrink-0"
                disabled={job.status !== "open"}
              >
                Apply Now
              </Button>
            )
          ) : (
            <Button 
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = "/login";
              }}
              className="bg-gray-600 text-white hover:bg-gray-700 gap-2 flex-shrink-0"
            >
              <LogIn className="h-4 w-4" />
              Login to Apply
            </Button>
          )}
        </div>
        
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between text-sm flex-wrap gap-3">
              <div className="flex items-center text-neutral-500 flex-wrap gap-2 min-w-0">
                <div className="flex items-center flex-shrink-0">
                  <Users className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{job.applicationCount || 0} applicants</span>
                  <span className="sm:hidden">{job.applicationCount || 0}</span>
                </div>
                {job.freelancersNeeded && job.freelancersNeeded > 1 && (
                  <>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-blue-600 font-medium flex-shrink-0">Need {job.freelancersNeeded}</span>
                  </>
                )}
                <div className="flex items-center flex-shrink-0">
                  <span className="mx-2 text-gray-400">•</span>
                  <Clock className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">{formatTimeAgo(job.createdAt)}</span>
                  <span className="sm:hidden">{formatTimeAgo(job.createdAt).replace(/\s+ago$/i, '')}</span>
                </div>
              </div>
              <Badge variant="secondary" className={`${getCategoryColor(job.category)} flex-shrink-0`}>
                {job.category}
              </Badge>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
