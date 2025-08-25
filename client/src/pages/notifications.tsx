import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Bell, Check, Clock, User, Briefcase, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import type { Notification } from "@shared/schema";
import ReviewModal from "@/components/modals/review-modal";

interface ApplicationWithJob {
  id: string;
  jobId: string;
  status: string;
  job: {
    userId: string;
    userName?: string;
  };
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  const [reviewModal, setReviewModal] = useState<{
    isOpen: boolean;
    jobId: string;
    clientId: string;
    clientName: string;
  }>({
    isOpen: false,
    jobId: "",
    clientId: "",
    clientName: ""
  });

  // Fetch all notifications
  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ["/api/notifications"],
  });

  // Query to check if freelancer can rate clients for review notifications
  const { data: ratingEligibility = {} } = useQuery({
    queryKey: ["/api/reviews/rating-eligibility", notifications],
    queryFn: async () => {
      if (!user || !notifications.length) return {};
      
      const reviewNotifications = notifications.filter(n => n.type === "new_review");
      const eligibilityPromises = reviewNotifications.map(async (notification) => {
        // For review notifications, we need to extract the reviewer info from the message
        // This is a limitation as we don't store reviewer ID in notifications
        // We'll parse the message to get the reviewer name and look up jobs/applications
        const response = await apiRequest("GET", `/api/user/applications`);
        if (!response.ok) return { notificationId: notification.id, canRate: false, hasRated: false };
        
        const applications = await response.json();
        const relevantApp = applications.find((app: ApplicationWithJob) => 
          app.jobId === notification.jobId && app.status === "accepted"
        );
        
        if (!relevantApp) return { notificationId: notification.id, canRate: false, hasRated: false };
        
        const job = relevantApp.job;
        const clientId = job.userId;
        
        const ratingResponse = await apiRequest("GET", `/api/reviews/can-rate-client/${notification.jobId}/${clientId}`);
        if (!ratingResponse.ok) return { notificationId: notification.id, canRate: false, hasRated: false };
        
        const ratingData = await ratingResponse.json();
        return { 
          notificationId: notification.id, 
          jobId: notification.jobId,
          clientId,
          clientName: job.userName || "Client",
          ...ratingData 
        };
      });
      
      const results = await Promise.all(eligibilityPromises);
      return results.reduce((acc, result) => {
        acc[result.notificationId] = result;
        return acc;
      }, {} as Record<string, any>);
    },
    enabled: !!user && notifications.length > 0,
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await apiRequest("PATCH", `/api/notifications/${notificationId}/read`);
      if (!response.ok) {
        throw new Error("Failed to mark notification as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark notification as read",
        variant: "destructive",
      });
    },
  });

  // Mark all as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("PATCH", "/api/notifications/read-all");
      if (!response.ok) {
        throw new Error("Failed to mark all notifications as read");
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/notifications"] });
      queryClient.invalidateQueries({ queryKey: ["/api/notifications/unread-count"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to mark all notifications as read",
        variant: "destructive",
      });
    },
  });

  // Automatically mark all notifications as read when the page loads
  useEffect(() => {
    if (notifications && notifications.length > 0) {
      const hasUnread = notifications.some(notification => !notification.isRead);
      if (hasUnread) {
        markAllAsReadMutation.mutate();
      }
    }
  }, [notifications]);

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const handleRateClient = (jobId: string, clientId: string, clientName: string) => {
    setReviewModal({
      isOpen: true,
      jobId,
      clientId,
      clientName
    });
  };

  const handleCloseReviewModal = () => {
    setReviewModal({
      isOpen: false,
      jobId: "",
      clientId: "",
      clientName: ""
    });
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "application_accepted":
        return <Check className="h-5 w-5 text-green-600" />;
      case "new_application":
        return <User className="h-5 w-5 text-blue-600" />;
      case "job_completed":
        return <Briefcase className="h-5 w-5 text-purple-600" />;
      case "new_review":
        return <Star className="h-5 w-5 text-yellow-600" />;
      default:
        return <Bell className="h-5 w-5 text-gray-600" />;
    }
  };

  const getNotificationBgColor = (type: string, isRead: boolean | null) => {
    if (isRead) return "bg-white";
    
    switch (type) {
      case "application_accepted":
        return "bg-green-50 border-green-200";
      case "new_application":
        return "bg-blue-50 border-blue-200";
      case "job_completed":
        return "bg-purple-50 border-purple-200";
      case "new_review":
        return "bg-yellow-50 border-yellow-200";
      default:
        return "bg-gray-50 border-gray-200";
    }
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-200 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <Bell className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Notifications</h1>
            <p className="text-gray-600">
              {unreadCount > 0 ? `${unreadCount} unread notification${unreadCount !== 1 ? 's' : ''}` : 'All caught up!'}
            </p>
          </div>
        </div>
        
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllAsRead}
            disabled={markAllAsReadMutation.isPending}
            variant="outline"
          >
            <Check className="h-4 w-4 mr-2" />
            Mark All Read
          </Button>
        )}
      </div>

      {/* Notifications List */}
      {notifications.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Bell className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No notifications yet</h3>
            <p className="text-gray-600">
              You'll see notifications here when there's activity on your jobs or applications.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${getNotificationBgColor(notification.type, notification.isRead || false)} transition-colors hover:shadow-md`}
            >
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  {/* Icon */}
                  <div className="flex-shrink-0 mt-1">
                    {getNotificationIcon(notification.type)}
                  </div>
                  
                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {notification.title}
                      </h3>
                      {!notification.isRead && (
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          New
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-gray-700 mb-3">
                      {notification.message}
                    </p>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{format(new Date(notification.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Rate Client button for review notifications */}
                        {notification.type === "new_review" && 
                         ratingEligibility[notification.id]?.canRate && 
                         !ratingEligibility[notification.id]?.hasRated && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleRateClient(
                              ratingEligibility[notification.id].jobId,
                              ratingEligibility[notification.id].clientId,
                              ratingEligibility[notification.id].clientName
                            )}
                            className="text-yellow-600 border-yellow-600 hover:bg-yellow-50 hover:text-yellow-700"
                          >
                            <Star className="h-4 w-4 mr-2" />
                            Rate Client
                          </Button>
                        )}
                        
                        {/* Already rated indicator */}
                        {notification.type === "new_review" && 
                         ratingEligibility[notification.id]?.hasRated && (
                          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
                            Client Rated
                          </Badge>
                        )}
                        
                        {!notification.isRead && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkAsRead(notification.id)}
                            disabled={markAsReadMutation.isPending}
                            className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          >
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
      
      {/* Review Modal for Rating Clients */}
      <ReviewModal
        isOpen={reviewModal.isOpen}
        onClose={handleCloseReviewModal}
        jobId={reviewModal.jobId}
        revieweeId={reviewModal.clientId}
        revieweeName={reviewModal.clientName}
        reviewType="worker_to_client"
      />
    </div>
  );
}