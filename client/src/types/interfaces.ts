// Extended types for dashboard functionality
import type { 
  User, 
  Service, 
  ServiceRequest, 
  Job, 
  Application, 
  Review,
  ServiceWithRequests,
  ServiceRequestWithUser,
  JobWithApplications,
  ApplicationWithUser,
  ReviewWithUser
} from "@shared/schema";

// Error types for API responses
export interface ApiError {
  message: string;
  status?: number;
  code?: string;
}

export interface CoinError {
  message: string;
  status?: number;
  code?: string;
}

// Extended service request type with service and user details
export interface ServiceRequestWithServiceAndUser extends ServiceRequest {
  service: Service & {
    user: User;
  };
  user?: User; // Direct user access for some cases
}

// Extended review type for dashboard
export interface ReviewWithDetails extends Review {
  reviewer: User;
  reviewee: User;
}

// Service rating eligibility type
export interface ServiceRatingEligibility {
  serviceId: string;
  requestId: string;
  clientId: string;
  canRate: boolean;
  hasRated: boolean;
}

// Freelancer review status type
export interface FreelancerReviewStatus {
  [key: string]: boolean; // key format: "jobId-freelancerId"
}

// Endorsement status type
export interface EndorsementStatus {
  [key: string]: boolean; // key format: "jobId-freelancerId"
}

// Service request modal data
export interface ServiceRequestModalData {
  id: string;
  service: Service & {
    user: User;
  };
  message: string;
  budget: number;
  coinsBid: number;
  timeline?: string;
  requirements?: string;
  status: string;
  createdAt: string;
  acceptedAt?: string;
  completedAt?: string;
  userId: string;
}

// Review modal data
export interface ReviewModalData {
  jobId: string;
  revieweeId: string;
  revieweeName: string;
  reviewType: "client_to_worker" | "worker_to_client";
  jobTitle?: string;
}

// Skill endorsement modal data
export interface SkillEndorsementModalData {
  jobId: string;
  endorseeId: string;
  endorseeName: string;
  jobTitle: string;
}
