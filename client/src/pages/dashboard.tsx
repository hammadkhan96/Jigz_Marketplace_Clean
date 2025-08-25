import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Star, MapPin, Clock, DollarSign, User, Eye, Plus, MessageCircle, Check, X, Edit, Trash2, CheckCircle, Trophy, Medal, Award, Coins, ChevronDown, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import ReviewModal from "@/components/modals/review-modal";
import PostJobModal from "@/components/modals/post-job-modal";
import PostServiceModal from "@/components/modals/post-service-modal";
import { SkillEndorsementModal } from "@/components/modals/skill-endorsement-modal";

// Component to handle rate provider button with duplicate prevention
function RateProviderButton({ 
  serviceId, 
  serviceProviderId, 
  serviceName, 
  providerName, 
  onRate 
}: {
  serviceId: string;
  serviceProviderId: string;
  serviceName: string;
  providerName: string;
  onRate: (serviceId: string, providerId: string, providerName: string, serviceName: string) => void;
}) {
  const [hasRated, setHasRated] = useState<boolean | null>(null);

  useEffect(() => {
    const checkRatingStatus = async () => {
      if (!serviceId || !serviceProviderId) return;
      
      try {
        const response = await apiRequest("GET", `/api/reviews/has-client-rated-service/${serviceId}/${serviceProviderId}`);
        if (response.ok) {
          const data = await response.json();
          setHasRated(data.hasRated);
        }
      } catch (error) {
        console.error("Error checking rating status:", error);
        setHasRated(false);
      }
    };

    checkRatingStatus();
  }, [serviceId, serviceProviderId]);

  if (hasRated === null) {
    return (
      <Button
        disabled
        className="bg-gray-300 text-gray-500 w-full sm:w-auto"
      >
        <Star className="h-4 w-4 mr-1" />
        Loading...
      </Button>
    );
  }

  if (hasRated) {
    return (
      <Button
        disabled
        className="bg-gray-300 text-gray-500 w-full sm:w-auto"
      >
        <Star className="h-4 w-4 mr-1" />
        Already Rated
      </Button>
    );
  }

  return (
    <Button
      onClick={() => onRate(serviceId, serviceProviderId, providerName, serviceName)}
      className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto"
    >
      <Star className="h-4 w-4 mr-1" />
      Rate Provider
    </Button>
  );
}

import { BidManagement } from "@/components/bid-management";
import type { JobWithApplications, ApplicationWithJob, ApplicationWithUser, ServiceWithRequests } from "@shared/schema";
import { Link, useLocation } from "wouter";
import { getCurrencySymbol } from "@shared/currencies";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import type { 
  ServiceRequestWithServiceAndUser, 
  ServiceRatingEligibility, 
  FreelancerReviewStatus, 
  EndorsementStatus,
  ServiceRequestModalData,
  ReviewModalData,
  SkillEndorsementModalData,
  ApiError,
  CoinError
} from "@/types/interfaces";
import type { ServiceRequestWithUser, ReviewWithUser } from "@shared/schema";

const formatBudgetText = (job: JobWithApplications) => {
  const currencySymbol = getCurrencySymbol(job.currency);
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

const getStatusColor = (status: string) => {
  const colors = {
    "open": "bg-green-100 text-green-800",
    "in_progress": "bg-orange-100 text-orange-800", 
    "completed": "bg-gray-100 text-gray-800",
    "closed": "bg-red-100 text-red-800",
    "pending": "bg-yellow-100 text-yellow-800",
    "accepted": "bg-green-100 text-green-800",
    "rejected": "bg-red-100 text-red-800"
  };
  return colors[status as keyof typeof colors] || colors["pending"];
};

export default function Dashboard() {
  const [selectedJobApplications, setSelectedJobApplications] = useState<string | null>(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [isPostJobModalOpen, setIsPostJobModalOpen] = useState(false);
  const [skillEndorsementModalOpen, setSkillEndorsementModalOpen] = useState(false);
  const [isEditJobModalOpen, setIsEditJobModalOpen] = useState(false);
  const [editingJob, setEditingJob] = useState<JobWithApplications | null>(null);
  const [isPostServiceModalOpen, setIsPostServiceModalOpen] = useState(false);
  const [isEditServiceModalOpen, setIsEditServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<ServiceWithRequests | null>(null);
  const [viewApplicationModalOpen, setViewApplicationModalOpen] = useState(false);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithUser | null>(null);
  const [selectedServiceRequest, setSelectedServiceRequest] = useState<ServiceRequestWithServiceAndUser | null>(null);
  const [viewServiceRequestModalOpen, setViewServiceRequestModalOpen] = useState(false);
  const [currentTab, setCurrentTab] = useState("posted");

  const [reviewData, setReviewData] = useState<ReviewModalData | null>(null);
  const [skillEndorsementData, setSkillEndorsementData] = useState<SkillEndorsementModalData | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { data: userJobs = [], isLoading: jobsLoading } = useQuery<JobWithApplications[]>({
    queryKey: ["/api/user/jobs"],
  });

  const { data: userApplications = [], isLoading: applicationsLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/user/applications"],
  });

  // Query for user services
  const { data: userServices = [], isLoading: servicesLoading, refetch: refetchServices } = useQuery<ServiceWithRequests[]>({
    queryKey: ["/api/user/services"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/services");
      if (!response.ok) throw new Error("Failed to fetch services");
      const data = await response.json();

      return data.services || [];
    },
    enabled: !!user,
    staleTime: 0, // Always refetch when the query is invalidated
    refetchOnWindowFocus: true, // Refetch when window gains focus
  });

  // Query for user coins
  const { data: userCoins = { coins: 0 } } = useQuery<{ coins: number; lastReset?: string; daysUntilReset?: number }>({
    queryKey: ["/api/user/coins"],
    enabled: !!user,
  });

  // Query for user's service enquiries/requests
  const { data: userServiceRequests = [], isLoading: serviceRequestsLoading } = useQuery<ServiceRequestWithServiceAndUser[]>({
    queryKey: ["/api/user/service-requests"],
    queryFn: async () => {
      const response = await apiRequest("GET", "/api/user/service-requests");
      if (!response.ok) throw new Error("Failed to fetch service requests");
      return response.json();
    },
    enabled: !!user,
  });



  // Query to check if freelancer can rate clients for their applications
  const { data: clientRatingEligibility = {} } = useQuery({
    queryKey: ["/api/client-rating-eligibility", userApplications],
    queryFn: async () => {
      if (!user || !userApplications.length) return {};
      
      const acceptedApplications = userApplications.filter(app => app.status === "accepted");
      const eligibilityPromises = acceptedApplications.map(async (application) => {
        const response = await apiRequest("GET", `/api/reviews/can-rate-client/${application.job.id}/${application.job.userId}`);
        if (!response.ok) return { applicationId: application.id, canRate: false, hasRated: false };
        
        const ratingData = await response.json();
        return { 
          applicationId: application.id, 
          jobId: application.job.id,
          clientId: application.job.userId,
          clientName: "Client",
          ...ratingData 
        };
      });
      
      const results = await Promise.all(eligibilityPromises);
      return results.reduce((acc, result) => {
        acc[result.applicationId] = result;
        return acc;
      }, {} as Record<string, ServiceRatingEligibility>);
    },
    enabled: !!user && userApplications.length > 0,
  });

  // Service rating eligibility query
  const { data: serviceRatingEligibility = {} } = useQuery({
    queryKey: ["/api/service-rating-eligibility", userServices],
    queryFn: async () => {
      if (!user || !userServices?.length) return {};
      
      const servicesWithAcceptedRequests = userServices.filter((service: ServiceWithRequests) => 
        service.requests?.some((request: ServiceRequestWithUser) => request.status === "accepted")
      );
      
      const eligibilityPromises: Promise<ServiceRatingEligibility>[] = [];
      
      servicesWithAcceptedRequests.forEach((service: ServiceWithRequests) => {
        const acceptedRequests = service.requests?.filter((request: ServiceRequestWithUser) => request.status === "accepted") || [];
        acceptedRequests.forEach((request: ServiceRequestWithUser) => {
          eligibilityPromises.push(
            apiRequest("GET", `/api/reviews/can-rate-client-service/${service.id}/${request.userId}`)
              .then(response => {
                if (!response.ok) return { serviceId: service.id, requestId: request.id, canRate: false, hasRated: false };
                return response.json().then(data => ({
                  serviceId: service.id,
                  requestId: request.id,
                  clientId: request.userId,
                  ...data
                }));
              })
              .catch(() => ({ serviceId: service.id, requestId: request.id, canRate: false, hasRated: false }))
          );
        });
      });
      
      const results = await Promise.all(eligibilityPromises);
      return results.reduce((acc, result) => {
        const key = `${result.serviceId}-${result.requestId}`;
        acc[key] = result;
        return acc;
      }, {} as Record<string, ServiceRatingEligibility>);
    },
    enabled: !!user && !!userServices?.length,
  });

  // Query to check if client has already reviewed freelancers for their jobs
  const { data: freelancerReviewStatus = {} } = useQuery({
    queryKey: ["/api/freelancer-review-status", userJobs],
    queryFn: async () => {
      if (!user || !userJobs.length) return {};
      
      const reviewStatusMap: Record<string, boolean> = {};
      
      // For each job with accepted applications, check if we've already reviewed the freelancer
      for (const job of userJobs) {
        if (job.applications) {
          for (const application of job.applications) {
            if (application.status === "accepted") {
              try {
                const response = await apiRequest("GET", `/api/reviews/job/${job.id}`);
                if (response.ok) {
                  const reviews = await response.json();
                  // Check if there's already a review from this client for this freelancer on this job
                  const hasReviewed = reviews.some((review: ReviewWithUser) => 
                    review.reviewerId === user.id && 
                    review.revieweeId === application.userId &&
                    review.reviewType === "client_to_worker"
                  );
                  reviewStatusMap[`${job.id}-${application.userId}`] = hasReviewed;
                }
              } catch (error) {
                // If we can't check, assume not reviewed to allow the action
                reviewStatusMap[`${job.id}-${application.userId}`] = false;
              }
            }
          }
        }
      }
      
      return reviewStatusMap;
    },
    enabled: !!user && userJobs.length > 0,
  });

  // Query to check endorsement statuses for job-freelancer combinations
  const { data: endorsementStatuses = {} } = useQuery({
    queryKey: ["/api/endorsement-statuses", userJobs],
    queryFn: async () => {
      if (!user || !userJobs.length) return {};
      
      const endorsementStatusMap: Record<string, boolean> = {};
      
      // For each job with accepted applications, check if we've already endorsed the freelancer
      for (const job of userJobs) {
        if (job.applications) {
          for (const application of job.applications) {
            if (application.status === "accepted" && application.isCompleted) {
              try {
                const response = await apiRequest("GET", `/api/jobs/${job.id}/has-endorsed/${application.userId}`);
                if (response.ok) {
                  const endorsementData = await response.json();
                  endorsementStatusMap[`${job.id}-${application.userId}`] = endorsementData.hasEndorsed;
                } else {
                  endorsementStatusMap[`${job.id}-${application.userId}`] = false;
                }
              } catch (error) {
                // If we can't check, assume not endorsed
                endorsementStatusMap[`${job.id}-${application.userId}`] = false;
              }
            }
          }
        }
      }
      
      return endorsementStatusMap;
    },
    enabled: !!user && userJobs.length > 0,
  });

  const acceptApplicationMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest("PATCH", `/api/applications/${applicationId}`, {
        status: "accepted"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      toast({
        title: "Success",
        description: "Application accepted successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error", 
        description: "Failed to accept application.",
        variant: "destructive",
      });
    },
  });

  // Close job mutation - prevents new applications
  const closeJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("PATCH", `/api/jobs/${jobId}`, {
        status: "in_progress"
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job closed to new applications",
        description: "This job will no longer accept new applications",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to close job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Delete job mutation - permanently removes job and all related data
  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/jobs"] });
      toast({
        title: "Job deleted",
        description: "Your job has been permanently deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: "Failed to delete job. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Mark application as completed mutation
  const markCompletedMutation = useMutation({
    mutationFn: async (applicationId: string) => {
      const res = await apiRequest("PATCH", `/api/applications/${applicationId}/complete`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      toast({
        title: "Work marked as completed",
        description: "The freelancer has been notified that their work is completed.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark work as completed. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Extend job mutation
  const extendJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/extend`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to extend job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/jobs"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Job Extended",
        description: "Your job has been extended for another 30 days. 2 coins have been deducted.",
      });
    },
    onError: (error: Error | ApiError) => {
      const errorMessage = error instanceof Error ? error.message : error.message || "Extension failed";
      toast({
        title: "Extension Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const extendServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const res = await apiRequest("POST", `/api/services/${serviceId}/extend`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to extend service");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Service Extended",
        description: "Your service has been extended for another 30 days. 7 coins have been deducted.",
      });
    },
    onError: (error: Error | ApiError) => {
      const errorMessage = error instanceof Error ? error.message : error.message || "Extension failed";
      toast({
        title: "Extension Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleAcceptApplication = (applicationId: string) => {
    acceptApplicationMutation.mutate(applicationId);
  };

  const handleCloseJob = (jobId: string) => {
    closeJobMutation.mutate(jobId);
  };

  const handleDeleteJob = (jobId: string) => {
    deleteJobMutation.mutate(jobId);
  };

  const handleMarkCompleted = (applicationId: string) => {
    markCompletedMutation.mutate(applicationId);
  };

  const handleExtendJob = (jobId: string) => {
    extendJobMutation.mutate(jobId);
  };

  const handleEditJob = (job: JobWithApplications) => {
    setEditingJob(job);
    setIsEditJobModalOpen(true);
  };

  const handleCloseEditModal = () => {
    setIsEditJobModalOpen(false);
    setEditingJob(null);
  };

  const handleOpenReviewModal = (jobId: string, revieweeId: string, revieweeName: string, reviewType: "client_to_worker" | "worker_to_client", jobTitle?: string) => {
    setReviewData({ jobId, revieweeId, revieweeName, reviewType, jobTitle });
    setReviewModalOpen(true);
  };

  const handleCloseReviewModal = () => {
    setReviewModalOpen(false);
    setReviewData(null);
  };

  const handleOpenSkillEndorsementModal = (jobId: string, endorseeId: string, endorseeName: string, jobTitle: string) => {
    setSkillEndorsementData({ jobId, endorseeId, endorseeName, jobTitle });
    setSkillEndorsementModalOpen(true);
  };

  const handleCloseSkillEndorsementModal = () => {
    setSkillEndorsementModalOpen(false);
    setSkillEndorsementData(null);
  };

  const handleViewApplication = (application: ApplicationWithUser) => {
    setSelectedApplication(application);
    setViewApplicationModalOpen(true);
  };

  const handleCloseApplicationModal = () => {
    setViewApplicationModalOpen(false);
    setSelectedApplication(null);
  };

  // Create conversation mutation
  const createConversationMutation = useMutation({
    mutationFn: async ({ jobId, applicationId, applicantId }: { jobId: string; applicationId: string; applicantId: string }) => {
      if (!user?.id) {
        throw new Error("User not authenticated");
      }
      const response = await apiRequest("POST", "/api/conversations", {
        jobId,
        applicationId,
        jobPosterId: user.id,
        applicantId
      });
      return response.json();
    },
    onSuccess: (conversation) => {
      toast({
        title: "Conversation started",
        description: "You can now message with the applicant",
      });
      // Navigate to messages page with the conversation ID
      window.location.href = `/messages?conversation=${conversation.id}`;
    },
    onError: (error) => {
      console.error("Error creating conversation:", error);
      toast({
        title: "Error",
        description: "Failed to start conversation. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleStartConversation = async (jobId: string, applicationId: string, applicantId: string) => {
    // Check if conversation already exists
    try {
      const response = await apiRequest("GET", `/api/conversations/application/${applicationId}`);
      const existingConversation = await response.json();
      if (existingConversation && existingConversation.id) {
        // Navigate to existing conversation with the conversation ID as URL parameter
        window.location.href = `/messages?conversation=${existingConversation.id}`;
        return;
      }
    } catch (error) {
      // Error means no conversation exists - this is expected for 404

    }
    
    // Create new conversation (either no existing one found, or error occurred)
    createConversationMutation.mutate({ jobId, applicationId, applicantId });
  };

  // Service delete mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      const response = await apiRequest("DELETE", `/api/services/${serviceId}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to delete service");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      toast({
        title: "Service deleted",
        description: "Your service has been successfully deleted.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Service edit handlers
  const handleEditService = (service: ServiceWithRequests) => {
    setEditingService(service);
    setIsEditServiceModalOpen(true);
  };

  const handleCloseEditServiceModal = () => {
    setIsEditServiceModalOpen(false);
    setEditingService(null);
  };

  const handleDeleteService = (serviceId: string, serviceTitle: string) => {
    if (window.confirm(`Are you sure you want to delete "${serviceTitle}"? This action cannot be undone.`)) {
      deleteServiceMutation.mutate(serviceId);
    }
  };

  // Service request handlers
  const handleViewServiceRequest = (request: ServiceRequestWithServiceAndUser | ServiceRequestWithUser) => {
    // Convert ServiceRequestWithUser to ServiceRequestWithServiceAndUser if needed
    const requestWithService = 'service' in request ? request : {
      ...request,
      service: userServices.find(s => s.requests?.some(r => r.id === request.id))!
    } as ServiceRequestWithServiceAndUser;
    
    setSelectedServiceRequest(requestWithService);
    setViewServiceRequestModalOpen(true);
  };

  const handleStartServiceConversation = async (request: ServiceRequestWithServiceAndUser | ServiceRequestWithUser) => {
    try {
      // Create or get existing service conversation
      const conversationResponse = await apiRequest("POST", "/api/service-conversations", {
        serviceRequestId: request.id
      });

      if (!conversationResponse.ok) {
        const error = await conversationResponse.json();
        throw new Error(error.message || "Failed to create conversation");
      }

      const conversationData = await conversationResponse.json();

      toast({
        title: "Success",
        description: "Conversation started! Redirecting to messages...",
      });

      // Navigate to messages with the conversation ID
      window.location.href = `/messages?conversation=${conversationData.id}`;
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const handleCloseServiceRequestModal = () => {
    setViewServiceRequestModalOpen(false);
    setSelectedServiceRequest(null);
  };

  // Accept/Start service request mutation
  const acceptServiceRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("PATCH", `/api/service-requests/${requestId}/accept`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to accept service request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Service Request Accepted",
        description: "You have successfully accepted the service request. The client has been notified.",
      });
    },
    onError: (error: Error | ApiError) => {
      const errorMessage = error instanceof Error ? error.message : error.message || "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const dismissServiceRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("PATCH", `/api/service-requests/${requestId}/dismiss`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to dismiss service request");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      toast({
        title: "Request Dismissed",
        description: "The service request has been dismissed.",
      });
    },
    onError: (error: Error | ApiError) => {
      const errorMessage = error instanceof Error ? error.message : error.message || "An error occurred";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  // Complete service request mutation
  const completeServiceRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const res = await apiRequest("PATCH", `/api/service-requests/${requestId}/complete`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to complete service");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate all relevant queries to update the UI
      queryClient.invalidateQueries({ queryKey: ["/api/user/services"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/service-requests"] });
      queryClient.invalidateQueries({ queryKey: ["/api/reviews/can-rate-client-service"] });
      toast({
        title: "Service Completed",
        description: "The service has been marked as complete. The client will be notified and can now review your work.",
      });
    },
    onError: (error: Error | ApiError) => {
      const errorMessage = error instanceof Error ? error.message : error.message || "Failed to complete service";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const handleStartServiceJob = (requestId: string) => {
    acceptServiceRequestMutation.mutate(requestId);
  };

  const handleDismissServiceRequest = (requestId: string) => {
    dismissServiceRequestMutation.mutate(requestId);
  };

  const handleCompleteServiceRequest = (requestId: string) => {
    completeServiceRequestMutation.mutate(requestId);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Dashboard</h1>
            <p className="text-gray-600">Manage your posted jobs and track applications</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <Button 
              onClick={() => {
                setIsPostJobModalOpen(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Post a Job
            </Button>
            <Button 
              onClick={() => {
                setIsPostServiceModalOpen(true);
              }}
              variant="outline"
              className="border-green-600 text-green-600 hover:bg-green-50 w-full sm:w-auto"
              size="lg"
            >
              <Plus className="h-5 w-5 mr-2" />
              Post a Service
            </Button>
          </div>
        </div>
      </div>

      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        {/* Desktop Tabs */}
        <TabsList className="hidden sm:grid w-full grid-cols-5">
          <TabsTrigger value="posted">Active Jobs ({userJobs.filter(job => job.status === "open" && job.approvalStatus === "approved").length})</TabsTrigger>
          <TabsTrigger value="archived">Archived Jobs ({userJobs.filter(job => job.status === "in_progress" || job.status === "completed" || job.status === "closed").length})</TabsTrigger>
          <TabsTrigger value="services">My Services ({userServices.length})</TabsTrigger>
          <TabsTrigger value="applications">My Applications ({userApplications.length})</TabsTrigger>
          <TabsTrigger value="enquiries">Service Enquiries ({userServiceRequests.filter((request: ServiceRequestWithServiceAndUser) => request.status !== "declined").length})</TabsTrigger>
        </TabsList>

        {/* Mobile Dropdown */}
        <div className="sm:hidden mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {(() => {
                  switch (currentTab) {
                    case "posted":
                      return `Active Jobs (${userJobs.filter(job => job.status === "open" && job.approvalStatus === "approved").length})`;
                    case "archived":
                      return `Archived Jobs (${userJobs.filter(job => job.status === "in_progress" || job.status === "completed").length})`;
                    case "services":
                      return `My Services (${userServices.length})`;
                    case "applications":
                      return `My Applications (${userApplications.length})`;
                    case "enquiries":
                      return `Service Enquiries (${userServiceRequests.filter((request: ServiceRequestWithServiceAndUser) => request.status !== "declined").length})`;
                    default:
                      return "Select Tab";
                  }
                })()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => setCurrentTab("posted")}>
                Active Jobs ({userJobs.filter(job => job.status === "open" && job.approvalStatus === "approved").length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("archived")}>
                Archived Jobs ({userJobs.filter(job => job.status === "in_progress" || job.status === "completed").length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("services")}>
                My Services ({userServices.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("applications")}>
                My Applications ({userApplications.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("enquiries")}>
                Service Enquiries ({userServiceRequests.filter((request: ServiceRequestWithServiceAndUser) => request.status !== "declined").length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Active Jobs Tab */}
        <TabsContent value="posted" className="space-y-6">
          {jobsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userJobs.filter(job => (job.status === "open" && job.approvalStatus === "approved") || job.approvalStatus === "pending").length > 0 ? (
            userJobs.filter(job => (job.status === "open" && job.approvalStatus === "approved") || job.approvalStatus === "pending").map((job: JobWithApplications) => (
              <div key={job.id} className="space-y-4">
                <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-lg font-semibold text-gray-900">{job.title}</h3>
                        <div className="flex gap-2">
                          {job.approvalStatus === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200">
                              ⏳ Pending Review
                            </Badge>
                          )}
                          {job.approvalStatus === "approved" && (
                            <Badge className="bg-green-100 text-green-800 border-green-200">
                              ✅ Published
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {job.approvalStatus === "pending" && (
                        <div className="mb-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <p className="text-sm text-yellow-800">
                            <strong>Your job is under review.</strong> Our team is reviewing your posting and most jobs are approved within 30 minutes. 
                            We're working tirelessly to get your job live as soon as possible!
                          </p>
                        </div>
                      )}
                      
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-2 sm:gap-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Posted {formatTimeAgo(job.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>{formatBudgetText(job)}</span>
                        </div>
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>Expires {job.expiresAt ? format(new Date(job.expiresAt), 'MMM d, yyyy') : 'No expiry'}</span>
                        </div>
                      </div>
                      

                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Badge className={`${getStatusColor(job.status)} border-0 whitespace-nowrap w-fit`}>
                        {job.applicationCount} Applications
                      </Badge>
                      {job.status === "open" && (
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditJob(job)}
                            className="flex-1 sm:flex-none"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">Edit</span>
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to delete this job? This action cannot be undone and will remove all applications and related data.")) {
                                handleDeleteJob(job.id);
                              }
                            }}
                            disabled={deleteJobMutation.isPending}
                            className="flex-1 sm:flex-none"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            <span className="hidden sm:inline">{deleteJobMutation.isPending ? "Deleting..." : "Delete"}</span>
                            <span className="sm:hidden">Delete</span>
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Job expiry warning inside the card */}
                  {job.expiresAt && job.status === "open" && (
                    <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center space-x-2">
                          <Calendar className="h-5 w-5 text-blue-600" />
                          <span className="text-blue-800 font-medium">
                            Job expires on {format(new Date(job.expiresAt), 'MMMM d, yyyy')}
                          </span>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto font-medium"
                          onClick={() => extendJobMutation.mutate(job.id)}
                          disabled={extendJobMutation.isPending}
                        >
                          {extendJobMutation.isPending ? "Extending..." : "Extend 30 Days (2 coins)"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Combined Application Rankings & List */}
                  {job.applications && job.applications.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 flex items-center gap-2">
                          <Trophy className="h-4 w-4" />
                          Application Rankings
                          <Badge variant="secondary" className="ml-2">
                            {job.applications.length} applicant{job.applications.length !== 1 ? 's' : ''}
                          </Badge>
                        </h4>
                        {job.applications.length > 2 && (
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedJobApplications(
                              selectedJobApplications === job.id ? null : job.id
                            )}
                          >
                            {selectedJobApplications === job.id ? "Show Less" : `View All ${job.applications.length}`}
                          </Button>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        {(selectedJobApplications === job.id ? job.applications : job.applications.slice(0, 2))
                          .sort((a, b) => (b.coinsBid || 0) - (a.coinsBid || 0))
                          .map((application: ApplicationWithUser, index) => {
                            const rank = index + 1;
                            const getRankIcon = (rank: number) => {
                              switch (rank) {
                                case 1:
                                  return <Trophy className="h-4 w-4 text-yellow-500" />;
                                case 2:
                                  return <Medal className="h-4 w-4 text-gray-400" />;
                                case 3:
                                  return <Award className="h-4 w-4 text-amber-600" />;
                                default:
                                  return <span className="text-xs font-medium text-gray-500 w-4 text-center">#{rank}</span>;
                              }
                            };
                            
                            const getRankBgColor = (rank: number) => {
                              switch (rank) {
                                case 1:
                                  return "bg-gradient-to-r from-yellow-50 to-amber-50 border-yellow-200";
                                case 2:
                                  return "bg-gradient-to-r from-gray-50 to-slate-50 border-gray-200";
                                case 3:
                                  return "bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200";
                                default:
                                  return "bg-gray-50 border-gray-200";
                              }
                            };
                            
                            return (
                              <div 
                                key={application.id} 
                                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-all ${getRankBgColor(rank)}`}
                                onClick={() => handleViewApplication(application)}
                              >
                                {/* Mobile-First Layout */}
                                <div className="space-y-3">
                                  {/* Top Section - User Info */}
                                  <div className="flex items-center space-x-3">
                                    <div className="flex items-center justify-center w-8 h-8 shrink-0">
                                      {getRankIcon(rank)}
                                    </div>
                                    <Avatar className="shrink-0">
                                      <AvatarFallback>
                                        {application.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                      </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                        <p className="font-medium text-gray-900 truncate">{application.user.name}</p>
                                        {application.coinsBid && application.coinsBid > 0 && (
                                          <div className="flex items-center gap-1 bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs w-fit">
                                            <Coins className="h-3 w-3" />
                                            <span>{application.coinsBid} coin{application.coinsBid !== 1 ? 's' : ''}</span>
                                          </div>
                                        )}
                                      </div>
                                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-1 sm:gap-2">
                                        <span>Bid: ${application.bidAmount}</span>
                                        <span className="hidden sm:inline">•</span>
                                        <span>{formatTimeAgo(application.createdAt)}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Experience Section */}
                                  {application.experience && (
                                    <div className="bg-gray-50 rounded-lg p-2">
                                      <p className="text-sm text-gray-600 line-clamp-2">
                                        {application.experience}
                                      </p>
                                    </div>
                                  )}
                                  
                                  {/* Status and Actions Section */}
                                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3" onClick={(e) => e.stopPropagation()}>
                                    {/* Status Badges */}
                                    <div className="flex flex-wrap gap-2">
                                      {application.status === "accepted" && (
                                        <>
                                          <Badge className="bg-green-100 text-green-800 border-0">
                                            Accepted
                                          </Badge>
                                          {application.isCompleted && (
                                            <Badge className="bg-blue-100 text-blue-800 border-0">
                                              Completed
                                            </Badge>
                                          )}
                                        </>
                                      )}
                                      {application.status === "rejected" && (
                                        <Badge className="bg-red-100 text-red-800 border-0">
                                          Declined
                                        </Badge>
                                      )}
                                      {application.status === "pending" && (
                                        <Badge className="bg-yellow-100 text-yellow-800 border-0">
                                          Pending
                                        </Badge>
                                      )}
                                    </div>
                                    
                                    {/* Action Buttons */}
                                    <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                      {/* Always show View and Message buttons */}
                                      <Button 
                                        variant="outline" 
                                        size="default"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleViewApplication(application);
                                        }}
                                        className="flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                      >
                                        <Eye className="h-5 w-5 sm:h-4 sm:w-4 mr-2 sm:mr-1" />
                                        <span>View</span>
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="default"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleStartConversation(job.id, application.id, application.userId);
                                        }}
                                        disabled={createConversationMutation.isPending}
                                        className="flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                      >
                                        <MessageCircle className="h-5 w-5 sm:h-4 sm:w-4 mr-2 sm:mr-1" />
                                        <span>Message</span>
                                      </Button>
                                      
                                      {/* Pending status button */}
                                      {application.status === "pending" && (
                                        <Button 
                                          size="default"
                                          className="bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            handleAcceptApplication(application.id);
                                          }}
                                          disabled={acceptApplicationMutation.isPending}
                                        >
                                          Accept
                                        </Button>
                                      )}
                                      
                                      {/* Accepted status buttons - aligned horizontally on desktop */}
                                      {application.status === "accepted" && (
                                        <>
                                          {!freelancerReviewStatus[`${job.id}-${application.userId}`] && (
                                            <Button 
                                              variant="outline" 
                                              size="default"
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (!application.isCompleted) {
                                                  handleMarkCompleted(application.id);
                                                  setTimeout(() => {
                                                    handleOpenReviewModal(job.id, application.userId, application.user?.name || "Freelancer", "client_to_worker", job.title);
                                                  }, 500);
                                                } else {
                                                  handleOpenReviewModal(job.id, application.userId, application.user?.name || "Freelancer", "client_to_worker", job.title);
                                                }
                                              }}
                                              disabled={markCompletedMutation.isPending}
                                              className="flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                            >
                                              <Star className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                                              <span className="hidden sm:inline">{application.isCompleted ? "Leave Review" : "Mark Complete & Review"}</span>
                                              <span className="sm:hidden">{application.isCompleted ? "Review" : "Complete"}</span>
                                            </Button>
                                          )}
                                          {freelancerReviewStatus[`${job.id}-${application.userId}`] && (
                                            <Badge variant="secondary" className="bg-green-100 text-green-800 flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal flex items-center justify-center">
                                              <Star className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                                              <span className="hidden sm:inline">Review Submitted</span>
                                              <span className="sm:hidden">Reviewed</span>
                                            </Badge>
                                          )}
                                          {application.isCompleted && (
                                            endorsementStatuses[`${job.id}-${application.userId}`] ? (
                                              <Button 
                                                variant="outline" 
                                                size="default"
                                                disabled
                                                className="bg-gray-50 text-gray-500 border-gray-200 cursor-not-allowed flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                              >
                                                <Award className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                                                <span className="hidden sm:inline">Already Endorsed</span>
                                                <span className="sm:hidden">Endorsed</span>
                                              </Button>
                                            ) : (
                                              <Button 
                                                variant="outline" 
                                                size="default"
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  handleOpenSkillEndorsementModal(job.id, application.userId, application.user?.name || "Freelancer", job.title);
                                                }}
                                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 flex-1 sm:flex-none h-12 sm:h-9 text-base sm:text-sm font-medium sm:font-normal"
                                              >
                                                <Award className="h-5 w-5 sm:h-4 sm:w-4 sm:mr-1" />
                                                <span className="hidden sm:inline">Endorse Skills</span>
                                                <span className="sm:hidden">Endorse</span>
                                              </Button>
                                            )
                                          )}
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                      
                      {/* Close job button when accepted applications exist and job is still open */}
                      {job.status === "open" && job.applications?.some(app => app.status === "accepted") && (
                        <div className="mt-4 pt-4 border-t border-gray-100">
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                            <div className="text-sm text-gray-600">
                              You have accepted an application. Close this job to prevent new applications.
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCloseJob(job.id)}
                              disabled={closeJobMutation.isPending}
                              className="bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100 w-full sm:w-auto"
                            >
                              <X className="h-4 w-4 mr-1" />
                              Archive Job
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Rate freelancer button for completed jobs */}
                      {job.status === "completed" && (() => {
                        const acceptedApp = job.applications?.find(app => app.status === "accepted");
                        const hasReviewed = acceptedApp ? freelancerReviewStatus[`${job.id}-${acceptedApp.userId}`] : false;
                        
                        return !hasReviewed && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (acceptedApp) {
                                    handleOpenReviewModal(job.id, acceptedApp.userId, acceptedApp.user?.name || "Freelancer", "client_to_worker", job.title);
                                  }
                                }}
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Rate Freelancer
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (acceptedApp) {
                                    handleOpenSkillEndorsementModal(job.id, acceptedApp.userId, acceptedApp.user?.name || "Freelancer", job.title);
                                  }
                                }}
                                className="bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                              >
                                <Award className="h-4 w-4 mr-1" />
                                Endorse Skills
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {job.applicationCount === 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-gray-500 text-center py-4">No applications yet</p>
                    </div>
                  )}
                </CardContent>
                </Card>
              </div>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No active jobs</h3>
                <p className="text-gray-600">Start by posting your first job to get help with tasks.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Archived Jobs Tab */}
        <TabsContent value="archived" className="space-y-6">
          {jobsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userJobs.filter(job => job.status === "in_progress" || job.status === "completed" || job.status === "closed").length > 0 ? (
            userJobs.filter(job => job.status === "in_progress" || job.status === "completed" || job.status === "closed").map((job: JobWithApplications) => (
              <Card key={job.id}>
                <CardContent className="p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.title}</h3>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-2 sm:gap-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Posted {formatTimeAgo(job.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{job.location}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>{formatBudgetText(job)}</span>
                        </div>
                        {/* Only show expiry information to job owners */}
                        <div className="flex items-center">
                          <Calendar className="h-4 w-4 mr-1" />
                          <span>{job.expiresAt ? `Expired ${format(new Date(job.expiresAt), 'MMM d, yyyy')}` : 'No expiry'}</span>
                        </div>
                      </div>
                    </div>
                    <Badge className={`${getStatusColor(job.status)} border-0 w-fit`}>
                      {job.status === "in_progress" ? "Closed" : "Completed"}
                    </Badge>
                  </div>

                  <p className="text-gray-600 text-sm mb-4">{job.description}</p>

                  {/* Applications List for Archived Jobs */}
                  {job.applications && job.applications.length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="font-medium text-gray-900 mb-3">Applications</h4>
                      
                      <div className="space-y-3">
                        {job.applications.map((application: ApplicationWithUser) => (
                          <div 
                            key={application.id} 
                            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleViewApplication(application)}
                          >
                            {/* User Info Section */}
                            <div className="flex items-center space-x-3 mb-3">
                              <Avatar>
                                <AvatarFallback>
                                  {application.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-900">{application.user.name}</p>
                                <div className="flex items-center text-sm text-gray-600 space-x-2">
                                  <span>Bid: ${application.bidAmount}</span>
                                  <span>•</span>
                                  <span>{formatTimeAgo(application.createdAt)}</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Status and Actions */}
                            <div className="flex flex-wrap items-center justify-between gap-2" onClick={(e) => e.stopPropagation()}>
                              <div>
                                {application.status === "accepted" ? (
                                  <Badge className="bg-green-100 text-green-800 border-0">
                                    Accepted
                                  </Badge>
                                ) : (
                                  <Badge variant="secondary">
                                    {application.status}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="flex flex-col sm:flex-row gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewApplication(application);
                                  }}
                                  className="w-full sm:w-auto"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartConversation(job.id, application.id, application.userId);
                                  }}
                                  disabled={createConversationMutation.isPending}
                                  className="w-full sm:w-auto"
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Message</span>
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {/* Rate freelancer button for completed jobs */}
                      {job.status === "completed" && (() => {
                        const acceptedApp = job.applications?.find(app => app.status === "accepted");
                        const hasReviewed = acceptedApp ? freelancerReviewStatus[`${job.id}-${acceptedApp.userId}`] : false;
                        
                        return !hasReviewed && (
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  if (acceptedApp) {
                                    handleOpenReviewModal(job.id, acceptedApp.userId, acceptedApp.user?.name || "Freelancer", "client_to_worker", job.title);
                                  }
                                }}
                                className="w-full sm:w-auto"
                              >
                                <Star className="h-4 w-4 mr-1" />
                                Rate Freelancer
                              </Button>
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No archived jobs</h3>
                <p className="text-gray-600">Closed and completed jobs will appear here.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Services Tab */}
        <TabsContent value="services" className="space-y-6">
          {servicesLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userServices.length > 0 ? (
            userServices.map((service: ServiceWithRequests) => (
              <Card key={service.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  {/* Service Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-4">
                    <div className="flex-1">
                      <div className="mb-3">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{service.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          <Badge 
                            className={`text-xs ${
                              service.approvalStatus === "approved" 
                                ? "bg-green-100 text-green-800 border-green-200" 
                                : service.approvalStatus === "rejected"
                                ? "bg-red-100 text-red-800 border-red-200"
                                : "bg-yellow-100 text-yellow-800 border-yellow-200"
                            }`}
                          >
                            {service.approvalStatus === "approved" ? "✓ Approved" : 
                             service.approvalStatus === "rejected" ? "✗ Rejected" : 
                             "⏳ Pending Review"}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {service.category}
                          </Badge>
                          {service.tags && service.tags.slice(0, 2).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              <span className="mr-1">#</span>
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 gap-2 sm:gap-4 mb-3">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Posted {formatTimeAgo(service.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{service.location}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>
                            From {getCurrencySymbol(service.currency)}{service.priceFrom}
                            {service.priceTo && ` - ${getCurrencySymbol(service.currency)}${service.priceTo}`}
                            {service.priceType === "hourly" && "/hr"}
                            {service.priceType === "per_project" && "/project"}
                          </span>
                        </div>
                      </div>


                    </div>
                    
                    <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
                      <Badge className="bg-blue-100 text-blue-800 border-0 whitespace-nowrap w-fit">
                        {service.requestCount || 0} Requests
                      </Badge>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => handleEditService(service)}
                        >
                          <Edit className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">Edit</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => handleDeleteService(service.id, service.title)}
                          disabled={deleteServiceMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          <span className="hidden sm:inline">{deleteServiceMutation.isPending ? "Deleting..." : "Delete"}</span>
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Service Description - Full Width */}
                  <div className="mb-4">
                    <p className="text-gray-600 text-sm line-clamp-3">{service.description}</p>
                  </div>

                  {/* Service Expiry Information - Full Width */}
                  {service.expiresAt && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center text-sm text-yellow-800">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>
                            Expires on {format(new Date(service.expiresAt), "MMM dd, yyyy")}
                            {/* Days until expiry */}
                            {(() => {
                              const now = new Date();
                              const expiry = new Date(service.expiresAt);
                              const daysLeft = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysLeft <= 0) {
                                return " (Expired)";
                              } else if (daysLeft <= 7) {
                                return ` (${daysLeft} day${daysLeft !== 1 ? 's' : ''} left)`;
                              } else {
                                return ` (${daysLeft} days left)`;
                              }
                            })()}
                          </span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => extendServiceMutation.mutate(service.id)}
                          disabled={extendServiceMutation.isPending}
                          className="w-full sm:w-auto"
                        >
                          {extendServiceMutation.isPending ? "Extending..." : "Extend 30 Days (7 coins)"}
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Service Requests */}
                  {service.requests && service.requests.filter(request => request.status !== "declined").length > 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                        <MessageCircle className="h-4 w-4" />
                        Recent Requests
                        <Badge variant="secondary" className="ml-2">
                          {service.requests.filter(request => request.status !== "declined").length}
                        </Badge>
                      </h4>
                      
                      <div className="space-y-2">
                        {service.requests
                          .filter(request => request.status !== "declined")
                          .sort((a, b) => new Date(b.createdAt || new Date()).getTime() - new Date(a.createdAt || new Date()).getTime()) // Sort by newest first
                          .slice(0, 5) // Show up to 5 recent requests instead of just 2
                          .map((request, index) => (
                          <div 
                            key={index} 
                            className="p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
                            onClick={() => handleViewServiceRequest(request)}
                          >
                            <div className="flex items-center space-x-3 mb-3">
                              <Avatar className="w-8 h-8">
                                <AvatarFallback className="text-xs">
                                  {request.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="text-sm font-medium text-gray-900">{request.user?.name || 'Anonymous User'}</p>
                                <p className="text-xs text-gray-600">{formatTimeAgo(request.createdAt)}</p>
                              </div>
                            </div>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <div className="flex gap-2">
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewServiceRequest(request);
                                  }}
                                  className="flex-1 sm:flex-none"
                                >
                                  <Eye className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">View</span>
                                </Button>
                                <Button 
                                  variant="outline" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleStartServiceConversation(request);
                                  }}
                                  className="flex-1 sm:flex-none"
                                >
                                  <MessageCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Message</span>
                                </Button>
                              </div>
                              
                              {request.status === "pending" && (
                                <div className="flex gap-2">
                                  <Button 
                                    variant="default" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleStartServiceJob(request.id);
                                    }}
                                    disabled={acceptServiceRequestMutation.isPending || userCoins.coins < 2}
                                    className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                                  >
                                    <Check className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">{acceptServiceRequestMutation.isPending ? "Starting..." : "Start Job"}</span>
                                    <span className="sm:hidden">Start</span>
                                    <span className={`ml-1 text-xs flex items-center ${
                                      userCoins.coins < 2 
                                        ? 'text-red-200' 
                                        : 'text-green-200'
                                    }`}>
                                      <Coins className={`h-3 w-3 mr-0.5 ${
                                        userCoins.coins < 2 
                                          ? 'text-red-300' 
                                          : 'text-yellow-300'
                                      }`} />
                                      2
                                    </span>
                                  </Button>
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDismissServiceRequest(request.id);
                                    }}
                                    disabled={dismissServiceRequestMutation.isPending}
                                    className="text-red-600 border-red-300 hover:bg-red-50 flex-1 sm:flex-none"
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    <span className="hidden sm:inline">{dismissServiceRequestMutation.isPending ? "Dismissing..." : "Dismiss"}</span>
                                    <span className="sm:hidden">Dismiss</span>
                                  </Button>
                                </div>
                              )}
                              
                              {request.status === "accepted" && !request.completedAt && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleCompleteServiceRequest(request.id);
                                  }}
                                  disabled={completeServiceRequestMutation.isPending}
                                  className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">{completeServiceRequestMutation.isPending ? "Completing..." : "Complete Job"}</span>
                                  <span className="sm:hidden">Complete</span>
                                </Button>
                              )}
                              
                              {request.status === "accepted" && request.completedAt && !serviceRatingEligibility[`${service.id}-${request.id}`]?.hasRated && (
                                <Button 
                                  variant="default" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Open review modal for the client
                                    setReviewData({
                                      jobId: service.id,
                                      revieweeId: request.userId,
                                      revieweeName: request.user?.name || "Client",
                                      reviewType: "worker_to_client",
                                      jobTitle: service.title
                                    });
                                    setReviewModalOpen(true);
                                  }}
                                  className="bg-yellow-600 hover:bg-yellow-700 text-white w-full sm:w-auto"
                                >
                                  <Star className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Rate Client</span>
                                  <span className="sm:hidden">Rate</span>
                                </Button>
                              )}
                              
                              {request.status === "accepted" && request.completedAt && serviceRatingEligibility[`${service.id}-${request.id}`]?.hasRated && (
                                <Badge variant="secondary" className="bg-green-100 text-green-800 w-fit">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Completed & Rated</span>
                                  <span className="sm:hidden">Done</span>
                                </Badge>
                              )}
                              
                              {request.status === "accepted" && request.completedAt && !serviceRatingEligibility[`${service.id}-${request.id}`]?.hasRated && (
                                <Badge variant="secondary" className="bg-blue-100 text-blue-800 w-fit">
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  <span className="hidden sm:inline">Job Completed</span>
                                  <span className="sm:hidden">Complete</span>
                                </Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {service.requestCount === 0 && (
                    <div className="border-t border-gray-100 pt-4">
                      <p className="text-gray-500 text-center py-4">No requests yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services posted</h3>
                <p className="text-gray-600 mb-6">Start offering your skills by posting your first service.</p>
                <Button 
                  onClick={() => setIsPostServiceModalOpen(true)}
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Post Your First Service
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* My Applications Tab */}
        <TabsContent value="applications" className="space-y-6">
          {applicationsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userApplications.length > 0 ? (
            userApplications.map((application: ApplicationWithJob) => (
              <Card key={application.id}>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">{application.job.title}</h3>
                        <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 mt-1 gap-2 sm:gap-4">
                          <div className="flex items-center">
                            <Clock className="h-4 w-4 mr-1" />
                            <span>Applied {formatTimeAgo(application.createdAt)}</span>
                          </div>
                          <div className="flex items-center">
                            <MapPin className="h-4 w-4 mr-1" />
                            <span>{application.job.location}</span>
                          </div>
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 mr-1" />
                            <span>My bid: ${application.bidAmount}</span>
                          </div>
                        </div>
                      </div>
                      <Badge className={`${getStatusColor(application.status)} border-0 w-fit`}>
                        {application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                      </Badge>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700 font-medium mb-2">Your Message:</p>
                    <p className="text-sm text-gray-600">{application.message}</p>
                    {application.experience && (
                      <>
                        <p className="text-sm text-gray-700 font-medium mt-3 mb-2">Experience:</p>
                        <p className="text-sm text-gray-600">{application.experience}</p>
                      </>
                    )}
                  </div>

                  {/* Bid Management Section */}
                  <div className="mt-4">
                    <BidManagement application={application} />
                  </div>
                  
                  {/* Rate client button for freelancers who received reviews */}
                  {application.status === "accepted" && clientRatingEligibility[application.id] && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="text-sm text-gray-600">
                          {clientRatingEligibility[application.id]?.canRate && !clientRatingEligibility[application.id]?.hasRated && 
                            "You received a review from this client. Rate them back!"}
                          {clientRatingEligibility[application.id]?.hasRated && 
                            "You have rated this client"}
                          {!clientRatingEligibility[application.id]?.canRate && 
                            "Complete the work to receive a review and rate the client"}
                        </div>
                        {clientRatingEligibility[application.id]?.canRate && !clientRatingEligibility[application.id]?.hasRated && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              handleOpenReviewModal(
                                clientRatingEligibility[application.id].jobId, 
                                clientRatingEligibility[application.id].clientId, 
                                clientRatingEligibility[application.id].clientName, 
                                "worker_to_client"
                              );
                            }}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 w-full sm:w-auto"
                          >
                            <Star className="h-4 w-4 mr-1" />
                            Rate Client
                          </Button>
                        )}
                        {clientRatingEligibility[application.id]?.hasRated && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Client Rated
                          </Badge>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No applications submitted</h3>
                <p className="text-gray-600">Browse jobs and start applying to earn money.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Service Enquiries Tab */}
        <TabsContent value="enquiries" className="space-y-6">
          {serviceRequestsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded mb-4"></div>
                    <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : userServiceRequests.filter((request: ServiceRequestWithServiceAndUser) => request.status !== "declined").length > 0 ? (
            userServiceRequests.filter((request: ServiceRequestWithServiceAndUser) => request.status !== "declined").map((request: ServiceRequestWithServiceAndUser) => (
              <Card key={request.id}>
                <CardContent className="p-4 sm:p-6">
                  <div className="space-y-4">
                    {/* Header Section */}
                    <div className="space-y-3">
                      <div className="flex flex-col gap-2">
                        <h3 className="text-lg font-semibold text-gray-900 break-words">{request.service?.title}</h3>
                        <div className="flex flex-wrap gap-2">
                          {request.status === "pending" && (
                            <Badge className="bg-yellow-100 text-yellow-800 border-yellow-200 text-xs">
                              ⏳ Pending Response
                            </Badge>
                          )}
                          {request.status === "accepted" && (
                            <Badge className="bg-green-100 text-green-800 border-green-200 text-xs">
                              ✅ Job Started
                            </Badge>
                          )}
                          {request.status === "declined" && (
                            <Badge className="bg-red-100 text-red-800 border-red-200 text-xs">
                              ❌ Declined
                            </Badge>
                          )}
                        </div>
                      </div>
                      
                      {/* Info Grid - Mobile Stack */}
                      <div className="space-y-2 sm:space-y-0 sm:flex sm:items-center sm:gap-4 text-sm text-gray-600">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 shrink-0" />
                          <span className="truncate">Requested {formatTimeAgo(request.createdAt)}</span>
                        </div>
                        <div className="flex items-center min-w-0">
                          <User className="h-4 w-4 mr-1 shrink-0" />
                          <span className="truncate">Provider: {request.service?.user?.email || "Unknown"}</span>
                        </div>
                        <div className="flex items-center min-w-0">
                          <MapPin className="h-4 w-4 mr-1 shrink-0" />
                          <span className="truncate">{request.service?.location}</span>
                        </div>
                      </div>
                    </div>

                    {/* Message Section */}
                    <div className="space-y-3">
                      <p className="text-gray-700 text-sm sm:text-base break-words">{request.message}</p>

                      {request.status === "accepted" && (
                        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                          <p className="text-sm text-green-800">
                            <strong>Great news!</strong> The service provider has started your job. You can now message them to coordinate the work.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-col gap-2 sm:flex-row sm:gap-3 pt-2">
                      {request.status === "accepted" && (
                        <>
                          <Button
                            onClick={() => {
                              // Navigate to service details page 
                              setLocation(`/service/${request.service?.id}`);
                            }}
                            variant="outline"
                            size="sm"
                            className="w-full sm:w-auto"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            <span className="sm:hidden">Details</span>
                            <span className="hidden sm:inline">View Service Details</span>
                          </Button>
                          
                          <RateProviderButton
                            serviceId={request.service?.id || ""}
                            serviceProviderId={request.service?.userId || ""}
                            serviceName={request.service?.title || "Service"}
                            providerName={request.service?.user?.email || "Service Provider"}
                            onRate={(serviceId, providerId, providerName, serviceName) => {
                              setReviewData({
                                jobId: serviceId,
                                revieweeId: providerId,
                                revieweeName: providerName,
                                reviewType: "client_to_worker",
                                jobTitle: serviceName
                              });
                              setReviewModalOpen(true);
                            }}
                          />
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No service enquiries yet</h3>
                <p className="text-gray-600 mb-4">Browse our services marketplace and send enquiries to get started.</p>
                <Button 
                  onClick={() => setLocation("/services")}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Browse Services
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      {/* Post Job Modal */}
      <PostJobModal
        isOpen={isPostJobModalOpen}
        onClose={() => setIsPostJobModalOpen(false)}
      />

      {/* Edit Job Modal */}
      <PostJobModal 
        isOpen={isEditJobModalOpen} 
        onClose={handleCloseEditModal}
        editingJob={editingJob}
        isEditing={true}
      />

      {/* Post Service Modal */}
      <PostServiceModal
        isOpen={isPostServiceModalOpen}
        onClose={() => setIsPostServiceModalOpen(false)}
      />

      {/* Edit Service Modal */}
      <PostServiceModal
        isOpen={isEditServiceModalOpen}
        onClose={handleCloseEditServiceModal}
        editingService={editingService ? {
          id: editingService.id,
          title: editingService.title || "",
          description: editingService.description || "",
          category: editingService.category || "",
          location: editingService.location || "",
          specificArea: editingService.specificArea || "",
          priceFrom: editingService.priceFrom || 0,
          priceTo: editingService.priceTo || undefined,
          priceType: editingService.priceType || "per_project",
          currency: editingService.currency || "USD",
          experienceLevel: editingService.experienceLevel || "intermediate",
          deliveryTime: editingService.deliveryTime || "",
          serviceDuration: editingService.duration || "",
          website: editingService.website || "",
          tags: editingService.tags || []
        } : undefined}
        isEditing={true}
      />

      {/* Review Modal */}
      {reviewData && (
        <ReviewModal
          isOpen={reviewModalOpen}
          onClose={handleCloseReviewModal}
          jobId={reviewData.jobId}
          revieweeId={reviewData.revieweeId}
          revieweeName={reviewData.revieweeName}
          reviewType={reviewData.reviewType}
          jobTitle={reviewData.jobTitle}
        />
      )}

      {/* Application View Modal */}
      <Dialog open={viewApplicationModalOpen} onOpenChange={setViewApplicationModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <User className="h-5 w-5" />
              <span>Application Details</span>
            </DialogTitle>
            <DialogDescription>
              View complete application information and take action.
            </DialogDescription>
          </DialogHeader>
          
          {selectedApplication && (
            <div className="space-y-4 sm:space-y-6">
              {/* Applicant Information */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                {/* Mobile-first layout */}
                <div className="space-y-3 sm:space-y-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarFallback className="text-sm sm:text-lg font-semibold">
                        {selectedApplication.user.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedApplication.user.name}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">@{selectedApplication.user.username}</p>
                    </div>
                    <Link href={`/profile/${selectedApplication.userId}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shrink-0"
                      >
                        <User className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">See Profile</span>
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Grid Info - Stack on mobile */}
                  <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Bid Amount:</span>
                      <p className="text-lg font-semibold text-green-600">${selectedApplication.bidAmount}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Applied:</span>
                      <p className="text-gray-900">{formatTimeAgo(selectedApplication.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Status:</span>
                      <Badge className={`${getStatusColor(selectedApplication.status)} border-0 mt-1`}>
                        {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                      </Badge>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Email:</span>
                      <p className="text-gray-900 break-all">{selectedApplication.user.email}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Application Message */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 sm:mb-3">Application Message</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedApplication.message}</p>
                </div>
              </div>

              {/* Experience Section */}
              {selectedApplication.experience && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 sm:mb-3">Experience & Qualifications</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedApplication.experience}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons - Stack on mobile */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => handleStartConversation(
                    selectedApplication.jobId, 
                    selectedApplication.id, 
                    selectedApplication.userId
                  )}
                  disabled={createConversationMutation.isPending}
                  className="w-full sm:flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message Applicant
                </Button>
                
                {selectedApplication.status === "accepted" && (
                  <Button 
                    variant="outline"
                    onClick={() => {
                      if (!selectedApplication.isCompleted) {
                        // Mark as completed first, then open review modal
                        handleMarkCompleted(selectedApplication.id);
                        // Small delay to ensure completion is processed
                        setTimeout(() => {
                          handleOpenReviewModal(selectedApplication.jobId, selectedApplication.userId, selectedApplication.user?.name || "Freelancer", "client_to_worker", "Job");
                        }, 500);
                      } else {
                        // If already completed, just open review modal
                        handleOpenReviewModal(selectedApplication.jobId, selectedApplication.userId, selectedApplication.user?.name || "Freelancer", "client_to_worker", "Job");
                      }
                      handleCloseApplicationModal();
                    }}
                    disabled={markCompletedMutation.isPending}
                    className="w-full sm:flex-1 bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    <span className="sm:hidden">{selectedApplication.isCompleted ? "Review" : "Complete"}</span>
                    <span className="hidden sm:inline">{selectedApplication.isCompleted ? "Rate Freelancer" : "Complete & Rate"}</span>
                  </Button>
                )}
                
                {selectedApplication.status === "pending" && (
                  <Button 
                    onClick={() => {
                      handleAcceptApplication(selectedApplication.id);
                      handleCloseApplicationModal();
                    }}
                    disabled={acceptApplicationMutation.isPending}
                    className="w-full sm:flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Accept Application
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SkillEndorsementModal
        isOpen={skillEndorsementModalOpen}
        onClose={handleCloseSkillEndorsementModal}
        endorseeId={skillEndorsementData?.endorseeId || ""}
        endorseeName={skillEndorsementData?.endorseeName || ""}
        jobId={skillEndorsementData?.jobId || ""}
        jobTitle={skillEndorsementData?.jobTitle || ""}
      />

      {/* Service Request View Modal */}
      <Dialog open={viewServiceRequestModalOpen} onOpenChange={setViewServiceRequestModalOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center space-x-2">
              <MessageCircle className="h-5 w-5" />
              <span>Service Request Details</span>
            </DialogTitle>
            <DialogDescription>
              View complete service request information and take action.
            </DialogDescription>
          </DialogHeader>
          
          {selectedServiceRequest && (
            <div className="space-y-4 sm:space-y-6">
              {/* Client Information */}
              <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                <div className="space-y-3 sm:space-y-4">
                  {/* User Info */}
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12">
                      <AvatarFallback className="text-sm sm:text-lg font-semibold">
                        {selectedServiceRequest.user?.name?.split(' ').map((n: string) => n[0]).join('').toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{selectedServiceRequest.user?.name || 'Anonymous User'}</h3>
                      <p className="text-xs sm:text-sm text-gray-600">@{selectedServiceRequest.user?.username || 'anonymous'}</p>
                    </div>
                    <Link href={`/profile/${selectedServiceRequest.userId}`}>
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="shrink-0"
                      >
                        <User className="h-4 w-4 sm:mr-2" />
                        <span className="hidden sm:inline">See Profile</span>
                      </Button>
                    </Link>
                  </div>
                  
                  {/* Grid Info - Stack on mobile */}
                  <div className="space-y-3 sm:grid sm:grid-cols-2 sm:gap-4 sm:space-y-0 text-sm">
                    <div>
                      <span className="font-medium text-gray-700">Requested:</span>
                      <p className="text-gray-900">{formatTimeAgo(selectedServiceRequest.createdAt)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-gray-700">Timeline:</span>
                      <p className="text-gray-900">{selectedServiceRequest.timeline || 'Not specified'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Service Request Message */}
              <div>
                <h4 className="font-medium text-gray-900 mb-2 sm:mb-3">Request Message</h4>
                <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                  <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedServiceRequest.message || 'No message provided.'}</p>
                </div>
              </div>

              {/* Additional Requirements */}
              {selectedServiceRequest.requirements && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2 sm:mb-3">Additional Requirements</h4>
                  <div className="bg-white border border-gray-200 rounded-lg p-3 sm:p-4">
                    <p className="text-gray-700 whitespace-pre-wrap text-sm sm:text-base">{selectedServiceRequest.requirements}</p>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t border-gray-200">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    handleStartServiceConversation(selectedServiceRequest);
                    handleCloseServiceRequestModal();
                  }}
                  className="w-full sm:flex-1"
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  Message
                </Button>
                
                {selectedServiceRequest.status === "pending" && (
                  <Button 
                    onClick={() => {
                      handleStartServiceJob(selectedServiceRequest.id);
                      handleCloseServiceRequestModal();
                    }}
                    disabled={acceptServiceRequestMutation.isPending || userCoins.coins < 2}
                    className="w-full sm:flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    {acceptServiceRequestMutation.isPending ? "Starting..." : "Start Job"}
                    <span className={`ml-2 text-xs flex items-center ${
                      userCoins.coins < 2 
                        ? 'text-red-200' 
                        : 'text-green-200'
                    }`}>
                      <Coins className={`h-3 w-3 mr-1 ${
                        userCoins.coins < 2 
                          ? 'text-red-300' 
                          : 'text-yellow-300'
                      }`} />
                      2
                    </span>
                  </Button>
                )}

                {selectedServiceRequest.status === "accepted" && (
                  <Button 
                    onClick={() => {
                      // Open review modal for the client
                      setReviewData({
                        jobId: selectedServiceRequest.serviceId || "",
                        revieweeId: selectedServiceRequest.userId,
                        revieweeName: selectedServiceRequest.user?.name || "Client",
                        reviewType: "worker_to_client",
                        jobTitle: `Service Request`
                      });
                      setReviewModalOpen(true);
                      handleCloseServiceRequestModal();
                    }}
                    className="w-full sm:flex-1 bg-yellow-600 hover:bg-yellow-700"
                  >
                    <Star className="h-4 w-4 mr-2" />
                    Complete Job & Rate Client
                  </Button>
                )}
                
                <Button 
                  variant="outline"
                  onClick={handleCloseServiceRequestModal}
                  className="w-full sm:flex-1"
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
