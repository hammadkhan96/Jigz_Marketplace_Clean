import nodemailer from 'nodemailer';
import * as crypto from 'node:crypto';
import sgMail from '@sendgrid/mail';
import { getBaseUrl as getEnvBaseUrl } from './config/environment';

// Email service configuration
export interface EmailConfig {
  host: string;
  port: number;
  secure: boolean;
  auth: {
    user: string;
    pass: string;
  };
}

// Email providers configurations
export const emailProviders = {
  gmail: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // TLS
  },
  outlook: {
    host: 'smtp-mail.outlook.com',
    port: 587,
    secure: false, // TLS
  },
  yahoo: {
    host: 'smtp.mail.yahoo.com',
    port: 587,
    secure: false, // TLS
  },
  sendgrid: {
    host: 'smtp.sendgrid.net',
    port: 587,
    secure: false, // TLS
  },
  mailgun: {
    host: 'smtp.mailgun.org',
    port: 587,
    secure: false, // TLS
  },
  // For development/testing
  ethereal: {
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
  }
};

class EmailService {
  private transporter: nodemailer.Transporter | null = null;
  private fromEmail: string = '';
  private useSendGridAPI: boolean = false;

  private getBaseUrl(): string {
    // Use the centralized environment configuration
    return getEnvBaseUrl();
  }

  async initialize() {
    // Check if SendGrid API key is available
    const sendGridApiKey = process.env.SENDGRID_API_KEY;
    if (sendGridApiKey) {
      sgMail.setApiKey(sendGridApiKey);
      this.useSendGridAPI = true;
      this.fromEmail = process.env.FROM_EMAIL || 'noreply@jigz.app';

      return true;
    }

    // Fallback to SMTP configuration
    const emailProvider = process.env.EMAIL_PROVIDER;
    const emailUser = process.env.EMAIL_USER;
    const emailPassword = process.env.EMAIL_PASSWORD;
    const fromEmail = process.env.FROM_EMAIL;

    if (!emailProvider || !emailUser || !emailPassword) {
      console.warn('Email service not configured. Email verification will be disabled.');
      return false;
    }

    let config: EmailConfig;

    if (emailProvider in emailProviders) {
      config = {
        ...emailProviders[emailProvider as keyof typeof emailProviders],
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    } else if (emailProvider === 'custom') {
      // Custom SMTP configuration
      config = {
        host: process.env.SMTP_HOST || '',
        port: parseInt(process.env.SMTP_PORT || '587'),
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
          user: emailUser,
          pass: emailPassword,
        },
      };
    } else {
      console.error(`Unsupported email provider: ${emailProvider}`);
      return false;
    }

    try {
      this.transporter = nodemailer.createTransport(config);
      this.fromEmail = fromEmail || emailUser;
      
      // Verify connection
      await this.transporter!.verify();

      return true;
    } catch (error) {
      console.error('Failed to initialize email service:', error);
      return false;
    }
  }

  async sendVerificationEmail(email: string, token: string, userName: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email?token=${token}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Verify Your Email - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>Welcome to Jigz!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Thank you for signing up for Jigz! To complete your registration and start using our platform, please verify your email address.</p>
            
            <p style="text-align: center;">
              <a href="${verificationUrl}" class="button">Verify Email Address</a>
            </p>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">
              ${verificationUrl}
            </p>
            
            <p><strong>Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't create an account with Jigz, please ignore this email.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Thank you for signing up for Jigz! To complete your registration and start using our platform, please verify your email address.

Please click the following link to verify your email:
${verificationUrl}

Important: This verification link will expire in 24 hours for security reasons.

If you didn't create an account with Jigz, please ignore this email.

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: 'Verify Your Email Address - Jigz',
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: 'Verify Your Email Address - Jigz',
          text: textContent,
          html: htmlContent,
        });
      }
      

      return true;
    } catch (error) {
      console.error('Failed to send verification email:', error);
      return false;
    }
  }

  async sendPasswordResetEmail(email: string, userName: string, resetLink: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Reset Your Password - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .warning { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>🔒 Reset Your Password</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We received a request to reset your password for your Jigz account.</p>
            
            <p style="text-align: center;">
              <a href="${resetLink}" class="button">Reset Password</a>
            </p>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; background: #e2e8f0; padding: 10px; border-radius: 4px;">
              ${resetLink}
            </p>
            
            <div class="warning">
              <strong>⚠️ Important:</strong>
              <ul>
                <li>This password reset link will expire in 1 hour for security reasons</li>
                <li>If you didn't request a password reset, please ignore this email</li>
                <li>Your password will remain unchanged until you click the link above</li>
              </ul>
            </div>
            
            <p>For your security, never share this reset link with anyone.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

We received a request to reset your password for your Jigz account.

Please click the following link to reset your password:
${resetLink}

Important:
- This password reset link will expire in 1 hour for security reasons
- If you didn't request a password reset, please ignore this email
- Your password will remain unchanged until you click the link above

For your security, never share this reset link with anyone.

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: 'Reset Your Password - Jigz',
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: 'Reset Your Password - Jigz',
          text: textContent,
          html: htmlContent,
        });
      }
      

      return true;
    } catch (error) {
      console.error('Failed to send password reset email:', error);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, userName: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const loginUrl = `${baseUrl}/login`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to Jigz!</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #16a34a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>🎉 Welcome to Jigz!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Congratulations! Your email has been verified and your Jigz account is now active.</p>
            
            <p>You can now:</p>
            <ul>
              <li>✅ Post jobs and find talented freelancers</li>
              <li>✅ Apply for jobs that match your skills</li>
              <li>✅ Communicate with clients and freelancers</li>
              <li>✅ Build your reputation through reviews</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${loginUrl}" class="button">Start Using Jigz</a>
            </p>
            
            <p>You start with <strong>20 coins</strong> to get you going. Use them to post jobs or apply for opportunities!</p>
            
            <p>If you have any questions, feel free to reach out to our support team.</p>
            
            <p>Welcome aboard!<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: '🎉 Welcome to Jigz - Your Account is Active!',
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: '🎉 Welcome to Jigz - Your Account is Active!',
          html: htmlContent,
        });
      }
      

      return true;
    } catch (error) {
      console.error('Failed to send welcome email:', error);
      return false;
    }
  }

  async sendJobApplicationNotification(email: string, userName: string, jobTitle: string, applicantName: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Application - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📝 New Application Received</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Great news! You've received a new application for your job posting.</p>
            
            <div class="highlight">
              <strong>Job:</strong> ${jobTitle}<br>
              <strong>Applicant:</strong> ${applicantName}
            </div>
            
            <p>The applicant is interested in working on your project. Review their profile, portfolio, and application details to see if they're a good fit.</p>
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">Review Application</a>
            </p>
            
            <p>Don't keep talented freelancers waiting - review and respond to applications promptly to attract the best candidates.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `📝 New Application for "${jobTitle}" - Jigz`,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `📝 New Application for "${jobTitle}" - Jigz`,
          html: htmlContent,
        });
      }
      
      console.log(`Job application notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send job application notification:', error);
      return false;
    }
  }

  async sendReviewNotification(email: string, userName: string, reviewerName: string, rating: number, jobTitle: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const profileUrl = `${baseUrl}/profile`;

    const ratingStars = '⭐'.repeat(rating) + '☆'.repeat(5 - rating);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Review - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; text-align: center; }
          .rating { font-size: 24px; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>⭐ New Review Received</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>You've received a new review on Jigz!</p>
            
            <div class="highlight">
              <strong>From:</strong> ${reviewerName}<br>
              <strong>Job:</strong> ${jobTitle}<br>
              <div class="rating">${ratingStars}</div>
              <strong>${rating} out of 5 stars</strong>
            </div>
            
            <p>Reviews help build your reputation on Jigz and attract more clients. Keep up the great work!</p>
            
            <p style="text-align: center;">
              <a href="${profileUrl}" class="button">View Your Profile</a>
            </p>
            
            <p>Continue delivering excellent work to maintain your high rating and grow your freelance business.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `⭐ New ${rating}-Star Review Received - Jigz`,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `⭐ New ${rating}-Star Review Received - Jigz`,
          html: htmlContent,
        });
      }
      
      console.log(`Review notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send review notification:', error);
      return false;
    }
  }

  async sendApplicationAcceptedEmail(email: string, applicantName: string, jobTitle: string, jobPosterName: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;
    const messagesUrl = `${baseUrl}/messages`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Accepted - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #16a34a; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
          .success-button { background: #16a34a; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: #dcfce7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #16a34a; }
          .next-steps { background: #f0f9ff; padding: 15px; border-radius: 6px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>🎉 Great News! Your Application Was Accepted</h1>
          </div>
          <div class="content">
            <h2>Hi ${applicantName},</h2>
            <p>Congratulations! We're excited to let you know that your application has been accepted.</p>
            
            <div class="highlight">
              <strong>Job:</strong> ${jobTitle}<br>
              <strong>Job Poster:</strong> ${jobPosterName}<br>
              <strong>Status:</strong> <span style="color: #16a34a; font-weight: bold;">✅ Accepted</span>
            </div>
            
            <div class="next-steps">
              <h3>What happens next?</h3>
              <ul>
                <li>The job poster may contact you soon to discuss project details</li>
                <li>Check your messages regularly for updates</li>
                <li>You can view all your accepted applications in your dashboard</li>
                <li>Make sure to deliver quality work to build your reputation on Jigz</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button success-button">View Dashboard</a>
              <a href="${messagesUrl}" class="button">Check Messages</a>
            </p>
            
            <p>This is a great opportunity to showcase your skills and build your reputation on our platform. We wish you the best of luck with your project!</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${applicantName},

Great news! Your application for "${jobTitle}" has been accepted by ${jobPosterName}.

What happens next?
- The job poster may contact you soon to discuss project details
- Check your messages regularly for updates  
- You can view all your accepted applications in your dashboard
- Make sure to deliver quality work to build your reputation on Jigz

Visit your dashboard: ${dashboardUrl}
Check your messages: ${messagesUrl}

Best regards,
The Jigz Team
    `;

    const mailOptions = {
      from: this.fromEmail,
      to: email,
      subject: '🎉 Your Application Was Accepted - Jigz',
      html: htmlContent,
      text: textContent,
    };

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          ...mailOptions,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail(mailOptions);
      }
      console.log(`Application acceptance email sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send application acceptance email:', error);
      return false;
    }
  }

  async sendJobStatusNotification(email: string, userName: string, jobTitle: string, status: string, adminNotes?: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const dashboardUrl = `${baseUrl}/dashboard`;

    const statusColors = {
      approved: '#16a34a',
      rejected: '#dc2626',
      pending: '#f59e0b'
    };

    const statusEmojis = {
      approved: '✅',
      rejected: '❌', 
      pending: '⏳'
    };

    const color = statusColors[status as keyof typeof statusColors] || '#6b7280';
    const emoji = statusEmojis[status as keyof typeof statusEmojis] || '📋';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Job Status Update - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${color}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: ${color}; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0; }
          .status { text-transform: capitalize; font-weight: bold; color: ${color}; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${emoji} Job Status Update</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your job posting status has been updated by our admin team.</p>
            
            <div class="highlight">
              <strong>Job:</strong> ${jobTitle}<br>
              <strong>Status:</strong> <span class="status">${status}</span>
            </div>
            
            ${adminNotes ? `
            <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; margin: 15px 0;">
              <strong>Admin Notes:</strong><br>
              ${adminNotes}
            </div>
            ` : ''}
            
            <p style="text-align: center;">
              <a href="${dashboardUrl}" class="button">View Job Details</a>
            </p>
            
            ${status === 'approved' ? '<p>Congratulations! Your job is now live and visible to freelancers.</p>' : ''}
            ${status === 'rejected' ? '<p>If you have questions about this decision, please contact our support team.</p>' : ''}
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Manage your notification preferences in your account settings.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `${emoji} Job "${jobTitle}" ${status.charAt(0).toUpperCase() + status.slice(1)} - Jigz`,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `${emoji} Job "${jobTitle}" ${status.charAt(0).toUpperCase() + status.slice(1)} - Jigz`,
          html: htmlContent,
        });
      }
      
      console.log(`Job status notification sent to ${email}`);
      return true;
    } catch (error) {
      console.error('Failed to send job status notification:', error);
      return false;
    }
  }

  async sendSubscriptionWelcomeEmail(
    email: string, 
    userName: string, 
    planType: string, 
    monthlyCoins: number, 
    monthlyPrice: number,
    nextBillingDate: string
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const planName = planType.charAt(0).toUpperCase() + planType.slice(1);
    const priceFormatted = (monthlyPrice / 100).toFixed(2);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to ${planName} Plan - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #3b82f6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: #e0f2fe; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .coins-box { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .benefit { padding: 8px 0; }
          .benefit::before { content: "✓ "; color: #10b981; font-weight: bold; }
          .cta-button { display: inline-block; background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; font-weight: bold; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>🎉 Welcome to ${planName} Plan!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Congratulations! You've successfully subscribed to the <strong>${planName} Plan</strong> on Jigz.</p>
            
            <div class="coins-box">
              <h3 style="margin: 0; color: #3b82f6; font-size: 1.5em;">${monthlyCoins} Coins Added!</h3>
              <p style="margin: 8px 0 0 0; color: #6b7280; font-size: 1.1em;">Ready to use for job applications and posting</p>
            </div>

            <div class="highlight">
              <h3 style="margin-top: 0; color: #1e40af;">Your Subscription Details:</h3>
              <div class="info-box">
                <p style="margin: 8px 0;"><strong>Plan:</strong> ${planName}</p>
                <p style="margin: 8px 0;"><strong>Monthly Coins:</strong> ${monthlyCoins}</p>
                <p style="margin: 8px 0;"><strong>Monthly Price:</strong> $${priceFormatted}</p>
                <p style="margin: 8px 0;"><strong>Next Billing:</strong> ${nextBillingDate}</p>
              </div>
            </div>

            <h3 style="color: #1e40af;">What You Can Do With Your Coins:</h3>
            <div class="benefit">Apply to jobs (1 coin per application)</div>
            <div class="benefit">Post job listings (3 coins per post)</div>
            <div class="benefit">Connect with quality freelancers and clients</div>
            <div class="benefit">Access to our full marketplace features</div>
            <div class="benefit">Priority support and premium features</div>

            <p style="margin: 25px 0;">Your coins will automatically renew each month. You can manage your subscription anytime from your account settings.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard" class="cta-button">Go to Dashboard</a>
            </div>
            
            <p>Thank you for choosing Jigz to power your freelance career!</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Congratulations! You've successfully subscribed to the ${planName} Plan on Jigz.

${monthlyCoins} coins have been added to your account and are ready to use!

Your Subscription Details:
- Plan: ${planName}
- Monthly Coins: ${monthlyCoins}
- Monthly Price: $${priceFormatted}
- Next Billing: ${nextBillingDate}

What You Can Do With Your Coins:
✓ Apply to jobs (1 coin per application)
✓ Post job listings (3 coins per post)
✓ Connect with quality freelancers and clients
✓ Access to our full marketplace features

Your coins will automatically renew each month. You can cancel anytime from your account settings.

Thank you for choosing Jigz to power your freelance career!

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `Welcome to ${planName} Plan - Jigz`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `Welcome to ${planName} Plan - Jigz`,
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Subscription welcome email sent to ${email} for ${planName} plan`);
      return true;
    } catch (error) {
      console.error('Failed to send subscription welcome email:', error);
      return false;
    }
  }

  async sendCoinPurchaseEmail(
    email: string, 
    userName: string, 
    coinsAdded: number, 
    totalPaid: number
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const priceFormatted = totalPaid.toFixed(2);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Coin Purchase Confirmation - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #10b981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .coins-box { background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .purchase-details { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .usage-tip { background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0; border-left: 4px solid #f59e0b; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>💰 Coins Added Successfully!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your coin purchase has been processed successfully!</p>
            
            <div class="coins-box">
              <h3 style="margin: 0; color: #10b981;">${coinsAdded} Coins Added!</h3>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Now available in your account</p>
            </div>

            <div class="purchase-details">
              <h3>Purchase Summary:</h3>
              <p><strong>Coins Purchased:</strong> ${coinsAdded}</p>
              <p><strong>Total Paid:</strong> $${priceFormatted}</p>
              <p><strong>Cost Per Coin:</strong> $${(totalPaid / coinsAdded).toFixed(3)}</p>
            </div>

            <div class="usage-tip">
              <h4>💡 Quick Tip:</h4>
              <p>With ${coinsAdded} coins, you can:</p>
              <ul>
                <li>Apply to ${coinsAdded} different jobs (1 coin each)</li>
                <li>Post ${Math.floor(coinsAdded / 3)} job listings (3 coins each)</li>
                <li>Or mix applications and job posts as needed</li>
              </ul>
            </div>

            <p>Your coins are now ready to use! Start applying to jobs or posting your own to connect with talented freelancers.</p>
            
            <p>Thanks for choosing Jigz!</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Your coin purchase has been processed successfully!

${coinsAdded} coins have been added to your account and are ready to use!

Purchase Summary:
- Coins Purchased: ${coinsAdded}
- Total Paid: $${priceFormatted}
- Cost Per Coin: $${(totalPaid / coinsAdded).toFixed(3)}

Quick Tip:
With ${coinsAdded} coins, you can:
• Apply to ${coinsAdded} different jobs (1 coin each)
• Post ${Math.floor(coinsAdded / 3)} job listings (3 coins each)
• Or mix applications and job posts as needed

Your coins are now ready to use! Start applying to jobs or posting your own to connect with talented freelancers.

Thanks for choosing Jigz!

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: 'Coin Purchase Confirmation - Jigz',
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: 'Coin Purchase Confirmation - Jigz',
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Coin purchase email sent to ${email} for ${coinsAdded} coins`);
      return true;
    } catch (error) {
      console.error('Failed to send coin purchase email:', error);
      return false;
    }
  }

  async sendResubscriptionEmail(
    email: string, 
    userName: string, 
    oldPlanType: string, 
    newPlanType: string, 
    monthlyCoins: number, 
    monthlyPrice: number,
    nextBillingDate: string
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const oldPlanName = oldPlanType.charAt(0).toUpperCase() + oldPlanType.slice(1);
    const newPlanName = newPlanType.charAt(0).toUpperCase() + newPlanType.slice(1);
    const priceFormatted = (monthlyPrice / 100).toFixed(2);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Updated - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #8b5cf6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .highlight { background: #f3e8ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .coins-box { background: #f0f9ff; border: 2px solid #8b5cf6; padding: 15px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>🚀 Subscription Updated!</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>Your subscription has been successfully updated to the <strong>${newPlanName} Plan</strong>!</p>
            
            <div class="coins-box">
              <h3 style="margin: 0; color: #8b5cf6;">${monthlyCoins} Coins Added!</h3>
              <p style="margin: 5px 0 0 0; color: #6b7280;">Your new monthly coin allocation</p>
            </div>

            <div class="highlight">
              <h3>Your New Subscription Details:</h3>
              <p><strong>Plan:</strong> ${newPlanName}</p>
              <p><strong>Monthly Coins:</strong> ${monthlyCoins}</p>
              <p><strong>Monthly Price:</strong> $${priceFormatted}</p>
              <p><strong>Next Billing:</strong> ${nextBillingDate}</p>
            </div>

            <h3>Plan Change Summary:</h3>
            <p>Previous Plan: <strong>${oldPlanName}</strong> → New Plan: <strong>${newPlanName}</strong></p>

            <p>Your plan has been successfully updated to better fit your needs.</p>

            <p>Your new coin allocation is now active and ready to use for job applications and posting.</p>
            
            <p>Thank you for continuing to choose Jigz!</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Your subscription has been successfully updated to the ${newPlanName} Plan!

${monthlyCoins} coins have been added to your account!

Your New Subscription Details:
- Plan: ${newPlanName}
- Monthly Coins: ${monthlyCoins}
- Monthly Price: $${priceFormatted}
- Next Billing: ${nextBillingDate}

Plan Change Summary:
Previous Plan: ${oldPlanName} → New Plan: ${newPlanName}

Your plan has been successfully updated to better fit your needs.

Your new coin allocation is now active and ready to use for job applications and posting.

Thank you for continuing to choose Jigz!

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: 'Subscription Updated - Jigz',
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: 'Subscription Updated - Jigz',
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Resubscription email sent to ${email} for ${oldPlanName} → ${newPlanName}`);
      return true;
    } catch (error) {
      console.error('Failed to send resubscription email:', error);
      return false;
    }
  }

  async sendServiceApprovalEmail(email: string, userName: string, serviceTitle: string, adminNotes?: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Approved - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .service-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .admin-notes { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>✅ Service Approved!</h1>
          </div>
          <div class="content">
            <h2>Congratulations, ${userName}!</h2>
            <p>Great news! Your service has been approved by our admin team and is now live on Jigz.</p>
            
            <div class="service-details">
              <h3>Service Details:</h3>
              <p><strong>Service Title:</strong> ${serviceTitle}</p>
              <p><strong>Status:</strong> <span style="color: #10b981; font-weight: bold;">✅ Approved</span></p>
              <p><strong>Approval Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${adminNotes ? `
            <div class="admin-notes">
              <h4>Admin Notes:</h4>
              <p>${adminNotes}</p>
            </div>
            ` : ''}
            
            <p>Your service is now visible to potential clients who can:</p>
            <ul>
              <li>✅ View your service details</li>
              <li>✅ Send you inquiries</li>
              <li>✅ Request your services</li>
              <li>✅ Leave reviews after completion</li>
            </ul>
            
            <p style="text-align: center;">
              <a href="${baseUrl}/dashboard" class="button">View Dashboard</a>
            </p>
            
            <p>Start receiving inquiries and grow your business on Jigz!</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent because your service was approved on Jigz.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Congratulations, ${userName}!

Great news! Your service has been approved by our admin team and is now live on Jigz.

Service Details:
- Service Title: ${serviceTitle}
- Status: ✅ Approved
- Approval Date: ${new Date().toLocaleDateString()}

${adminNotes ? `Admin Notes: ${adminNotes}\n\n` : ''}
Your service is now visible to potential clients who can:
- View your service details
- Send you inquiries
- Request your services
- Leave reviews after completion

Start receiving inquiries and grow your business on Jigz!

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `Service Approved - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `Service Approved - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send service approval email:', error);
      return false;
    }
  }

  async sendServiceRejectionEmail(email: string, userName: string, serviceTitle: string, adminNotes?: string): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Update - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .service-details { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #ef4444; }
          .admin-notes { background: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin: 15px 0; border-radius: 4px; }
          .next-steps { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 15px; margin: 15px 0; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>📝 Service Update Required</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We've reviewed your service and it requires some updates before it can be approved.</p>
            
            <div class="service-details">
              <h3>Service Details:</h3>
              <p><strong>Service Title:</strong> ${serviceTitle}</p>
              <p><strong>Status:</strong> <span style="color: #ef4444; font-weight: bold;">⚠️ Requires Updates</span></p>
              <p><strong>Review Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            ${adminNotes ? `
            <div class="admin-notes">
              <h4>Admin Feedback:</h4>
              <p>${adminNotes}</p>
            </div>
            ` : ''}
            
            <div class="next-steps">
              <h4>Next Steps:</h4>
              <ul>
                <li>📝 Review the admin feedback above</li>
                <li>✏️ Update your service based on the feedback</li>
                <li>🔄 Resubmit your service for review</li>
                <li>✅ Once approved, your service will be live</li>
              </ul>
            </div>
            
            <p style="text-align: center;">
              <a href="${baseUrl}/dashboard" class="button">Update Service</a>
            </p>
            
            <p>We're here to help you get your service approved. If you have any questions, please don't hesitate to contact our support team.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent because your service requires updates on Jigz.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

We've reviewed your service and it requires some updates before it can be approved.

Service Details:
- Service Title: ${serviceTitle}
- Status: ⚠️ Requires Updates
- Review Date: ${new Date().toLocaleDateString()}

${adminNotes ? `Admin Feedback: ${adminNotes}\n\n` : ''}
Next Steps:
- Review the admin feedback above
- Update your service based on the feedback
- Resubmit your service for review
- Once approved, your service will be live

We're here to help you get your service approved. If you have any questions, please don't hesitate to contact our support team.

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `Service Update Required - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `Service Update Required - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
        });
      }

      return true;
    } catch (error) {
      console.error('Failed to send service rejection email:', error);
      return false;
    }
  }

  async sendSubscriptionCancellationEmail(
    email: string, 
    userName: string, 
    planType: string, 
    cancellationDate: string
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const planName = planType.charAt(0).toUpperCase() + planType.slice(1);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Subscription Cancellation - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .button { display: inline-block; background: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1>💔 Your Subscription to ${planName} Has Been Cancelled</h1>
          </div>
          <div class="content">
            <h2>Hi ${userName},</h2>
            <p>We're sorry to see you cancel your subscription to the <strong>${planName} Plan</strong> on Jigz.</p>
            
            <div class="highlight">
              <p>Your subscription was cancelled on ${cancellationDate}.</p>
              <p>You will no longer be charged for this plan.</p>
            </div>

            <p>If you have any questions or need assistance with your account, please feel free to contact our support team.</p>
            
            <p>Best regards,<br>The Jigz Team</p>
          </div>
          <div class="footer">
            <p>This email was sent from Jigz. Questions? Contact our support team.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

We're sorry to see you cancel your subscription to the ${planName} Plan on Jigz.

CANCELLATION DETAILS:
- Plan: ${planName}
- Cancelled On: ${cancellationDate}
- Status: Cancelled

Important: You will no longer be charged for this plan.

Want to Reactivate?
You can reactivate your subscription anytime from your account settings at ${baseUrl}/dashboard

If you have any questions or need assistance with your account, please feel free to contact our support team.

We hope to see you back soon!

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: 'Subscription Cancellation - Jigz',
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: 'Subscription Cancellation - Jigz',
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Subscription cancellation email sent to ${email} for ${planName}`);
      return true;
    } catch (error) {
      console.error('Failed to send subscription cancellation email:', error);
      return false;
    }
  }

  async sendEmail(options: { to: string; subject: string; text?: string; html?: string }): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: options.to,
          from: this.fromEmail,
          subject: options.subject,
          text: options.text || '',
          html: options.html,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: options.to,
          subject: options.subject,
          text: options.text,
          html: options.html,
        });
      }
      
      console.log(`Email sent to ${options.to}`);
      return true;
    } catch (error) {
      console.error('Failed to send email:', error);
      return false;
    }
  }

  isConfigured(): boolean {
    return this.useSendGridAPI || this.transporter !== null;
  }

  async sendServiceRequestAcceptedEmail(
    email: string, 
    userName: string, 
    serviceTitle: string, 
    serviceProviderName: string
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Service Request Accepted - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #22c55e; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1 style="margin: 0; font-size: 24px;">🎉 Service Request Accepted!</h1>
          </div>
          <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Great news, ${userName}!</h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your service request has been accepted by the service provider.
            </p>
            
            <div class="highlight">
              <h3 style="color: #333; margin-top: 0;">Service Details:</h3>
              <div class="info-box">
                <p style="margin: 8px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                <p style="margin: 8px 0;"><strong>Provider:</strong> ${serviceProviderName}</p>
                <p style="margin: 8px 0;"><strong>Status:</strong> Accepted</p>
              </div>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              You can now communicate with the service provider and coordinate the work details.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/messages" class="cta-button">Go to Messages</a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888; font-size: 14px; margin: 0;">
                This email was sent because you made a service request on Jigz.<br>
                <a href="${baseUrl}" style="color: #22c55e;">Visit Jigz</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

Great news! Your service request has been accepted by the service provider.

SERVICE DETAILS:
- Service: ${serviceTitle}
- Provider: ${serviceProviderName}
- Status: Accepted

You can now communicate with the service provider and coordinate the work details.

Go to Messages: ${baseUrl}/messages

This email was sent because you made a service request on Jigz.
Visit Jigz: ${baseUrl}

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `Service Request Accepted - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `Service Request Accepted - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Service request accepted email sent to ${email} for ${serviceTitle}`);
      return true;
    } catch (error) {
      console.error('Failed to send service request accepted email:', error);
      return false;
    }
  }

  async sendServiceInquiryEmail(
    email: string, 
    userName: string, 
    serviceTitle: string, 
    inquirerName: string,
    inquiryMessage: string
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    console.log('Service inquiry email function called with:', {
      email,
      userName,
      serviceTitle,
      inquirerName,
      inquiryMessage,
      useSendGridAPI: this.useSendGridAPI,
      fromEmail: this.fromEmail
    });

    const baseUrl = this.getBaseUrl();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Service Inquiry - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #3b82f6; }
          .inquiry-box { background: #f0f9ff; border: 2px solid #3b82f6; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1 style="margin: 0; font-size: 24px;">📧 New Service Inquiry!</h1>
          </div>
          <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Hi ${userName},</h2>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              You have received a new inquiry for your service on Jigz!
            </p>
            
            <div class="highlight">
              <h3 style="color: #333; margin-top: 0;">Service Details:</h3>
              <div class="info-box">
                <p style="margin: 8px 0;"><strong>Service:</strong> ${serviceTitle}</p>
                <p style="margin: 8px 0;"><strong>Inquirer:</strong> ${inquirerName}</p>
                <p style="margin: 8px 0;"><strong>Status:</strong> New Inquiry</p>
              </div>
            </div>
            
            <div class="inquiry-box">
              <h3 style="color: #1e40af; margin-top: 0;">Inquiry Message:</h3>
              <p style="color: #555; font-style: italic; margin: 0;">"${inquiryMessage}"</p>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 25px;">
              Respond to this inquiry to start a conversation and potentially secure a new client!
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/messages" class="cta-button">Respond to Inquiry</a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888; font-size: 14px; margin: 0;">
                This email was sent because you received a service inquiry on Jigz.<br>
                <a href="${baseUrl}" style="color: #3b82f6;">Visit Jigz</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Hi ${userName},

You have received a new inquiry for your service on Jigz!

SERVICE DETAILS:
- Service: ${serviceTitle}
- Inquirer: ${inquirerName}
- Status: New Inquiry

INQUIRY MESSAGE:
"${inquiryMessage}"

Respond to this inquiry to start a conversation and potentially secure a new client!

Respond to Inquiry: ${baseUrl}/messages

This email was sent because you received a service inquiry on Jigz.
Visit Jigz: ${baseUrl}

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        console.log('Sending service inquiry email via SendGrid:', {
          to: email,
          from: this.fromEmail,
          subject: `New Service Inquiry - ${serviceTitle}`,
          baseUrl,
          htmlLength: htmlContent.length,
          textLength: textContent.length
        });
        
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `New Service Inquiry - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `New Service Inquiry - ${serviceTitle}`,
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`Service inquiry email sent to ${email} for ${serviceTitle}`);
      return true;
          } catch (error: any) {
        console.error('Failed to send service inquiry email:', error);
        if (error.response && error.response.body) {
          console.error('SendGrid error details:', error.response.body);
        }
        return false;
      }
  }

  async sendJobCompletionEmail(
    email: string, 
    userName: string, 
    jobTitle: string, 
    completionDate: string,
    isService: boolean = false
  ): Promise<boolean> {
    if (!this.useSendGridAPI && !this.transporter) {
      console.warn('Email service not initialized');
      return false;
    }

    const baseUrl = this.getBaseUrl();
    const workType = isService ? 'Service' : 'Job';
    const workTypeLower = isService ? 'service' : 'job';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${workType} Completed Successfully - Jigz</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .logo { max-width: 150px; height: auto; margin-bottom: 10px; }
          .content { background: #f8fafc; padding: 30px; border-radius: 0 0 8px 8px; }
          .cta-button { display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 25px; margin: 20px 0; font-weight: bold; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 14px; }
          .highlight { background: white; border-radius: 8px; padding: 20px; margin: 20px 0; border-left: 4px solid #10b981; }
          .success-box { background: #ecfdf5; border: 2px solid #10b981; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
          .info-box { background: #f9fafb; padding: 15px; border-radius: 8px; margin: 15px 0; border: 1px solid #e5e7eb; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <img src="${baseUrl}/attached_assets/JIGZ%20LOGO-01_1754969521380.jpg" alt="Jigz Logo" class="logo" />
            <h1 style="margin: 0; font-size: 24px;">🎉 ${workType} Completed Successfully!</h1>
          </div>
          <div class="content">
            <h2 style="color: #333; margin-bottom: 20px;">Congratulations, ${userName}!</h2>
            
            <div class="success-box">
              <h3 style="margin: 0; color: #10b981; font-size: 1.5em;">${workType} Successfully Completed!</h3>
              <p style="margin: 8px 0 0 0; color: #6b7280;">Great work on delivering quality results</p>
            </div>
            
            <div class="highlight">
              <h3 style="color: #333; margin-top: 0;">${workType} Details:</h3>
              <div class="info-box">
                <p style="margin: 8px 0;"><strong>${workType}:</strong> ${jobTitle}</p>
                <p style="margin: 8px 0;"><strong>Completion Date:</strong> ${completionDate}</p>
                <p style="margin: 8px 0;"><strong>Status:</strong> Completed</p>
              </div>
            </div>
            
            <p style="color: #555; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your ${workTypeLower} has been marked as completed. This is a great achievement!
            </p>
            
            <h3 style="color: #10b981;">What's Next?</h3>
            <ul style="color: #555; line-height: 1.8;">
              <li>✅ Rate your experience with the client/freelancer</li>
              <li>✅ Leave a review to help build reputation</li>
              <li>✅ Consider future collaborations</li>
              <li>✅ Look for new opportunities on Jigz</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/dashboard" class="cta-button">Go to Dashboard</a>
            </div>
            
            <div style="border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px; text-align: center;">
              <p style="color: #888; font-size: 14px; margin: 0;">
                This email was sent because your ${workTypeLower} was completed on Jigz.<br>
                <a href="${baseUrl}" style="color: #10b981;">Visit Jigz</a>
              </p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const textContent = `
Congratulations, ${userName}!

Your ${workTypeLower} has been completed successfully!

${workType} DETAILS:
- ${workType}: ${jobTitle}
- Completion Date: ${completionDate}
- Status: Completed

What's Next?
✓ Rate your experience with the client/freelancer
✓ Leave a review to help build reputation
✓ Consider future collaborations
✓ Look for new opportunities on Jigz

Go to Dashboard: ${baseUrl}/dashboard

This email was sent because your ${workTypeLower} was completed on Jigz.
Visit Jigz: ${baseUrl}

Best regards,
The Jigz Team
    `;

    try {
      if (this.useSendGridAPI) {
        await sgMail.send({
          to: email,
          from: this.fromEmail,
          subject: `${workType} Completed Successfully - ${jobTitle}`,
          text: textContent,
          html: htmlContent,
          trackingSettings: {
            clickTracking: { enable: false },
            openTracking: { enable: false },
            subscriptionTracking: { enable: false },
            ganalytics: { enable: false }
          }
        });
      } else {
        await this.transporter!.sendMail({
          from: `"Jigz" <${this.fromEmail}>`,
          to: email,
          subject: `${workType} Completed Successfully - ${jobTitle}`,
          text: textContent,
          html: htmlContent,
        });
      }
      
      console.log(`${workType} completion email sent to ${email} for ${jobTitle}`);
      return true;
    } catch (error) {
      console.error(`Failed to send ${workTypeLower} completion email:`, error);
      return false;
    }
  }
}

// Utility functions
export function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function getTokenExpiration(): Date {
  const expiration = new Date();
  expiration.setHours(expiration.getHours() + 24); // 24 hours from now
  return expiration;
}

// Export singleton instance
export const emailService = new EmailService();