import { QueryClient } from '@tanstack/react-query';

// React Query client configuration with optimized cache settings
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Stale time - how long data is considered fresh
      staleTime: process.env.NODE_ENV === 'development' ? 2 * 60 * 1000 : 10 * 60 * 1000, // 2 min dev, 10 min prod
      
      // Cache time - how long data stays in cache
      gcTime: 30 * 60 * 1000, // 30 minutes
      
      // Retry settings
      retry: (failureCount, error: any) => {
        // Don't retry on 4xx errors (client errors)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      
      // Retry delay with exponential backoff
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      
      // Refetch on window focus (only in production)
      refetchOnWindowFocus: process.env.NODE_ENV === 'production',
      
      // Refetch on reconnect
      refetchOnReconnect: true,
      
      // Refetch on mount
      refetchOnMount: true,
    },
    mutations: {
      // Retry mutations
      retry: 1,
      
      // Retry delay for mutations
      retryDelay: 1000,
    },
  },
});

// Query key factories for consistent cache management
export const queryKeys = {
  // User-related queries
  users: {
    all: ['users'] as const,
    lists: () => [...queryKeys.users.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.users.lists(), { filters }] as const,
    details: () => [...queryKeys.users.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.users.details(), id] as const,
    profile: (id: string) => [...queryKeys.users.all, 'profile', id] as const,
    auth: (id: string) => [...queryKeys.users.all, 'auth', id] as const,
  },
  
  // Job-related queries
  jobs: {
    all: ['jobs'] as const,
    lists: () => [...queryKeys.jobs.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.jobs.lists(), { filters }] as const,
    details: () => [...queryKeys.jobs.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.jobs.details(), id] as const,
    applications: (jobId: string) => [...queryKeys.jobs.all, 'applications', jobId] as const,
    userJobs: (userId: string) => [...queryKeys.jobs.all, 'user', userId] as const,
  },
  
  // Service-related queries
  services: {
    all: ['services'] as const,
    lists: () => [...queryKeys.services.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.services.lists(), { filters }] as const,
    details: () => [...queryKeys.services.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.services.details(), id] as const,
    userServices: (userId: string) => [...queryKeys.services.all, 'user', userId] as const,
  },
  
  // Search-related queries
  search: {
    all: ['search'] as const,
    jobs: (query: string) => [...queryKeys.search.all, 'jobs', query] as const,
    services: (query: string) => [...queryKeys.search.all, 'services', query] as const,
    users: (query: string) => [...queryKeys.search.all, 'users', query] as const,
  },
  
  // Application-related queries
  applications: {
    all: ['applications'] as const,
    lists: () => [...queryKeys.applications.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.applications.lists(), { filters }] as const,
    details: () => [...queryKeys.applications.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.applications.details(), id] as const,
    userApplications: (userId: string) => [...queryKeys.applications.all, 'user', userId] as const,
    jobApplications: (jobId: string) => [...queryKeys.applications.all, 'job', jobId] as const,
  },
  
  // Review-related queries
  reviews: {
    all: ['reviews'] as const,
    lists: () => [...queryKeys.reviews.all, 'list'] as const,
    list: (filters: string) => [...queryKeys.reviews.lists(), { filters }] as const,
    details: () => [...queryKeys.reviews.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.reviews.details(), id] as const,
    userReviews: (userId: string) => [...queryKeys.reviews.all, 'user', userId] as const,
    jobReviews: (jobId: string) => [...queryKeys.reviews.all, 'job', jobId] as const,
  },
  
  // Messaging-related queries
  messaging: {
    all: ['messaging'] as const,
    conversations: (userId: string) => [...queryKeys.messaging.all, 'conversations', userId] as const,
    messages: (conversationId: string) => [...queryKeys.messaging.all, 'messages', conversationId] as const,
  },
  
  // Static data queries
  static: {
    all: ['static'] as const,
    cities: () => [...queryKeys.static.all, 'cities'] as const,
    categories: () => [...queryKeys.static.all, 'categories'] as const,
    skills: () => [...queryKeys.static.all, 'skills'] as const,
  },
};

// Custom stale times for specific queries
export const customStaleTimes = {
  // User data - longer cache for profile info
  userProfile: 15 * 60 * 1000, // 15 minutes
  
  // Job listings - shorter cache for real-time updates
  jobListings: 5 * 60 * 1000, // 5 minutes
  
  // Service listings - moderate cache
  serviceListings: 10 * 60 * 1000, // 10 minutes
  
  // Search results - very short cache
  searchResults: 2 * 60 * 1000, // 2 minutes
  
  // Static data - long cache
  staticData: 60 * 60 * 1000, // 1 hour
  
  // Auth data - moderate cache
  authData: 30 * 60 * 1000, // 30 minutes
};

// Cache invalidation helpers
export const cacheInvalidation = {
  // Invalidate user-related cache
  invalidateUser: (userId: string) => {
    queryClient.invalidateQueries({ queryKey: queryKeys.users.profile(userId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.users.auth(userId) });
  },
  
  // Invalidate job-related cache
  invalidateJobs: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
  },
  
  // Invalidate service-related cache
  invalidateServices: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.services.lists() });
    queryClient.invalidateQueries({ queryKey: queryKeys.search.all });
  },
  
  // Invalidate all cache
  invalidateAll: () => {
    queryClient.invalidateQueries();
  },
  
  // Remove specific queries from cache
  removeQueries: (queryKey: any) => {
    queryClient.removeQueries({ queryKey });
  },
};
