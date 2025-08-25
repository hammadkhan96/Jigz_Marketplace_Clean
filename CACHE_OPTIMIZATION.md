# Cache & StaleTime Optimization Guide

## 🚀 **Overview**

This guide explains how to use the new cache and staleTime optimizations implemented in your JIGZ application for better performance and efficiency.

## 📁 **Files Created**

### 1. `server/config/cache.ts` - Backend Cache Configuration
- Environment-based cache settings
- Cache middleware for Express routes
- Cache invalidation patterns
- Helper functions for cache management

### 2. `client/src/config/queryClient.ts` - Frontend React Query Configuration
- Optimized staleTime and cache settings
- Query key factories for consistent cache management
- Custom stale times for different data types
- Cache invalidation helpers

## 🔧 **Backend Cache Implementation**

### **Environment-Based Cache Settings**

```typescript
// Development (faster updates)
development: {
  userProfile: 5 * 60 * 1000,        // 5 minutes
  jobListings: 2 * 60 * 1000,        // 2 minutes
  serviceListings: 2 * 60 * 1000,    // 2 minutes
  searchResults: 1 * 60 * 1000,      // 1 minute
  staticData: 10 * 60 * 1000,        // 10 minutes
  authData: 30 * 60 * 1000,          // 30 minutes
}

// Production (better performance)
production: {
  userProfile: 15 * 60 * 1000,       // 15 minutes
  jobListings: 10 * 60 * 1000,       // 10 minutes
  serviceListings: 10 * 60 * 1000,   // 10 minutes
  searchResults: 5 * 60 * 1000,      // 5 minutes
  staticData: 60 * 60 * 1000,        // 1 hour
  authData: 60 * 60 * 1000,          // 1 hour
}
```

### **Using Cache Middleware**

```typescript
import { cacheMiddleware } from './config/cache';

// Apply cache middleware to routes
app.get('/api/jobs', cacheMiddleware.jobListings, (req, res) => {
  // Route handler
});

app.get('/api/users/:id/profile', cacheMiddleware.userProfile, (req, res) => {
  // Route handler
});

app.get('/api/search', cacheMiddleware.searchResults, (req, res) => {
  // Route handler
});
```

### **Cache Invalidation**

```typescript
import { cacheConfig } from './config/cache';

// Invalidate specific cache types
const invalidateUserCache = () => {
  // This will invalidate userProfile and authData cache
  cacheConfig.invalidation.userUpdate.forEach(cacheType => {
    // Invalidate cache logic
  });
};
```

## 🎯 **Frontend React Query Implementation**

### **Query Client Configuration**

```typescript
import { queryClient, queryKeys, customStaleTimes } from './config/queryClient';

// The queryClient is pre-configured with:
// - Development: 2 min staleTime, Production: 10 min staleTime
// - 30 min cache time (gcTime)
// - Smart retry logic
// - Environment-based refetch settings
```

### **Using Query Keys**

```typescript
import { useQuery } from '@tanstack/react-query';
import { queryKeys, customStaleTimes } from './config/queryClient';

// User profile query with custom stale time
const { data: userProfile } = useQuery({
  queryKey: queryKeys.users.profile(userId),
  queryFn: () => fetchUserProfile(userId),
  staleTime: customStaleTimes.userProfile, // 15 minutes
});

// Job listings query
const { data: jobs } = useQuery({
  queryKey: queryKeys.jobs.list(filters),
  queryFn: () => fetchJobs(filters),
  staleTime: customStaleTimes.jobListings, // 5 minutes
});

// Search results query
const { data: searchResults } = useQuery({
  queryKey: queryKeys.search.jobs(query),
  queryFn: () => searchJobs(query),
  staleTime: customStaleTimes.searchResults, // 2 minutes
});
```

### **Cache Invalidation**

```typescript
import { cacheInvalidation } from './config/queryClient';

// Invalidate user cache when profile updates
const updateProfile = async (profileData) => {
  await updateUserProfile(profileData);
  cacheInvalidation.invalidateUser(userId);
};

// Invalidate job cache when new job is posted
const postJob = async (jobData) => {
  await createJob(jobData);
  cacheInvalidation.invalidateJobs();
};

// Invalidate all cache (use sparingly)
const logout = () => {
  // Logout logic
  cacheInvalidation.invalidateAll();
};
```

## 📊 **Performance Benefits**

### **Development Mode**
- **Faster updates**: Shorter cache times for rapid iteration
- **Real-time testing**: Quick data refresh for debugging
- **Flexible development**: Easy to see changes immediately

### **Production Mode**
- **Better performance**: Longer cache times reduce API calls
- **Improved UX**: Faster page loads with cached data
- **Reduced server load**: Fewer redundant requests

### **Smart Caching Strategy**
- **User data**: Longer cache (profile info doesn't change often)
- **Job/Service listings**: Moderate cache (balance between fresh and fast)
- **Search results**: Short cache (queries change frequently)
- **Static data**: Long cache (cities, categories, skills)

## 🛠️ **Customization**

### **Adjusting Cache Times**

```typescript
// In server/config/cache.ts
export const cacheConfig = {
  development: {
    userProfile: 10 * 60 * 1000, // Change to 10 minutes
    // ... other settings
  },
  // ... production settings
};
```

### **Adding New Cache Types**

```typescript
// Add new cache type
export const cacheConfig = {
  development: {
    // ... existing types
    notifications: 1 * 60 * 1000, // 1 minute
  },
  // ... production settings
};

// Add corresponding middleware
export const cacheMiddleware = {
  // ... existing middleware
  notifications: (req, res, next) => {
    const duration = cacheConfig.current.notifications;
    res.set('Cache-Control', cacheHelpers.formatCacheHeader(duration));
    next();
  },
};
```

## 🔍 **Monitoring & Debugging**

### **Check Cache Headers**

```bash
# Check cache headers in response
curl -I http://localhost:5000/api/jobs
# Should show: Cache-Control: public, max-age=120 (2 minutes in dev)
```

### **React Query DevTools**

```typescript
// Enable React Query DevTools in development
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

// In your app component
{process.env.NODE_ENV === 'development' && <ReactQueryDevtools />}
```

### **Cache Performance Metrics**

- **Cache hit rate**: How often data is served from cache
- **API call reduction**: Decrease in redundant requests
- **Page load speed**: Improvement in user experience

## 🚨 **Best Practices**

1. **Use appropriate stale times** for different data types
2. **Invalidate cache** when data changes
3. **Monitor cache performance** in production
4. **Test cache behavior** in both development and production
5. **Don't over-cache** dynamic or frequently changing data

## 📈 **Expected Results**

- **20-40% reduction** in API calls
- **Faster page loads** for returning users
- **Better user experience** with cached data
- **Reduced server load** and costs
- **Improved scalability** for your application

---

**Happy caching! 🎉**
