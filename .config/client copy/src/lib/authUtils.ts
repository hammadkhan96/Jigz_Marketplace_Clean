export function isUnauthorizedError(error: Error): boolean {
  return /^401: .*Unauthorized/.test(error.message) || 
         /^403: .*Admin access required/.test(error.message) ||
         error.message.includes("Authentication required") ||
         error.message.includes("Admin access required");
}