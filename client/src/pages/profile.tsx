import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, Link } from "wouter";
import { Star, MapPin, Clock, DollarSign, User, Edit2, Camera, Mail, Calendar, Award, Briefcase, TrendingUp, Users, ChevronDown, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { getCurrencySymbol } from "@shared/currencies";
import { SubscriptionBadge } from "@/components/ui-components/subscription-badge";
import type { User as UserType, JobWithApplications, ApplicationWithJob, Service, ServiceWithRequests } from "@shared/schema";

interface UserStats {
  totalJobsPosted: number;
  totalApplicationsSubmitted: number;
  jobsCompleted: number;
  averageRating: number;
  totalReviews: number;
  joinedDate: string;
  successRate: number;
}

interface ReviewWithJob {
  id: string;
  rating: number;
  comment: string;
  reviewType: "client_to_worker" | "worker_to_client";
  createdAt: string;
  reviewer: {
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  job: {
    title: string;
    category: string;
  };
}

interface SkillEndorsement {
  id: string;
  skill: string;
  message?: string;
  createdAt: string;
  endorser: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
  job: {
    title: string;
    category: string;
  };
}

interface CompletedService {
  id: string;
  completedAt: string;
  service: Service;
  client?: {
    id: string;
    name: string;
    username: string;
    profileImageUrl?: string;
  };
}



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

export default function Profile({ params }: { params?: { userId?: string } }) {
  const [location] = useLocation();
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ name: "", email: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState("completed-jobs");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuth();

  // Get user ID from URL params, query params, or use current user
  const urlParams = new URLSearchParams(location.split('?')[1] || '');
  const profileUserId = params?.userId || urlParams.get('user') || currentUser?.id;
  const isOwnProfile = profileUserId === currentUser?.id;

  // Fetch user profile data
  const { data: user, isLoading: userLoading, error: userError } = useQuery<UserType>({
    queryKey: ["/api/user/profile", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/profile/${profileUserId}`);
      if (!response.ok) {
        throw new Error("User not found");
      }
      return response.json();
    },
    enabled: !!profileUserId,
    retry: false,
  });

  // Fetch user statistics
  const { data: stats, isLoading: statsLoading } = useQuery<UserStats>({
    queryKey: ["/api/user/stats", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/stats/${profileUserId}`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch user's completed jobs (for workers)
  const { data: completedJobs = [], isLoading: jobsLoading } = useQuery<ApplicationWithJob[]>({
    queryKey: ["/api/user/completed-jobs", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/completed-jobs/${profileUserId}`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch user's posted jobs (for job posters)
  const { data: postedJobs = [], isLoading: postedJobsLoading } = useQuery<JobWithApplications[]>({
    queryKey: ["/api/user/posted-jobs", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/posted-jobs/${profileUserId}`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch user reviews
  const { data: reviews = [], isLoading: reviewsLoading } = useQuery<ReviewWithJob[]>({
    queryKey: ["/api/user/reviews", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/reviews/${profileUserId}`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch skill endorsements
  const { data: skillEndorsements = [], isLoading: endorsementsLoading } = useQuery<SkillEndorsement[]>({
    queryKey: [`/api/users/${profileUserId}/skill-endorsements`],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/users/${profileUserId}/skill-endorsements`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch user's services
  const { data: userServices = [], isLoading: servicesLoading } = useQuery<ServiceWithRequests[]>({
    queryKey: ["/api/user/services", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/services/${profileUserId}`);
      return response.json();
    },
    enabled: !!profileUserId,
  });

  // Fetch user's completed services (for service providers)
  const { data: completedServices = [], isLoading: completedServicesLoading, refetch: refetchCompletedServices } = useQuery<CompletedService[]>({
    queryKey: ["/api/user/completed-services", profileUserId],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/user/completed-services/${profileUserId}`);
      const data = await response.json();

      return data;
    },
    enabled: !!profileUserId,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  // Profile update mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (formData: FormData) => {
      const response = await fetch("/api/user/profile", {
        method: "PATCH",
        body: formData,
        credentials: "include",
      });
      if (!response.ok) throw new Error("Failed to update profile");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/user/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setIsEditingProfile(false);
      setSelectedFile(null);
      setPreviewUrl(null);
      toast({
        title: "Success",
        description: "Profile updated successfully!",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update profile. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Email verification mutation
  const resendVerificationMutation = useMutation({
    mutationFn: async () => {
      if (!user?.email) throw new Error("No email found");
      const response = await apiRequest("POST", "/api/auth/resend-verification", {
        email: user.email
      });
      if (!response.ok) throw new Error("Failed to resend verification email");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Verification Email Sent",
        description: "Please check your email for the verification link.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to send verification email. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "Error",
          description: "File size must be less than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setSelectedFile(file);
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
    }
  };

  const handleSubmitProfile = () => {
    const formData = new FormData();
    formData.append("name", profileForm.name);
    formData.append("email", profileForm.email);
    if (selectedFile) {
      formData.append("profileImage", selectedFile);
    }
    updateProfileMutation.mutate(formData);
  };

  const openEditProfile = () => {
    if (user) {
      setProfileForm({ name: user.name, email: user.email });
    }
    setIsEditingProfile(true);
  };

  const handleResendVerification = () => {
    resendVerificationMutation.mutate();
  };

  if (userLoading || statsLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="flex items-center space-x-6">
            <div className="w-24 h-24 bg-gray-200 rounded-full"></div>
            <div className="space-y-2">
              <div className="h-6 bg-gray-200 rounded w-40"></div>
              <div className="h-4 bg-gray-200 rounded w-32"></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (userError || (!userLoading && !user)) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">User not found</h3>
            <p className="text-gray-600">The profile you're looking for doesn't exist.</p>
            <p className="text-sm text-gray-500 mt-2">User ID: {profileUserId}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Profile Header */}
      <Card className="mb-8">
        <CardContent className="p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-6">
            <div className="relative">
              <Avatar className="w-24 h-24">
                <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.name} />
                <AvatarFallback className="text-2xl font-bold">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              {isOwnProfile && (
                <Button
                  size="sm"
                  variant="outline"
                  className="absolute -bottom-2 -right-2 rounded-full w-8 h-8 p-0"
                  onClick={openEditProfile}
                >
                  <Camera className="h-4 w-4" />
                </Button>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{user?.name}</h1>
                  <div className="flex flex-col sm:flex-row sm:items-center text-gray-600 space-y-2 sm:space-y-0 sm:space-x-4">
                    <div className="flex items-center">
                      <User className="h-4 w-4 mr-1" />
                      <span>@{user?.username}</span>
                    </div>

                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-1" />
                      <span>Joined {user?.createdAt ? formatTimeAgo(user.createdAt) : 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex flex-col space-y-2 mt-4 md:mt-0">
                  <div className="flex flex-wrap gap-2">
                    {user?.isEmailVerified && (
                      <Badge variant="secondary" className="text-xs bg-green-100 text-green-800 border-green-200">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Verified
                      </Badge>
                    )}
                    {user?.id && <SubscriptionBadge userId={user.id} size="sm" />}
                  </div>
                  {isOwnProfile && (
                    <>
                      {!user?.isEmailVerified && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={handleResendVerification}
                          className="text-xs"
                        >
                          Verify Email
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        onClick={openEditProfile}
                      >
                        <Edit2 className="h-4 w-4 mr-2" />
                        Edit Profile
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      <div className="space-y-4 mb-8">
        {/* First Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Jobs Posted</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats?.totalJobsPosted || 0}</p>
                </div>
                <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Services Posted</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{userServices.length || 0}</p>
                </div>
                <Briefcase className="h-6 w-6 md:h-8 md:w-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Applications</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{stats?.totalApplicationsSubmitted || 0}</p>
                </div>
                <TrendingUp className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Jobs Completed</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {jobsLoading ? "..." : (Array.isArray(completedJobs) ? completedJobs.length : 0)}
                  </p>
                </div>
                <Award className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Services Completed</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">
                    {completedServicesLoading ? "..." : (Array.isArray(completedServices) ? completedServices.length : 0)}
                  </p>
                </div>
                <Award className="h-6 w-6 md:h-8 md:w-8 text-emerald-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Skill Endorsements</p>
                  <p className="text-xl md:text-2xl font-bold text-gray-900">{skillEndorsements.length || 0}</p>
                </div>
                <Star className="h-6 w-6 md:h-8 md:w-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs md:text-sm text-gray-600">Average Rating</p>
                  <div className="flex items-center space-x-1">
                    <p className="text-xl md:text-2xl font-bold text-gray-900">
                      {stats?.averageRating ? stats.averageRating.toFixed(1) : "N/A"}
                    </p>
                    <Star className="h-4 w-4 md:h-5 md:w-5 text-yellow-500 fill-current" />
                  </div>
                </div>
                <div className="text-xs md:text-sm text-gray-500 mt-1 md:mt-0">
                  ({stats?.totalReviews || 0} reviews)
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Tabs Section */}
      <Tabs value={currentTab} onValueChange={setCurrentTab} className="w-full">
        {/* Dropdown Menu for All Screens */}
        <div className="mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="w-full justify-between">
                {(() => {
                  switch (currentTab) {
                    case "completed-jobs":
                      return `Completed Jobs (${completedJobs.length})`;
                    case "completed-services":
                      return `Services Completed (${completedServices.length})`;
                    case "posted-jobs":
                      return `Jobs Posted (${postedJobs.length})`;
                    case "services":
                      return `Services (${userServices.length})`;
                    case "reviews":
                      return `Reviews (${reviews.length})`;
                    case "endorsements":
                      return `Skill Endorsements (${skillEndorsements.length})`;
                    default:
                      return "Select Tab";
                  }
                })()}
                <ChevronDown className="h-4 w-4 ml-2" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-full">
              <DropdownMenuItem onClick={() => setCurrentTab("completed-jobs")}>
                Completed Jobs ({completedJobs.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("completed-services")}>
                Services Completed ({completedServices.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("posted-jobs")}>
                Jobs Posted ({postedJobs.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("services")}>
                Services ({userServices.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("reviews")}>
                Reviews ({reviews.length})
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setCurrentTab("endorsements")}>
                Skill Endorsements ({skillEndorsements.length})
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Completed Jobs Tab */}
        <TabsContent value="completed-jobs" className="space-y-6">
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
          ) : completedJobs.length > 0 ? (
            completedJobs.map((application) => (
              <Card key={application.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">{application.job?.title || "Untitled Job"}</h3>
                        <Badge className="bg-green-100 text-green-800 border-0 whitespace-nowrap">
                          Completed
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Completed {formatTimeAgo(application.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{application.job?.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Earned: ${application.bidAmount}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{application.job?.description || "No description available"}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed jobs</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? "Complete jobs to build your reputation." : "This user hasn't completed any jobs yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services Completed Tab */}
        <TabsContent value="completed-services" className="space-y-6">
          {completedServicesLoading ? (
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
          ) : completedServices.length > 0 ? (
            completedServices.map((completedService) => (
              <Card key={completedService.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">{completedService.service?.title || "Untitled Service"}</h3>
                        <Badge className="bg-green-100 text-green-800 border-0 whitespace-nowrap">
                          Service Completed
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Completed {formatTimeAgo(completedService.completedAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{completedService.service?.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>
                            Earned: {completedService.service?.priceType === 'per_project' 
                              ? completedService.service?.priceTo 
                                ? `${getCurrencySymbol(completedService.service?.currency)}${completedService.service?.priceFrom}-${completedService.service?.priceTo}` 
                                : `${getCurrencySymbol(completedService.service?.currency)}${completedService.service?.priceFrom}`
                              : `${getCurrencySymbol(completedService.service?.currency)}${completedService.service?.priceFrom}/hr`
                            }
                          </span>
                        </div>
                        {completedService.client && (
                          <div className="flex items-center">
                            <User className="h-4 w-4 mr-1" />
                            <span>Client: {completedService.client.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="text-sm text-gray-600">
                    <Badge variant="outline" className="text-xs">
                      {completedService.service?.category || "No category"}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services completed</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? "Complete service requests to build your service provider reputation." : "This user hasn't completed any services yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Posted Jobs Tab */}
        <TabsContent value="posted-jobs" className="space-y-6">
          {postedJobsLoading ? (
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
          ) : postedJobs.length > 0 ? (
            postedJobs.map((job) => (
              <Card key={job.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">{job?.title || "Untitled Job"}</h3>
                        <div className="flex flex-col items-end space-y-2 md:hidden">
                          <Badge className={`${
                            job.status === 'open' 
                              ? 'bg-green-100 text-green-800' 
                              : job.status === 'in_progress'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-gray-100 text-gray-800'
                          } border-0 whitespace-nowrap`}>
                            {job.status === 'open' ? 'Open' : job.status === 'in_progress' ? 'In Progress' : 'Closed'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {job?.category || "No category"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Posted {formatTimeAgo(job.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{job?.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>Budget: {job?.minBudget ? `$${job.minBudget} - ` : ""}${job?.maxBudget || "N/A"} {job?.currency || ""}</span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{job?.applications?.length || 0} applications</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end space-y-2">
                      <Badge className={`${
                        job.status === 'open' 
                          ? 'bg-green-100 text-green-800' 
                          : job.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      } border-0`}>
                        {job.status === 'open' ? 'Open' : job.status === 'in_progress' ? 'In Progress' : 'Closed'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {job?.category || "No category"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm">{job?.description || "No description available"}</p>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No jobs posted</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? "Start by posting your first job to find skilled freelancers." : "This user hasn't posted any jobs yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Services Tab */}
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
                <CardContent className="p-4 md:p-6">
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 flex-1 pr-2">
                          <Link href={`/service/${service.id}`} className="hover:text-blue-600 transition-colors">
                            {service?.title || "Untitled Service"}
                          </Link>
                        </h3>
                        <div className="flex flex-col items-end space-y-2 md:hidden">
                          <Badge className={`${
                            service.approvalStatus === 'approved' 
                              ? 'bg-green-100 text-green-800' 
                              : service.approvalStatus === 'pending'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          } border-0 whitespace-nowrap`}>
                            {service.approvalStatus === 'approved' ? 'Active' : 
                             service.approvalStatus === 'pending' ? 'Pending Approval' : 'Rejected'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {service?.category || "No category"}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center text-sm text-gray-600 space-y-2 sm:space-y-0 sm:space-x-4">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          <span>Posted {formatTimeAgo(service.createdAt)}</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1" />
                          <span>{service?.location || "Location not specified"}</span>
                        </div>
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-1" />
                          <span>
                            {service?.priceType === 'per_project' 
                              ? service?.priceTo 
                                ? `${getCurrencySymbol(service?.currency)}${service?.priceFrom}-${service?.priceTo}` 
                                : `${getCurrencySymbol(service?.currency)}${service?.priceFrom}`
                              : `${getCurrencySymbol(service?.currency)}${service?.priceFrom}/hr`
                            }
                          </span>
                        </div>
                        <div className="flex items-center">
                          <Users className="h-4 w-4 mr-1" />
                          <span>{service?.requestCount || 0} requests</span>
                        </div>
                      </div>
                    </div>
                    <div className="hidden md:flex flex-col items-end space-y-2">
                      <Badge className={`${
                        service.approvalStatus === 'approved' 
                          ? 'bg-green-100 text-green-800' 
                          : service.approvalStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-red-100 text-red-800'
                      } border-0`}>
                        {service.approvalStatus === 'approved' ? 'Active' : 
                         service.approvalStatus === 'pending' ? 'Pending Approval' : 'Rejected'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {service?.category || "No category"}
                      </Badge>
                    </div>
                  </div>
                  <p className="text-gray-600 text-sm line-clamp-3">{service?.description || "No description available"}</p>
                  
                  {service?.images && service.images.length > 0 && (
                    <div className="flex gap-2 mt-3 overflow-x-auto">
                      {service.images.slice(0, 3).map((imagePath: string, index: number) => (
                        <div key={index} className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg overflow-hidden">
                          <img 
                            src={imagePath} 
                            alt={`Service ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                      ))}
                      {service.images.length > 3 && (
                        <div className="flex-shrink-0 w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                          <span className="text-xs text-gray-600">+{service.images.length - 3}</span>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No services posted</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? "Start by posting your first service to offer your skills to others." : "This user hasn't posted any services yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Reviews Tab */}
        <TabsContent value="reviews" className="space-y-6">
          {reviewsLoading ? (
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
          ) : reviews.length > 0 ? (
            reviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-start space-x-4">
                    <Avatar className="hidden sm:block">
                      <AvatarImage src={review.reviewer.profileImageUrl || undefined} alt={review.reviewer.name} />
                      <AvatarFallback>
                        {review.reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-2">
                        <div className="flex items-center space-x-2 sm:space-x-0 sm:flex-col sm:items-start">
                          <Avatar className="w-8 h-8 sm:hidden">
                            <AvatarImage src={review.reviewer.profileImageUrl || undefined} alt={review.reviewer.name} />
                            <AvatarFallback className="text-xs">
                              {review.reviewer.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <h4 className="font-semibold text-gray-900">{review.reviewer.name}</h4>
                            <p className="text-sm text-gray-600">@{review.reviewer.username}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-1 mt-2 sm:mt-0">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`h-3 w-3 sm:h-4 sm:w-4 ${
                                i < review.rating ? "text-yellow-500 fill-current" : "text-gray-300"
                              }`}
                            />
                          ))}
                          <span className="text-xs sm:text-sm text-gray-600 ml-1">({review.rating}/5)</span>
                        </div>
                      </div>
                      <div className="mb-3">
                        <p className="text-sm font-medium text-gray-700">Job: {review.job?.title || "Untitled Job"}</p>
                        <Badge variant="secondary" className="text-xs mt-1">
                          {review.job?.category || "No category"}
                        </Badge>
                      </div>
                      
                      {/* Display detailed ratings for client-to-freelancer reviews */}
                      {review.reviewType === "client_to_worker" && 
                       (review as any).qualityOfWorkRating && 
                       (review as any).communicationRating && 
                       (review as any).timelinessRating && (
                        <div className="mb-3 p-3 bg-gray-50 rounded-lg">
                          <h5 className="text-xs font-semibold text-gray-700 mb-2">Detailed Ratings:</h5>
                          <div className="space-y-1">
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Quality of Work</span>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < ((review as any).qualityOfWorkRating || 0) ? "text-yellow-500 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-gray-600 ml-1">({(review as any).qualityOfWorkRating || 0}/5)</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Communication & Professionalism</span>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < ((review as any).communicationRating || 0) ? "text-yellow-500 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-gray-600 ml-1">({(review as any).communicationRating || 0}/5)</span>
                              </div>
                            </div>
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-gray-600">Timeliness & Reliability</span>
                              <div className="flex items-center space-x-1">
                                {[...Array(5)].map((_, i) => (
                                  <Star
                                    key={i}
                                    className={`h-3 w-3 ${
                                      i < ((review as any).timelinessRating || 0) ? "text-yellow-500 fill-current" : "text-gray-300"
                                    }`}
                                  />
                                ))}
                                <span className="text-xs text-gray-600 ml-1">({(review as any).timelinessRating || 0}/5)</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {review.comment && (
                        <p className="text-gray-700 mb-2 text-sm">{review.comment}</p>
                      )}
                      <p className="text-xs text-gray-500">{formatTimeAgo(review.createdAt)}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No reviews yet</h3>
                <p className="text-gray-600">
                  {isOwnProfile ? "Complete jobs to receive reviews." : "This user hasn't received any reviews yet."}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Skill Endorsements Tab */}
        <TabsContent value="endorsements" className="space-y-6">
          {endorsementsLoading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <div className="animate-pulse">
                      <div className="h-4 bg-gray-300 rounded w-1/3 mb-2"></div>
                      <div className="h-3 bg-gray-300 rounded w-1/2 mb-3"></div>
                      <div className="h-3 bg-gray-300 rounded w-full"></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : skillEndorsements.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="font-medium text-gray-900 mb-2">No Skill Endorsements Yet</h3>
                <p className="text-gray-600">
                  {isOwnProfile 
                    ? "You haven't received any skill endorsements yet. Complete jobs to earn endorsements from clients!" 
                    : `${user?.name || user?.username} hasn't received any skill endorsements yet.`
                  }
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {skillEndorsements.map((endorsement) => (
                <Card key={endorsement.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start space-x-4">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={endorsement.endorser.profileImageUrl} />
                        <AvatarFallback>
                          {endorsement.endorser.name?.charAt(0) || endorsement.endorser.username.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <Badge variant="secondary" className="mb-2">
                              {endorsement.skill}
                            </Badge>
                            <p className="font-medium text-gray-900">
                              Endorsed by {endorsement.endorser.name || endorsement.endorser.username}
                            </p>
                          </div>
                          <span className="text-sm text-gray-500">
                            {formatTimeAgo(endorsement.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">
                          For work on: <strong>{endorsement.job?.title || "Untitled Job"}</strong>
                        </p>
                        {endorsement.message && (
                          <p className="text-gray-700 italic">"{endorsement.message}"</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Edit Profile Modal */}
      <Dialog open={isEditingProfile} onOpenChange={setIsEditingProfile}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your profile information and photo.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Profile Picture Upload */}
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="w-20 h-20">
                <AvatarImage src={previewUrl || user?.profileImageUrl || undefined} alt={user?.name} />
                <AvatarFallback className="text-lg font-bold">
                  {user?.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div>
                <Label htmlFor="profile-image" className="cursor-pointer">
                  <Button variant="outline" size="sm" asChild>
                    <span>
                      <Camera className="h-4 w-4 mr-2" />
                      Change Photo
                    </span>
                  </Button>
                </Label>
                <Input
                  id="profile-image"
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>
            </div>

            {/* Form Fields */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter your full name"
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profileForm.email}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, email: e.target.value }))}
                  placeholder="Enter your email"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-3 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditingProfile(false);
                  setSelectedFile(null);
                  setPreviewUrl(null);
                }}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitProfile}
                disabled={updateProfileMutation.isPending}
                className="flex-1"
              >
                {updateProfileMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}