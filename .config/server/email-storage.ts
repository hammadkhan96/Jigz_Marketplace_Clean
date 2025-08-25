// Email verification utilities
import { storage } from "./storage";
import { emailService, generateVerificationToken, getTokenExpiration } from "./email";

// Update registration to send verification email
export async function sendVerificationEmailAfterRegistration(email: string, userName: string) {

  
  if (!emailService.isConfigured()) {

    return true;
  }

  const token = generateVerificationToken();
  const expiresAt = getTokenExpiration();
  
  try {
    // Store the token
    await storage.createEmailVerificationToken({
      email,
      token,
      expiresAt
    });

    // Send the email
    const success = await emailService.sendVerificationEmail(email, token, userName);
    return success;
  } catch (error) {
    return false;
  }
}