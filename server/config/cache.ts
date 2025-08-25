// Cache configuration for optimal performance and efficiency
export const cacheConfig = {
  // Environment-based cache settings
  development: {
    // Shorter cache times for development (faster updates)
    userProfile: 5 * 60 * 1000,        // 5 minutes
    jobListings: 2 * 60 * 1000,        // 2 minutes
    serviceListings: 2 * 60 * 1000,    // 2 minutes
    searchResults: 1 * 60 * 1000,      // 1 minute
    staticData: 10 * 60 * 1000,        // 10 minutes
    authData: 30 * 60 * 1000,          // 30 minutes
  },
  production: {
    // Longer cache times for production (better performance)
    userProfile: 15 * 60 * 1000,       // 15 minutes
    jobListings: 10 * 60 * 1000,       // 10 minutes
    serviceListings: 10 * 60 * 1000,   // 10 minutes
    searchResults: 5 * 60 * 1000,      // 5 minutes
    staticData: 60 * 60 * 1000,        // 1 hour
    authData: 60 * 60 * 1000,          // 1 hour
  },
  
  // Get current cache configuration based on environment
  get current() {
    return process.env.NODE_ENV === 'production' 
      ? this.production 
      : this.development;
  },
  
  // Cache invalidation patterns
  invalidation: {
    // Invalidate user-related cache when user data changes
    userUpdate: ['userProfile', 'authData'],
    // Invalidate job-related cache when jobs change
    jobUpdate: ['jobListings', 'searchResults'],
    // Invalidate service-related cache when services change
    serviceUpdate: ['serviceListings', 'searchResults'],
    // Invalidate all cache (use sparingly)
    all: ['userProfile', 'jobListings', 'serviceListings', 'searchResults', 'staticData', 'authData'],
  },
  
  // Redis-like cache keys for different data types
  keys: {
    userProfile: (userId: string) => `user:profile:${userId}`,
    userAuth: (userId: string) => `user:auth:${userId}`,
    jobListings: (filters: string) => `jobs:list:${filters}`,
    jobDetails: (jobId: string) => `job:details:${jobId}`,
    serviceListings: (filters: string) => `services:list:${filters}`,
    serviceDetails: (serviceId: string) => `service:details:${serviceId}`,
    searchResults: (query: string) => `search:${query}`,
    staticData: (type: string) => `static:${type}`,
  },
  
  // Cache middleware configuration
  middleware: {
    // Enable cache headers
    enableHeaders: true,
    // Cache control directives
    cacheControl: {
      public: 'public, max-age=300',           // 5 minutes for public data
      private: 'private, max-age=600',         // 10 minutes for private data
      noCache: 'no-cache, no-store, must-revalidate',
      immutable: 'public, max-age=31536000, immutable', // 1 year for static assets
    },
  },
};

// Helper functions for cache management
export const cacheHelpers = {
  // Generate cache key with prefix
  generateKey: (prefix: string, identifier: string | number) => 
    `${prefix}:${identifier}`,
  
  // Check if cache should be invalidated
  shouldInvalidate: (lastUpdate: number, staleTime: number) => 
    Date.now() - lastUpdate > staleTime,
  
  // Get cache duration for specific data type
  getCacheDuration: (dataType: keyof typeof cacheConfig.current) => 
    cacheConfig.current[dataType],
  
  // Format cache duration for headers
  formatCacheHeader: (duration: number) => 
    `public, max-age=${Math.floor(duration / 1000)}`,
};

// Cache middleware for Express routes
export const cacheMiddleware = {
  // Cache user profile data
  userProfile: (req: any, res: any, next: any) => {
    const duration = cacheConfig.current.userProfile;
    res.set('Cache-Control', cacheHelpers.formatCacheHeader(duration));
    next();
  },
  
  // Cache job listings
  jobListings: (req: any, res: any, next: any) => {
    const duration = cacheConfig.current.jobListings;
    res.set('Cache-Control', cacheHelpers.formatCacheHeader(duration));
    next();
  },
  
  // Cache service listings
  serviceListings: (req: any, res: any, next: any) => {
    const duration = cacheConfig.current.serviceListings;
    res.set('Cache-Control', cacheHelpers.formatCacheHeader(duration));
    next();
  },
  
  // Cache search results
  searchResults: (req: any, res: any, next: any) => {
    const duration = cacheConfig.current.searchResults;
    res.set('Cache-Control', cacheHelpers.formatCacheHeader(duration));
    next();
  },
  
  // No cache for dynamic data
  noCache: (req: any, res: any, next: any) => {
    res.set('Cache-Control', cacheConfig.middleware.cacheControl.noCache);
    next();
  },
  
  // Long cache for static assets
  staticAssets: (req: any, res: any, next: any) => {
    res.set('Cache-Control', cacheConfig.middleware.cacheControl.immutable);
    next();
  },
};
