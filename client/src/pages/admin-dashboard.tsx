import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, XCircle, Users, Shield, ShieldX, Clock, UserCheck, UserX, Key, BarChart3, Briefcase, User, Coins, Plus, Minus, Settings, Flag, Eye, MessageSquare, ChevronDown, Star, Trash2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/use-auth";
import { SubscriptionBadge } from "@/components/ui-components/subscription-badge";
import { SUBSCRIPTION_PLANS } from "@shared/schema";
import { getCurrencySymbol } from "@shared/currencies";
import type { Service, Job, User as SchemaUser } from "@shared/schema";
import type { ApiError } from "@/types/interfaces";

// Extended service type with user data for admin dashboard
interface ServiceWithUser extends Service {
  user: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
}

interface AdminStats {
  totalUsers: string;
  totalApprovedJobs: string;
  openJobs: string;
  closedJobs: string;
  totalApplications: string;
  totalSkillEndorsements: string;
  activeSubscriptions: string;
  subscriptionPercentage: string;
  monthlyRevenue: string;
  avgJobsPerUser: string;
  avgApplicationsPerUser: string;
  freelancerSubs: string;
  freelancerPercentage: string;
  professionalSubs: string;
  professionalPercentage: string;
  expertSubs: string;
  expertPercentage: string;
  eliteSubs: string;
  elitePercentage: string;
  totalServices: string;
  avgServicesPerUser: string;
  totalInquiries: string;
  totalCompletedServices: string;
}

interface JobData {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  experienceLevel: string;
  status: string;
  budgetType?: string;
  minBudget?: number;
  maxBudget?: number;
  currency: string;
  createdAt: string;
  applicationCount?: number;
  images?: string[];
}

interface UserData {
  id: string;
  name: string;
  username: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified?: boolean;
  coins?: number;
  lastCoinReset?: string;
}

interface JobReportData {
  id: string;
  jobId: string;
  reporterId: string;
  category: string;
  reason: string;
  status: string;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: string;
  createdAt: string;
  job: {
    id: string;
    title: string;
    category: string;
    userId: string;
  };
  reporter: {
    id: string;
    name: string;
    username: string;
    email: string;
  };
  reviewer?: {
    id: string;
    name: string;
    username: string;
  };
}

export default function AdminDashboard() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user, isAuthenticated, isLoading } = useAuth();
  const isAdmin = user?.role === "admin";
  const isModerator = user?.role === "moderator";
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [newPassword, setNewPassword] = useState<string>("");
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [coinDialogOpen, setCoinDialogOpen] = useState(false);
  const [coinAction, setCoinAction] = useState<"add" | "remove" | "set">("add");
  const [coinAmount, setCoinAmount] = useState<string>("");
  
  // Subscription management state
  const [subscriptionDialogOpen, setSubscriptionDialogOpen] = useState(false);
  const [selectedUserForSubscription, setSelectedUserForSubscription] = useState<UserData | null>(null);
  const [selectedPlanType, setSelectedPlanType] = useState("");

  // Fetch all users - only for admin users
  const { data: users = [], isLoading: usersLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users"],
    retry: false,
    enabled: isAdmin, // Only fetch for admin users
  });

  // Fetch pending jobs
  const { data: pendingJobs = [], isLoading: pendingJobsLoading } = useQuery<JobData[]>({
    queryKey: ["/api/admin/jobs/pending"],
    retry: false,
  });

  // Fetch pending services
  const { data: pendingServices = [], isLoading: pendingServicesLoading } = useQuery<ServiceWithUser[]>({
    queryKey: ["/api/admin/services/pending"],
    retry: false,
  });

  // Fetch approved services
  const { data: approvedServices = [], isLoading: approvedServicesLoading } = useQuery<ServiceWithUser[]>({
    queryKey: ["/api/admin/services/approved"],
    retry: false,
  });

  // Fetch approved jobs
  const { data: approvedJobs = [], isLoading: approvedJobsLoading } = useQuery<JobData[]>({
    queryKey: ["/api/admin/jobs/approved"],
    retry: false,
  });

  // Fetch admin statistics - only for admin users
  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    retry: false,
    enabled: isAdmin, // Only fetch for admin users
  });

  // Fetch users with coins for coin management - only for admin users
  const { data: usersWithCoins = [], isLoading: usersWithCoinsLoading } = useQuery<UserData[]>({
    queryKey: ["/api/admin/users/coins"],
    retry: false,
    enabled: isAdmin, // Only fetch for admin users
  });

  // Fetch pending job reports
  const { data: pendingReports = [], isLoading: reportsLoading } = useQuery<JobReportData[]>({
    queryKey: ["/api/admin/reports?status=pending"],
    queryFn: () => fetch("/api/admin/reports?status=pending").then(res => res.json()),
    retry: false,
  });

  // Fetch all job reports
  const { data: allReports = [] } = useQuery<JobReportData[]>({
    queryKey: ["/api/admin/reports"],
    retry: false,
  });

  // User ban/unban mutations
  const banUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/ban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User banned",
        description: "User has been banned successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to ban user.",
        variant: "destructive",
      });
    },
  });

  const unbanUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/unban`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User unbanned",
        description: "User has been unbanned successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to unban user.",
        variant: "destructive",
      });
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("DELETE", `/api/admin/users/${userId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User deleted",
        description: "User has been permanently deleted from the database.",
      });
    },
    onError: (error: Error | ApiError) => {
      if (isUnauthorizedError(error instanceof Error ? error : new Error(error.message))) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to delete user.",
        variant: "destructive",
      });
    },
  });

  // Job approval mutations
  const approveJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("PATCH", `/api/admin/jobs/${jobId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/pending"] });
      toast({
        title: "Job approved",
        description: "Job has been approved and is now visible to users.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve job.",
        variant: "destructive",
      });
    },
  });

  const rejectJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("PATCH", `/api/admin/jobs/${jobId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/pending"] });
      toast({
        title: "Job rejected",
        description: "Job has been rejected and won't be visible to users.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject job.",
        variant: "destructive",
      });
    },
  });

  // Service approval mutations
  const approveServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await apiRequest("PATCH", `/api/admin/services/${serviceId}/approve`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/pending"] });
      toast({
        title: "Service approved",
        description: "Service has been approved and is now visible to users.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to approve service.",
        variant: "destructive",
      });
    },
  });

  const rejectServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await apiRequest("PATCH", `/api/admin/services/${serviceId}/reject`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/pending"] });
      toast({
        title: "Service rejected",
        description: "Service has been rejected and won't be visible to users.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to reject service.",
        variant: "destructive",
      });
    },
  });

  // Service deletion mutation
  const deleteServiceMutation = useMutation({
    mutationFn: async (serviceId: string) => {
      await apiRequest("DELETE", `/api/admin/services/${serviceId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/pending"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/services/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Service deleted",
        description: "Service has been permanently deleted along with all related data.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete service.",
        variant: "destructive",
      });
    },
  });

  const deleteJobMutation = useMutation({
    mutationFn: async (jobId: string) => {
      await apiRequest("DELETE", `/api/admin/jobs/${jobId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/jobs/approved"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({
        title: "Job deleted",
        description: "Job has been permanently deleted along with all related data.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to delete job.",
        variant: "destructive",
      });
    },
  });

  // Job report mutations
  const reportActionMutation = useMutation({
    mutationFn: async ({ reportId, action, adminNotes }: { reportId: string, action: "approve" | "reject", adminNotes?: string }) => {
      await apiRequest("PATCH", `/api/admin/reports/${reportId}`, { status: action === "approve" ? "reviewed" : "dismissed", adminNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/reports?status=pending"] });
      toast({
        title: "Report reviewed",
        description: "Job report has been reviewed successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized", 
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to review report.",
        variant: "destructive",
      });
    },
  });

  // Coin management mutations
  const coinMutation = useMutation({
    mutationFn: async ({ userId, action, amount }: { userId: string; action: "add" | "remove" | "set"; amount: number }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/coins/${action}`, { amount });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users/coins"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setCoinDialogOpen(false);
      setCoinAmount("");
      toast({
        title: "Coins updated",
        description: "User coins have been updated successfully.",
      });
    },
    onError: (error: Error | ApiError) => {
      if (isUnauthorizedError(error instanceof Error ? error : new Error(error.message))) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: error.message || "Failed to update user coins.",
        variant: "destructive",
      });
    },
  });

  // User role mutations
  const promoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/promote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User promoted",
        description: "User has been promoted to admin successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to promote user.",
        variant: "destructive",
      });
    },
  });

  const demoteUserMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/demote`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User demoted",
        description: "User has been demoted from admin successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to demote user.",
        variant: "destructive",
      });
    },
  });

  const promoteToModeratorMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/promote-moderator`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User promoted",
        description: "User has been promoted to moderator successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to promote user to moderator.",
        variant: "destructive",
      });
    },
  });

  const demoteFromModeratorMutation = useMutation({
    mutationFn: async (userId: string) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/demote-moderator`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({
        title: "User demoted",
        description: "User has been demoted from moderator successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to demote user from moderator.",
        variant: "destructive",
      });
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async ({ userId, newPassword }: { userId: string; newPassword: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${userId}/change-password`, { newPassword });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setPasswordDialogOpen(false);
      setNewPassword("");
      setSelectedUserId("");
      toast({
        title: "Password changed",
        description: "User password has been changed successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to change password.",
        variant: "destructive",
      });
    },
  });

  // Subscription management mutation
  const subscriptionMutation = useMutation({
    mutationFn: async ({ userId, planType }: { userId: string; planType: string }) => {
      await apiRequest("POST", `/api/admin/users/${userId}/subscription`, { planType });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setSubscriptionDialogOpen(false);
      setSelectedUserForSubscription(null);
      setSelectedPlanType("");
      toast({
        title: "Subscription updated",
        description: "User subscription plan has been updated successfully.",
      });
    },
    onError: (error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update subscription.",
        variant: "destructive",
      });
    },
  });

  // Helper functions
  const handleCoinSubmit = () => {
    if (selectedUserId && coinAmount && parseInt(coinAmount) >= 0) {
      coinMutation.mutate({ 
        userId: selectedUserId, 
        action: coinAction, 
        amount: parseInt(coinAmount) 
      });
    }
  };

  const handleChangePassword = (userId: string) => {
    setSelectedUserId(userId);
    setPasswordDialogOpen(true);
  };

  const handlePasswordSubmit = () => {
    if (newPassword.length < 6) {
      toast({
        title: "Invalid password",
        description: "Password must be at least 6 characters long.",
        variant: "destructive",
      });
      return;
    }
    changePasswordMutation.mutate({ userId: selectedUserId, newPassword });
  };

  const openSubscriptionDialog = (user: UserData) => {
    setSelectedUserForSubscription(user);
    setSelectedPlanType("");
    setSubscriptionDialogOpen(true);
  };

  const handleSubscriptionSubmit = () => {
    if (selectedUserForSubscription && selectedPlanType) {
      subscriptionMutation.mutate({ 
        userId: selectedUserForSubscription.id, 
        planType: selectedPlanType 
      });
    }
  };

  const formatCurrency = (amount: number, currency: string) => {
    const currencySymbols: { [key: string]: string } = {
      USD: "$", EUR: "€", GBP: "£", JPY: "¥", CAD: "C$", AUD: "A$"
    };
    const symbol = currencySymbols[currency] || currency;
    return `${amount.toLocaleString()} ${symbol}`;
  };

  // Safe date formatting function
  const formatSafeDate = (date: string | Date | null | undefined): string => {
    if (!date) return "recently";
    try {
      return formatDistanceToNow(new Date(date));
    } catch {
      return "recently";
    }
  };

  const formatJobBudget = (job: JobData) => {
    const isHourly = job.budgetType === "hourly";
    const suffix = isHourly ? "/hr" : "";
    
    if (job.minBudget && job.maxBudget) {
      return `${formatCurrency(job.minBudget, job.currency)} - ${formatCurrency(job.maxBudget, job.currency)}${suffix}`;
    } else if (job.minBudget) {
      return `From ${formatCurrency(job.minBudget, job.currency)}${suffix}`;
    } else {
      return `Up to ${formatCurrency(job.maxBudget!, job.currency)}${suffix}`;
    }
  };

  // Redirect to login if not authenticated or not admin/moderator
  useEffect(() => {
    if (!isLoading && (!isAuthenticated || (user?.role !== "admin" && user?.role !== "moderator"))) {
      toast({
        title: "Unauthorized",
        description: "Admin or moderator access required. Redirecting to login...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, user, toast]);

  // Show loading while checking authentication
  if (isLoading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  // Show unauthorized if not admin or moderator
  if (!isAuthenticated || (user?.role !== "admin" && user?.role !== "moderator")) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600">Unauthorized</h1>
          <p>Admin or moderator access required.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          {isAdmin 
            ? "Manage users and approve job postings"
            : "Review and approve job postings, manage job reports"
          }
        </p>
      </div>

      {/* Statistics Cards - only show for admin users */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <User className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {statsLoading ? "..." : stats?.totalUsers || 0}
              </div>
            </CardContent>
          </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Job Posts</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {statsLoading ? "..." : stats?.totalApprovedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Approved posts only</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Open Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {statsLoading ? "..." : stats?.openJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Available for applications</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Closed Jobs</CardTitle>
            <CheckCircle className="h-4 w-4 text-gray-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-gray-600">
              {statsLoading ? "..." : stats?.closedJobs || 0}
            </div>
            <p className="text-xs text-muted-foreground">Completed or in progress</p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Services</CardTitle>
            <Star className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {statsLoading ? "..." : stats?.totalServices || "0"}
            </div>
            <p className="text-xs text-muted-foreground">Approved services only</p>
          </CardContent>
        </Card>
        </div>
      )}

      {/* Second row of stats for applications, endorsements, and subscriptions */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Applications</CardTitle>
              <Users className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {statsLoading ? "..." : stats?.totalApplications || 0}
              </div>
              <p className="text-xs text-muted-foreground">All job applications</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Skill Endorsements</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {statsLoading ? "..." : stats?.totalSkillEndorsements || 0}
              </div>
              <p className="text-xs text-muted-foreground">Total endorsements given</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-indigo-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-indigo-600">
                {statsLoading ? "..." : stats?.totalInquiries || "0"}
              </div>
              <p className="text-xs text-muted-foreground">All service inquiries</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Completed Services</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {statsLoading ? "..." : stats?.totalCompletedServices || "0"}
              </div>
              <p className="text-xs text-muted-foreground">Finished service requests</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Subscriptions</CardTitle>
              <Coins className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {statsLoading ? "..." : stats?.activeSubscriptions || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "Loading..." : `${stats?.subscriptionPercentage || "0.0"}% of total users`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Third row of stats for averages and revenue */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Jobs Per User</CardTitle>
              <Briefcase className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {statsLoading ? "..." : stats?.avgJobsPerUser || "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">Average job posts per user</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Applications Per User</CardTitle>
              <User className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">
                {statsLoading ? "..." : stats?.avgApplicationsPerUser || "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">Average applications per user</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Services Per User</CardTitle>
              <Star className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-teal-600">
                {statsLoading ? "..." : stats?.avgServicesPerUser || "0.0"}
              </div>
              <p className="text-xs text-muted-foreground">Average services per user</p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${statsLoading ? "..." : stats?.monthlyRevenue || "0.00"}
              </div>
              <p className="text-xs text-muted-foreground">From active subscriptions</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Fourth row of stats for subscription plan breakdown */}
      {isAdmin && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Freelancer Plans</CardTitle>
              <User className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-500">
                {statsLoading ? "..." : stats?.freelancerSubs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "Loading..." : `${stats?.freelancerPercentage || "0.0"}% of total users`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Professional Plans</CardTitle>
              <BarChart3 className="h-4 w-4 text-emerald-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-emerald-500">
                {statsLoading ? "..." : stats?.professionalSubs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "Loading..." : `${stats?.professionalPercentage || "0.0"}% of total users`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expert Plans</CardTitle>
              <Shield className="h-4 w-4 text-amber-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-amber-500">
                {statsLoading ? "..." : stats?.expertSubs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "Loading..." : `${stats?.expertPercentage || "0.0"}% of total users`}
              </p>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Elite Plans</CardTitle>
              <Star className="h-4 w-4 text-violet-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-violet-500">
                {statsLoading ? "..." : stats?.eliteSubs || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                {statsLoading ? "Loading..." : `${stats?.elitePercentage || "0.0"}% of total users`}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs defaultValue="jobs" className="space-y-6">
        <TabsList>
          <TabsTrigger value="jobs">Pending Jobs</TabsTrigger>
          <TabsTrigger value="services">Pending Services</TabsTrigger>
          <TabsTrigger value="approved">Approved Jobs</TabsTrigger>
          {isAdmin && <TabsTrigger value="users">User Management</TabsTrigger>}
          {isAdmin && <TabsTrigger value="coins">Coin Management</TabsTrigger>}
          <TabsTrigger value="reports">Job Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="jobs" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Pending Job Approvals
              </CardTitle>
              <CardDescription>
                Review and approve job postings before they become visible to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingJobsLoading ? (
                <div className="text-center py-4">Loading pending jobs...</div>
              ) : pendingJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending jobs to review
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingJobs.map((job: JobData) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Posted {formatSafeDate(job.createdAt)} ago
                          </p>
                          <p className="text-gray-600 mb-3">{job.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{job.category}</Badge>
                            <Badge variant="outline">{job.location}</Badge>
                            <Badge variant="outline">{job.experienceLevel}</Badge>
                          </div>
                          
                          {(job.minBudget || job.maxBudget) && (
                            <div className="text-sm font-medium mb-3">
                              Budget: {formatJobBudget(job)}
                            </div>
                          )}
                          
                          {/* Job Images */}
                          {job.images && job.images.length > 0 && (
                            <div className="mb-3">
                              <p className="text-sm font-medium mb-2">Attached Images ({job.images.length}):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {job.images.map((image: string, index: number) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={image}
                                      alt={`Job image ${index + 1}`}
                                      className="w-full h-20 object-cover rounded border hover:shadow-md transition-shadow cursor-pointer"
                                      onClick={() => window.open(image, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded cursor-pointer flex items-center justify-center">
                                      <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => approveJobMutation.mutate(job.id)}
                            disabled={approveJobMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectJobMutation.mutate(job.id)}
                            disabled={rejectJobMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="services" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Pending Service Approvals
              </CardTitle>
              <CardDescription>
                Review and approve service offerings before they become visible to users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {pendingServicesLoading ? (
                <div className="text-center py-4">Loading pending services...</div>
              ) : pendingServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending services to review
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingServices.map((service: ServiceWithUser) => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{service.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Posted {formatSafeDate(service.createdAt)} ago by {service.user?.name || service.user?.username}
                          </p>
                          <p className="text-gray-600 mb-3">{service.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{service.category}</Badge>
                            <Badge variant="outline">{service.location}</Badge>
                            <Badge variant="outline">{service.experienceLevel}</Badge>
                            <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                              Pending Review
                            </Badge>
                          </div>
                          
                          <div className="text-sm font-medium mb-2">
                            Price: {getCurrencySymbol(service.currency)}{service.priceFrom}
                            {service.priceTo && ` - ${getCurrencySymbol(service.currency)}${service.priceTo}`}
                            {service.priceType === "hourly" && "/hr"}
                            {service.priceType === "per_project" && "/project"}
                            {service.priceType === "per_day" && "/day"}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Delivery: {service.deliveryTime}
                            {service.duration && ` • Duration: ${service.duration}`}
                          </div>
                          
                          {/* Service Website */}
                          {service.website && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Website: <a 
                                href={service.website.startsWith('http') ? service.website : `https://${service.website}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {service.website}
                              </a>
                            </div>
                          )}
                          
                          {service.tags && service.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {service.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Service Images */}
                          {service.images && service.images.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Service Images ({service.images.length}):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {service.images.map((image: string, index: number) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={image}
                                      alt={`Service image ${index + 1}`}
                                      className="w-full h-20 object-cover rounded border hover:shadow-md transition-shadow cursor-pointer"
                                      onClick={() => window.open(image, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded cursor-pointer flex items-center justify-center">
                                      <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            onClick={() => approveServiceMutation.mutate(service.id)}
                            disabled={approveServiceMutation.isPending}
                            className="bg-green-600 hover:bg-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            variant="destructive"
                            onClick={() => rejectServiceMutation.mutate(service.id)}
                            disabled={rejectServiceMutation.isPending}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject
                          </Button>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Service Permanently</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to permanently delete this service? This will:
                                    <br />• Remove the service from the platform
                                    <br />• Delete all service requests and conversations
                                    <br />• Remove all messages related to this service
                                    <br />• Delete any notifications related to this service
                                    <br />
                                    <br />This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline">Cancel</Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteServiceMutation.mutate(service.id)}
                                    disabled={deleteServiceMutation.isPending}
                                  >
                                    {deleteServiceMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Approved Services Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Star className="h-5 w-5" />
                Approved Services
              </CardTitle>
              <CardDescription>
                Manage all approved services - view details and delete if needed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedServicesLoading ? (
                <div className="text-center py-4">Loading approved services...</div>
              ) : approvedServices.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved services found
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedServices.map((service: ServiceWithUser) => (
                    <div
                      key={service.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{service.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Posted {formatSafeDate(service.createdAt)} ago by {service.user?.name || service.user?.username}
                          </p>
                          <p className="text-gray-600 mb-3">{service.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{service.category}</Badge>
                            <Badge variant="outline">{service.location}</Badge>
                            <Badge variant="outline">{service.experienceLevel}</Badge>
                            <Badge variant="default" className="bg-green-100 text-green-800">
                              Approved
                            </Badge>
                          </div>
                          
                          <div className="text-sm font-medium mb-2">
                            Price: {getCurrencySymbol(service.currency)}{service.priceFrom}
                            {service.priceTo && ` - ${getCurrencySymbol(service.currency)}${service.priceTo}`}
                            {service.priceType === "hourly" && "/hr"}
                            {service.priceType === "per_project" && "/project"}
                            {service.priceType === "per_day" && "/day"}
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            Delivery: {service.deliveryTime}
                            {service.duration && ` • Duration: ${service.duration}`}
                          </div>
                          
                          {/* Service Website */}
                          {service.website && (
                            <div className="text-sm text-muted-foreground mt-1">
                              Website: <a 
                                href={service.website.startsWith('http') ? service.website : `https://${service.website}`}
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800 underline"
                              >
                                {service.website}
                              </a>
                            </div>
                          )}
                          
                          {service.tags && service.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {service.tags.map((tag: string, index: number) => (
                                <Badge key={index} variant="outline" className="text-xs">
                                  #{tag}
                                </Badge>
                              ))}
                            </div>
                          )}
                          
                          {/* Service Images */}
                          {service.images && service.images.length > 0 && (
                            <div className="mt-3">
                              <p className="text-sm font-medium mb-2">Service Images ({service.images.length}):</p>
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                {service.images.map((image: string, index: number) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={image}
                                      alt={`Service image ${index + 1}`}
                                      className="w-full h-20 object-cover rounded border hover:shadow-md transition-shadow cursor-pointer"
                                      onClick={() => window.open(image, '_blank')}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-opacity rounded cursor-pointer flex items-center justify-center">
                                      <Eye className="h-4 w-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.open(`/service/${service.id}`, '_blank')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Service
                          </Button>
                          {isAdmin && (
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="text-red-600 hover:text-red-700 border-red-200 hover:border-red-300"
                                >
                                  <Trash2 className="h-4 w-4 mr-1" />
                                  Delete
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Delete Service Permanently</DialogTitle>
                                  <DialogDescription>
                                    Are you sure you want to permanently delete this service? This will:
                                    <br />• Remove the service from the platform
                                    <br />• Delete all service requests and conversations
                                    <br />• Remove all messages related to this service
                                    <br />• Delete any notifications related to this service
                                    <br />
                                    <br />This action cannot be undone.
                                  </DialogDescription>
                                </DialogHeader>
                                <DialogFooter>
                                  <Button variant="outline">Cancel</Button>
                                  <Button
                                    variant="destructive"
                                    onClick={() => deleteServiceMutation.mutate(service.id)}
                                    disabled={deleteServiceMutation.isPending}
                                  >
                                    {deleteServiceMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                  </Button>
                                </DialogFooter>
                              </DialogContent>
                            </Dialog>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="approved" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Approved Jobs Management
              </CardTitle>
              <CardDescription>
                Manage approved job postings - you can permanently delete jobs here
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvedJobsLoading ? (
                <div className="text-center py-4">Loading approved jobs...</div>
              ) : approvedJobs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No approved jobs found
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedJobs.map((job: JobData) => (
                    <div
                      key={job.id}
                      className="border rounded-lg p-4 space-y-3"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg">{job.title}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            Posted {formatSafeDate(job.createdAt)} ago
                          </p>
                          <p className="text-gray-600 mb-3">{job.description}</p>
                          
                          <div className="flex flex-wrap gap-2 mb-3">
                            <Badge variant="secondary">{job.category}</Badge>
                            <Badge variant="outline">{job.location}</Badge>
                            <Badge variant="outline">{job.experienceLevel}</Badge>
                            <Badge variant="default" className="bg-green-600">
                              {job.status}
                            </Badge>
                          </div>
                          
                          {(job.minBudget || job.maxBudget) && (
                            <div className="text-sm font-medium">
                              Budget: {formatJobBudget(job)}
                            </div>
                          )}
                          
                          <div className="text-sm text-muted-foreground mt-2">
                            Applications: {job.applicationCount || 0}
                          </div>
                        </div>
                        
                        <div className="flex gap-2 ml-4">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                disabled={deleteJobMutation.isPending}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Delete Job
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete Job Post</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to permanently delete this job post? This action will:
                                  <br />• Remove the job from the platform
                                  <br />• Delete all applications to this job
                                  <br />• Remove all conversations and messages related to this job
                                  <br />• Delete any notifications related to this job
                                  <br />
                                  <br />This action cannot be undone.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteJobMutation.mutate(job.id)}
                                  disabled={deleteJobMutation.isPending}
                                >
                                  {deleteJobMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {isAdmin && (
          <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                User Management
              </CardTitle>
              <CardDescription>
                View all users and manage user access
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersLoading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : (
                <div className="space-y-4">
                  {users.map((user: UserData) => (
                    <div
                      key={user.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                          {user.name?.charAt(0)?.toUpperCase() || "U"}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{user.name}</span>
                            {user.isEmailVerified && (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            @{user.username} • {user.email}
                          </div>
                          <div className="flex gap-2 mt-1 flex-wrap">
                            <Badge variant={
                              user.role === "admin" ? "default" : 
                              user.role === "moderator" ? "secondary" : "outline"
                            }>
                              {user.role === "admin" ? "Admin" : 
                               user.role === "moderator" ? "Moderator" : "User"}
                            </Badge>
                            <Badge variant={user.isActive ? "default" : "destructive"}>
                              {user.isActive ? "Active" : "Banned"}
                            </Badge>
                            {user.isEmailVerified && (
                              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                                Verified
                              </Badge>
                            )}
                            <SubscriptionBadge userId={user.id} size="sm" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleChangePassword(user.id)}
                          disabled={changePasswordMutation.isPending}
                        >
                          <Key className="h-4 w-4 mr-1" />
                          Change Password
                        </Button>
                        
                        {/* Role Management Dropdown */}
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm">
                              <UserCheck className="h-4 w-4 mr-1" />
                              Change Role
                              <ChevronDown className="h-4 w-4 ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            {user.role === "user" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => promoteToModeratorMutation.mutate(user.id)}
                                  disabled={promoteToModeratorMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Make Moderator
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => promoteUserMutation.mutate(user.id)}
                                  disabled={promoteUserMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Make Admin
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {user.role === "moderator" && (
                              <>
                                <DropdownMenuItem
                                  onClick={() => demoteFromModeratorMutation.mutate(user.id)}
                                  disabled={demoteFromModeratorMutation.isPending}
                                >
                                  <UserX className="h-4 w-4 mr-2" />
                                  Demote to User
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => promoteUserMutation.mutate(user.id)}
                                  disabled={promoteUserMutation.isPending}
                                >
                                  <UserCheck className="h-4 w-4 mr-2" />
                                  Promote to Admin
                                </DropdownMenuItem>
                              </>
                            )}
                            
                            {user.role === "admin" && (
                              <DropdownMenuItem
                                onClick={() => demoteUserMutation.mutate(user.id)}
                                disabled={demoteUserMutation.isPending}
                              >
                                <UserX className="h-4 w-4 mr-2" />
                                Demote to User
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                        
                        {/* Subscription Management Button */}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openSubscriptionDialog(user)}
                        >
                          <Star className="h-4 w-4 mr-1" />
                          Manage Subscription
                        </Button>
                        
                        {/* Ban/Unban buttons - only for non-admin users */}
                        {user.role !== "admin" && (
                          user.isActive ? (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => banUserMutation.mutate(user.id)}
                              disabled={banUserMutation.isPending}
                            >
                              <ShieldX className="h-4 w-4 mr-1" />
                              Ban User
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => unbanUserMutation.mutate(user.id)}
                              disabled={unbanUserMutation.isPending}
                            >
                              <Shield className="h-4 w-4 mr-1" />
                              Unban User
                            </Button>
                          )
                        )}
                        
                        {/* Delete button - only for non-admin users */}
                        {user.role !== "admin" && (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="destructive"
                                size="sm"
                                disabled={deleteUserMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 mr-1" />
                                Delete User
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Delete User</DialogTitle>
                                <DialogDescription>
                                  Are you sure you want to permanently delete user "{user.name}" (@{user.username})? 
                                  This action cannot be undone and will remove all their data including jobs, applications, messages, and reviews.
                                </DialogDescription>
                              </DialogHeader>
                              <DialogFooter>
                                <Button variant="outline">Cancel</Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => deleteUserMutation.mutate(user.id)}
                                  disabled={deleteUserMutation.isPending}
                                >
                                  {deleteUserMutation.isPending ? "Deleting..." : "Delete Permanently"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>
        )}

        {isAdmin && (
          <TabsContent value="coins" className="space-y-6">
            <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5" />
                User Coin Management
              </CardTitle>
              <CardDescription>
                View and manage coin balances for all users
              </CardDescription>
            </CardHeader>
            <CardContent>
              {usersWithCoinsLoading ? (
                <div className="text-center py-4">Loading users...</div>
              ) : usersWithCoins.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No users found
                </div>
              ) : (
                <div className="space-y-4">
                  {usersWithCoins.map((user: UserData) => (
                    <div
                      key={user.id}
                      className="border rounded-lg p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-2">
                          <User className="h-8 w-8 text-gray-400" />
                          <div>
                            <h3 className="font-medium">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">
                              @{user.username} • {user.email}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                            {user.role === "admin" ? "Admin" : "User"}
                          </Badge>
                          
                          <Badge variant={user.isActive ? "default" : "destructive"}>
                            {user.isActive ? "Active" : "Banned"}
                          </Badge>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <div className="flex items-center gap-1">
                            <Coins className="h-4 w-4 text-yellow-500" />
                            <span className="font-bold text-lg">{user.coins || 0}</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {user.lastCoinReset 
                              ? `Reset ${formatSafeDate(user.lastCoinReset)} ago`
                              : "Never reset"
                            }
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setCoinAction("add");
                              setCoinDialogOpen(true);
                            }}
                          >
                            <Plus className="h-4 w-4" />
                            Add
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setCoinAction("remove");
                              setCoinDialogOpen(true);
                            }}
                          >
                            <Minus className="h-4 w-4" />
                            Remove
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setSelectedUserId(user.id);
                              setCoinAction("set");
                              setCoinDialogOpen(true);
                            }}
                          >
                            <Settings className="h-4 w-4" />
                            Set
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Flag className="h-5 w-5" />
                Job Reports Management
              </CardTitle>
              <CardDescription>
                Review and manage user reports about job postings
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reportsLoading ? (
                <div className="text-center py-8">Loading reports...</div>
              ) : pendingReports.length === 0 && allReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports to review
                </div>
              ) : pendingReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No pending reports to review. Check "Reports History" below for all reports.
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive" className="text-xs">
                              {report.category}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Reported {formatSafeDate(report.createdAt)} ago
                            </span>
                          </div>
                          <h4 className="font-medium">Job: {report.job.title}</h4>
                          <p className="text-sm text-muted-foreground">
                            Reported by: {report.reporter.name} (@{report.reporter.username})
                          </p>
                          <p className="text-sm">{report.reason}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(`/job/${report.jobId}`, '_blank')}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View Job
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reportActionMutation.mutate({ 
                              reportId: report.id, 
                              action: "approve",
                              adminNotes: "Report approved - job will be reviewed further" 
                            })}
                            disabled={reportActionMutation.isPending}
                            className="text-green-600 hover:text-green-700"
                          >
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Approve Report
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => reportActionMutation.mutate({ 
                              reportId: report.id, 
                              action: "reject",
                              adminNotes: "Report rejected - no violation found" 
                            })}
                            disabled={reportActionMutation.isPending}
                            className="text-red-600 hover:text-red-700"
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Reject Report
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* All Reports History */}
          <Card>
            <CardHeader>
              <CardTitle>Reports History</CardTitle>
              <CardDescription>
                All job reports with their review status
              </CardDescription>
            </CardHeader>
            <CardContent>
              {allReports.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No reports found
                </div>
              ) : (
                <div className="space-y-4">
                  {allReports.map((report) => (
                    <div key={report.id} className="border rounded-lg p-4 space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge 
                              variant={report.status === "pending" ? "secondary" : 
                                      report.status === "reviewed" ? "destructive" : "default"}
                              className="text-xs"
                            >
                              {report.category}
                            </Badge>
                            <Badge 
                              variant={report.status === "pending" ? "outline" : 
                                      report.status === "reviewed" ? "destructive" : "secondary"}
                              className="text-xs"
                            >
                              {report.status}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              {formatSafeDate(report.createdAt)} ago
                            </span>
                          </div>
                          <h4 className="font-medium text-sm">Job: {report.job.title}</h4>
                          <p className="text-xs text-muted-foreground">
                            Reporter: {report.reporter.name} (@{report.reporter.username})
                          </p>
                          {report.reviewer && (
                            <p className="text-xs text-muted-foreground">
                              Reviewed by: {report.reviewer.name} (@{report.reviewer.username})
                            </p>
                          )}
                          <p className="text-sm">{report.reason}</p>
                          {report.adminNotes && (
                            <p className="text-sm italic text-blue-600">
                              Admin notes: {report.adminNotes}
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(`/job/${report.jobId}`, '_blank')}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Job
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Change Password Dialog */}
      <Dialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Change User Password</DialogTitle>
            <DialogDescription>
              Enter a new password for the selected user. Password must be at least 6 characters long.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="password" className="text-right">
                New Password
              </Label>
              <Input
                id="password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="col-span-3"
                placeholder="Enter new password"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setPasswordDialogOpen(false);
                setNewPassword("");
                setSelectedUserId("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handlePasswordSubmit}
              disabled={changePasswordMutation.isPending || newPassword.length < 6}
            >
              {changePasswordMutation.isPending ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Coin Management Dialog */}
      <Dialog open={coinDialogOpen} onOpenChange={setCoinDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {coinAction === "add" ? "Add Coins" : coinAction === "remove" ? "Remove Coins" : "Set Coins"}
            </DialogTitle>
            <DialogDescription>
              {coinAction === "add" && "Add coins to the user's balance"}
              {coinAction === "remove" && "Remove coins from the user's balance"}
              {coinAction === "set" && "Set the user's total coin balance"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="coinAmount" className="text-right">
                {coinAction === "set" ? "Total Coins" : "Amount"}
              </Label>
              <Input
                id="coinAmount"
                type="number"
                min="0"
                value={coinAmount}
                onChange={(e) => setCoinAmount(e.target.value)}
                className="col-span-3"
                placeholder="Enter amount"
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setCoinDialogOpen(false);
                setCoinAmount("");
                setSelectedUserId("");
              }}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCoinSubmit}
              disabled={coinMutation.isPending || !coinAmount || parseInt(coinAmount) < 0}
            >
              {coinMutation.isPending ? "Processing..." : 
                coinAction === "add" ? "Add Coins" : 
                coinAction === "remove" ? "Remove Coins" : "Set Coins"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Subscription Management Dialog */}
      <Dialog open={subscriptionDialogOpen} onOpenChange={setSubscriptionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Manage User Subscription</DialogTitle>
            <DialogDescription>
              Change the subscription plan for {selectedUserForSubscription?.name} (@{selectedUserForSubscription?.username})
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="planType">Subscription Plan</Label>
              <Select value={selectedPlanType} onValueChange={setSelectedPlanType}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a plan type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Remove Subscription</SelectItem>
                  {Object.entries(SUBSCRIPTION_PLANS).map(([key, plan]) => (
                    <SelectItem key={key} value={key}>
                      {plan.icon} {plan.name} - {plan.coins} coins/month
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubscriptionDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubscriptionSubmit}
              disabled={!selectedPlanType || subscriptionMutation.isPending}
            >
              {subscriptionMutation.isPending ? "Updating..." : "Update Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}