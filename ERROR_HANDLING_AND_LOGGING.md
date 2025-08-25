# Error Handling and Logging Guide

This guide explains how to use the new consistent error handling and logging system implemented in the backend.

## 🚀 Quick Start

The new system provides utilities that can be easily integrated into existing routes without major structural changes.

### 1. Basic Error Handling

```typescript
import { asyncHandler } from '../utils/errorUtils';

// Wrap async route handlers to automatically catch errors
app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
}));
```

### 2. Custom Error Classes

```typescript
import { 
  ValidationError, 
  NotFoundError, 
  DatabaseError,
  AuthenticationError 
} from '../utils/errorUtils';

// Throw specific error types
if (!user) {
  throw new NotFoundError('User not found');
}

if (!isValid(data)) {
  throw new ValidationError('Invalid input data');
}

if (!isAuthorized) {
  throw new AuthenticationError('Authentication required');
}
```

### 3. Consistent Error Responses

```typescript
import { formatErrorResponse, formatSuccessResponse } from '../middleware/errorHandling';

// Error responses
res.status(400).json(formatErrorResponse(error, req, true));

// Success responses
res.json(formatSuccessResponse(data, 'Operation successful'));
```

## 📝 Logging

### 1. Specialized Loggers

```typescript
import { 
  dbLogger, 
  authLogger, 
  apiLogger, 
  fileLogger,
  emailLogger,
  paymentLogger 
} from '../utils/logger';

// Use appropriate logger for context
dbLogger.error('Database operation failed', { 
  table: 'users', 
  operation: 'insert',
  error: error.message 
});

authLogger.warn('Failed login attempt', { 
  ip: req.ip, 
  userAgent: req.get('User-Agent') 
});
```

### 2. Request-Specific Logging

```typescript
import { createRequestLogger } from '../utils/logger';

// Create logger with request context
const logger = createRequestLogger(req, 'UserController');
logger.info('User profile updated', { 
  userId: req.params.id,
  changes: req.body 
});
```

### 3. Performance Logging

```typescript
import { logPerformance } from '../utils/logger';

const start = Date.now();
// ... perform operation ...
const duration = Date.now() - start;
logPerformance('Database query', duration, { table: 'users' });
```

## 🔧 Error Handling Patterns

### 1. Database Operations

```typescript
import { withDatabaseErrorHandling } from '../utils/errorUtils';

// Wrap database operations with error handling
const user = await withDatabaseErrorHandling(
  () => db.users.create(userData),
  'user creation'
);
```

### 2. Validation Errors

```typescript
import { handleValidationError } from '../utils/errorUtils';

try {
  // ... validation logic ...
} catch (error) {
  const validationError = handleValidationError(error, 'email');
  throw validationError;
}
```

### 3. Async Error Handling

```typescript
import { handleAsyncError } from '../utils/errorUtils';

const result = await handleAsyncError(
  () => externalService.call(),
  'external service call'
);
```

## 🛡️ Middleware Integration

The following middleware is automatically applied to all routes:

- **Request Logging**: Logs all API requests with timing and context
- **Performance Monitoring**: Detects and logs slow operations (>1 second)
- **Security Logging**: Logs authentication failures and admin operations
- **Specialized Error Handlers**: Handle specific error types before global handler

### Custom Middleware Usage

```typescript
import { 
  requestLogger, 
  performanceMonitor, 
  securityLogger 
} from '../middleware/errorHandling';

// Apply to specific routes
app.use('/api/admin', securityLogger);
app.use('/api/slow', performanceMonitor(500)); // 500ms threshold
```

## 📊 Response Format

### Error Response Format

```json
{
  "error": "ValidationError",
  "message": "Invalid input data",
  "statusCode": 400,
  "timestamp": "2024-01-15T10:30:00.000Z",
  "path": "/api/users",
  "requestId": "abc123"
}
```

### Success Response Format

```json
{
  "success": true,
  "data": { "id": 1, "name": "John" },
  "message": "User created successfully",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

## 🔍 Debugging and Troubleshooting

### 1. Enable Debug Logging

```typescript
import { setGlobalLogLevel, LogLevel } from '../utils/logger';

// Set to debug level for development
setGlobalLogLevel(LogLevel.DEBUG);
```

### 2. Request Tracking

Each request gets a unique ID (`x-request-id`) that appears in all logs for easy tracking.

### 3. Performance Issues

Slow operations (>1 second) are automatically logged with context.

### 4. Security Events

Failed authentication attempts and admin operations are logged for security monitoring.

## 📋 Best Practices

### 1. Error Handling

- Use `asyncHandler` for all async route handlers
- Throw specific error types instead of generic errors
- Use `withDatabaseErrorHandling` for database operations
- Don't expose internal errors in production

### 2. Logging

- Use appropriate logger context (dbLogger, authLogger, etc.)
- Include relevant metadata in log messages
- Use `createRequestLogger` for request-specific logging
- Log performance metrics for slow operations

### 3. Response Formatting

- Use `formatErrorResponse` for consistent error responses
- Use `formatSuccessResponse` for consistent success responses
- Include request context when appropriate

## 🚨 Migration Guide

### From Old Error Handling

**Before:**
```typescript
app.get('/api/users', async (req, res) => {
  try {
    const users = await db.getUsers();
    res.json(users);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
```

**After:**
```typescript
import { asyncHandler } from '../utils/errorUtils';
import { dbLogger } from '../utils/logger';

app.get('/api/users', asyncHandler(async (req, res) => {
  const users = await db.getUsers();
  res.json(users);
}));
```

### From Old Logging

**Before:**
```typescript
console.error('Database error:', error);
```

**After:**
```typescript
import { dbLogger } from '../utils/logger';

dbLogger.error('Database operation failed', { 
  operation: 'getUsers',
  error: error.message 
});
```

## 🔧 Configuration

### Environment Variables

```env
# Log level: error, warn, info, debug
LOG_LEVEL=info

# Performance threshold for slow operation logging (ms)
PERFORMANCE_THRESHOLD=1000
```

### Custom Configuration

```typescript
import { createLogger } from '../utils/logger';

const customLogger = createLogger('CustomModule', {
  level: LogLevel.DEBUG,
  includeTimestamp: true,
  includeContext: true,
  maxMessageLength: 500
});
```

## 📚 Examples

See the routes file for examples of how these utilities are used in practice. The system is designed to be easily integrated into existing code without major refactoring.

## 🆘 Support

If you encounter issues or need help implementing these utilities:

1. Check the console logs for detailed error information
2. Verify that all imports are correct
3. Ensure the build is successful (`npm run build`)
4. Check that middleware is applied in the correct order

The system is designed to fail gracefully and provide helpful error messages for debugging.
