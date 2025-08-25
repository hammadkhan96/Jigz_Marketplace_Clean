import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Clock, Users, Star, ArrowLeft, DollarSign, Calendar, User, ExternalLink, Flag, CheckCircle } from "lucide-react";
import ApplicationModal from "@/components/application-modal";
import { ReportJobModal } from "@/components/report-job-modal";
import { RatingDisplay } from "@/components/rating-display";
import { TopBiddersSection } from "@/components/top-bidders-section";
import { useState } from "react";
import { format } from "date-fns";
import type { JobWithApplications, UserWithStats, User as UserType } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Helmet } from "react-helmet-async";
import { useToast } from "@/hooks/use-toast";

export default function JobDetailsPage() {
  const { jobId } = useParams();
  const [showApplicationModal, setShowApplicationModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch job details
  const { data: job, isLoading } = useQuery<JobWithApplications>({
    queryKey: ["/api/jobs", jobId],
    enabled: !!jobId,
  });

  // Fetch job poster details
  const { data: posterStats } = useQuery<UserWithStats>({
    queryKey: ["/api/user/stats", job?.userId],
    enabled: !!job?.userId,
  });

  // Fetch job poster profile
  const { data: posterProfile } = useQuery<UserType>({
    queryKey: ["/api/user/profile", job?.userId],
    enabled: !!job?.userId,
  });

  // Check if user has already reported this job
  const { data: reportCheck } = useQuery<{ hasReported: boolean }>({
    queryKey: ["/api/jobs", jobId, "reports", "check"],
    enabled: !!jobId && !!user?.id && user.id !== job?.userId,
  });

  // Check if user has already applied to this job
  const { data: applicationStatus } = useQuery<{ hasApplied: boolean }>({
    queryKey: ["/api/jobs", jobId, "application-status"],
    enabled: !!jobId && !!user?.id && user.id !== job?.userId,
  });

  // Extend job mutation
  const extendJobMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/jobs/${jobId}/extend`);
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to extend job");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/jobs", jobId] });
      queryClient.invalidateQueries({ queryKey: ["/api/user/coins"] });
      toast({
        title: "Job Extended",
        description: "Your job has been extended for another 30 days. 2 coins have been deducted.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Extension Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Generate SEO meta tags
  const generateSeoTitle = (title: string) => {
    return title.length > 100 ? title.substring(0, 100) : title;
  };

  const generateSeoDescription = (description: string) => {
    return description.length > 160 ? description.substring(0, 160) : description;
  };

  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-2/3 mb-4"></div>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Job Not Found</h2>
            <p className="text-gray-600 mb-4">This job posting doesn't exist or has been removed.</p>
            <Link href="/">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Jobs
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$"
    };
    const symbol = currencySymbols[currency] || currency;
    return `${amount.toLocaleString()} ${symbol}`;
  };

  const budgetText = (() => {
    const isHourly = job.budgetType === "hourly";
    const suffix = isHourly ? "/hr" : "";
    
    if (job.minBudget && job.maxBudget) {
      return `${formatCurrency(job.minBudget, job.currency || 'USD')} - ${formatCurrency(job.maxBudget, job.currency || 'USD')}${suffix}`;
    } else if (job.maxBudget) {
      return `Up to ${formatCurrency(job.maxBudget, job.currency || 'USD')}${suffix}`;
    } else {
      return isHourly ? "Rate negotiable" : "Budget negotiable";
    }
  })();

  const getStatusColor = (status: string) => {
    switch (status) {
      case "open":
        return "bg-green-100 text-green-800";
      case "in_progress":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getExperienceLevelColor = (level: string) => {
    switch (level) {
      case "beginner":
        return "bg-green-100 text-green-800";
      case "intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "expert":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <>
      <Helmet>
        <title>{generateSeoTitle(job.title)}</title>
        <meta name="description" content={generateSeoDescription(job.description)} />
        <meta property="og:title" content={generateSeoTitle(job.title)} />
        <meta property="og:description" content={generateSeoDescription(job.description)} />
        <meta property="og:type" content="article" />
        <meta property="og:url" content={`${window.location.origin}/job/${jobId}`} />
        {job.images && job.images[0] && (
          <meta property="og:image" content={job.images[0]} />
        )}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={generateSeoTitle(job.title)} />
        <meta name="twitter:description" content={generateSeoDescription(job.description)} />
        {job.images && job.images[0] && (
          <meta name="twitter:image" content={job.images[0]} />
        )}
        <link rel="canonical" href={`${window.location.origin}/job/${jobId}`} />
      </Helmet>
      
      <div className="container mx-auto p-6 max-w-4xl">
        {/* Back Navigation */}
        <div className="mb-6">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Jobs
            </Button>
          </Link>
        </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Job Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
                    {job.title}
                  </CardTitle>
                  <div className="flex items-center gap-4 text-gray-600">
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>{job.location}</span>
                    </div>
                    <div className="flex items-center">
                      <Clock className="h-4 w-4 mr-1" />
                      <span>Posted {job.createdAt ? format(new Date(job.createdAt), 'MMM d, yyyy') : 'Recently'}</span>
                    </div>
                  </div>
                </div>
                <Badge className={getStatusColor(job.status)}>
                  {job.status === "open" ? "Open" : job.status === "in_progress" ? "Closed" : "Completed"}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                  <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                    {job.description}
                  </p>
                  {(job.specificArea || job.duration) && (
                    <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                      {job.specificArea && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span className="font-medium">Specific Location:</span>
                          <span className="ml-2">{job.specificArea}</span>
                        </div>
                      )}
                      {job.duration && (
                        <div className="flex items-center text-gray-600">
                          <Clock className="h-4 w-4 mr-2" />
                          <span className="font-medium">Estimated Time:</span>
                          <span className="ml-2">
                            {job.duration === "custom" ? job.customDuration : job.duration}
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Project Images */}
                {job.images && job.images.length > 0 && (
                  <div>
                    <h3 className="font-semibold text-gray-900 mb-3">Project Images</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {job.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`Project image ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg border border-gray-200 hover:shadow-md transition-shadow cursor-pointer"
                          onClick={() => window.open(image, '_blank')}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <Separator />

                {/* Job Details Grid */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Budget</h4>
                    <div className="flex items-center text-gray-700">
                      <DollarSign className="h-4 w-4 mr-1" />
                      <span>{budgetText}</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Experience Level</h4>
                    <Badge variant="secondary" className={getExperienceLevelColor(job.experienceLevel || 'any')}>
                      {job.experienceLevel ? job.experienceLevel.charAt(0).toUpperCase() + job.experienceLevel.slice(1) : 'Any'}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Category</h4>
                    <Badge variant="outline">
                      {job.category}
                    </Badge>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Applicants</h4>
                    <div className="flex items-center text-gray-700">
                      <Users className="h-4 w-4 mr-1" />
                      <span>{job.applicationCount} applications</span>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium text-gray-900 mb-1">Freelancers Needed</h4>
                    <div className="flex items-center text-gray-700">
                      <User className="h-4 w-4 mr-1" />
                      <span>{job.freelancersNeeded || 1} freelancer{(job.freelancersNeeded || 1) > 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  {/* Only show expiry to job owners */}
                  {user?.id === job.userId && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-1">Expires</h4>
                      <div className="flex items-center text-gray-700">
                        <Calendar className="h-4 w-4 mr-1" />
                        <span>{job.expiresAt ? format(new Date(job.expiresAt), 'MMM d, yyyy') : 'No expiry'}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Top Bidders Section */}
          <TopBiddersSection jobId={jobId!} />
        </div>

        {/* Sidebar - Client Info & Apply */}
        <div className="space-y-6">
          {/* Apply Card / Job Management Card */}
          <Card>
            <CardHeader>
              <CardTitle>
                {user?.id === job.userId ? "Manage Job" : "Apply for this Job"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-gray-900">{budgetText}</div>
                  <div className="text-sm text-gray-600">Project Budget</div>
                </div>
                
                {/* Job Owner Actions */}
                {user?.id === job.userId ? (
                  <div className="space-y-3">
                    {/* Show expiry info for job owners */}
                    <div className="text-center p-3 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-600 mb-1">Job expires on</div>
                      <div className="font-medium text-gray-900">
                        {job.expiresAt ? format(new Date(job.expiresAt), 'MMM d, yyyy') : 'No expiry set'}
                      </div>
                    </div>
                    
                    {/* Extend button */}
                    <Button
                      className="w-full bg-blue-600 text-white hover:bg-blue-700 flex items-center justify-center px-6 py-3 text-sm font-medium"
                      onClick={() => extendJobMutation.mutate()}
                      disabled={extendJobMutation.isPending}
                    >
                      {extendJobMutation.isPending ? "Extending..." : "Extend for 30 Days (2 coins)"}
                    </Button>
                    
                    <div className="text-xs text-gray-500 text-center">
                      Extend your job posting for another 30 days to get more applications
                    </div>
                  </div>
                ) : (
                  /* Regular user apply actions */
                  <>
                    <Button
                      className={`w-full ${
                        !user
                          ? "bg-gray-500 text-white hover:bg-gray-600"
                          : applicationStatus?.hasApplied 
                            ? "bg-green-600 text-white hover:bg-green-700" 
                            : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      onClick={() => {
                        if (!user) {
                          window.location.href = '/login';
                        } else {
                          setShowApplicationModal(true);
                        }
                      }}
                      disabled={job.status !== "open" || (user && (applicationStatus?.hasApplied === true)) || false}
                    >
                      {!user ? (
                        "Log in to Apply"
                      ) : applicationStatus?.hasApplied ? (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Already Applied
                        </>
                      ) : job.status === "open" ? (
                        "Apply Now"
                      ) : (
                        "Applications Closed"
                      )}
                    </Button>
                    
                    {/* Report Button - Only show if user is authenticated and not the job owner */}
                    {user && (
                      <Button
                        variant="outline"
                        className="w-full text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
                        onClick={() => setShowReportModal(true)}
                        disabled={reportCheck?.hasReported}
                      >
                        <Flag className="h-4 w-4 mr-2" />
                        {reportCheck?.hasReported ? "Already Reported" : "Report Job"}
                      </Button>
                    )}
                    
                    <div className="text-xs text-gray-500 text-center">
                      {!user 
                        ? "Please log in to submit an application for this job"
                        : applicationStatus?.hasApplied 
                          ? "You have already submitted an application for this job"
                          : job.status === "open" 
                            ? "Submit your proposal to get started" 
                            : "This job is no longer accepting applications"
                      }
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Client Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <User className="h-5 w-5 mr-2" />
                About the Client
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Profile Picture and Basic Info */}
                <div className="text-center">
                  <div className="flex justify-center mb-3">
                    <Avatar className="h-16 w-16">
                      <AvatarImage 
                        src={posterProfile?.profileImageUrl || undefined} 
                        alt={posterProfile?.name || 'Client'} 
                      />
                      <AvatarFallback className="bg-blue-100 text-blue-600 text-lg font-semibold">
                        {(posterProfile?.name || posterProfile?.username || 'C').charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-lg font-semibold text-gray-900">
                      {posterProfile?.name || 'Anonymous Client'}
                    </span>
                    {posterProfile?.isEmailVerified && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-3">
                    @{posterProfile?.username || 'client'}
                  </div>
                  {/* See Profile Button */}
                  <Link href={`/profile/${job?.userId || posterProfile?.id}`}>
                    <Button variant="outline" size="sm">
                      <ExternalLink className="h-4 w-4 mr-2" />
                      See Profile
                    </Button>
                  </Link>
                </div>

                {posterStats && (
                  <>
                    <Separator />
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Average Rating</span>
                        <div className="flex items-center">
                          {posterStats.averageRating > 0 ? (
                            <RatingDisplay 
                              rating={posterStats.averageRating} 
                              totalReviews={posterStats.totalReviews}
                              size="sm"
                            />
                          ) : (
                            <span className="text-sm text-gray-500">No ratings yet</span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Total Reviews</span>
                        <span className="text-sm font-medium">{posterStats.totalReviews}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jobs Posted</span>
                        <span className="text-sm font-medium">{posterStats.totalJobsPosted}</span>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600">Jobs Completed</span>
                        <span className="text-sm font-medium">{posterStats.completedJobs}</span>
                      </div>
                    </div>
                  </>
                )}

                <Separator />
                
                <div className="text-center">
                  <div className="text-sm text-gray-600">
                    Member since {posterStats?.joinedDate ? format(new Date(posterStats.joinedDate), 'MMMM yyyy') : 'Recently'}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Application Modal */}
      {showApplicationModal && (
        <ApplicationModal
          isOpen={showApplicationModal}
          onClose={() => setShowApplicationModal(false)}
          job={job}
        />
      )}

      {/* Report Modal */}
      <ReportJobModal
        isOpen={showReportModal}
        onClose={() => setShowReportModal(false)}
        jobId={job.id}
        jobTitle={job.title}
      />
      </div>
    </>
  );
}