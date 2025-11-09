import sgMail from '@sendgrid/mail';
import {
  INotificationService,
  EmailTemplate,
  NotificationResult,
  EmailAttachment,
} from '../INotificationService';

export interface SendGridConfig {
  apiKey: string;
  fromEmail: string;
  fromName?: string;
  replyToEmail?: string;
}

export class SendGridNotificationService implements INotificationService {
  private templates: Map<string, EmailTemplate> = new Map();

  constructor(private config: SendGridConfig) {
    sgMail.setApiKey(config.apiKey);
    this.initializeDefaultTemplates();
  }

  async sendEmail(
    to: string,
    subject: string,
    body: string,
    isHtml: boolean = true,
    attachments?: EmailAttachment[]
  ): Promise<NotificationResult> {
    try {
      const msg: any = {
        to,
        from: {
          email: this.config.fromEmail,
          name: this.config.fromName || 'Re:UseNet',
        },
        subject,
        replyTo: this.config.replyToEmail,
      };

      if (isHtml) {
        msg.html = body;
        // Generate text version from HTML (basic conversion)
        msg.text = body.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
      } else {
        msg.text = body;
      }

      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map(att => ({
          filename: att.filename,
          content: Buffer.isBuffer(att.content) ? att.content.toString('base64') : att.content,
          type: att.contentType,
          disposition: 'attachment',
        }));
      }

      const response = await sgMail.send(msg);
      
      return {
        success: true,
        messageId: response[0]?.headers?.['x-message-id'] || 'unknown',
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to send email',
      };
    }
  }

  async sendEmailFromTemplate(
    to: string,
    templateName: string,
    templateData: Record<string, any>
  ): Promise<NotificationResult> {
    const template = this.templates.get(templateName);
    if (!template) {
      return {
        success: false,
        error: `Template '${templateName}' not found`,
      };
    }

    // Simple template variable replacement
    let subject = template.subject;
    let htmlBody = template.htmlBody;
    let textBody = template.textBody || '';

    for (const [key, value] of Object.entries(templateData)) {
      const placeholder = `{{${key}}}`;
      subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
      htmlBody = htmlBody.replace(new RegExp(placeholder, 'g'), String(value));
      if (textBody) {
        textBody = textBody.replace(new RegExp(placeholder, 'g'), String(value));
      }
    }

    return this.sendEmail(to, subject, htmlBody, true);
  }

  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<NotificationResult> {
    // Placeholder implementation - would integrate with push notification service
    // For now, we'll just log the notification
    console.log(`Push notification for user ${userId}: ${title} - ${message}`, data);
    
    return {
      success: true,
      messageId: `push_${Date.now()}`,
    };
  }

  async sendBulkEmails(
    recipients: string[],
    subject: string,
    body: string,
    isHtml: boolean = true
  ): Promise<NotificationResult[]> {
    const results: NotificationResult[] = [];
    
    // SendGrid supports bulk sending, but for simplicity, we'll send individually
    // In production, you might want to use SendGrid's batch sending features
    for (const recipient of recipients) {
      const result = await this.sendEmail(recipient, subject, body, isHtml);
      results.push(result);
      
      // Add small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return results;
  }

  registerTemplate(templateName: string, template: EmailTemplate): void {
    this.templates.set(templateName, template);
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Test the API key by attempting to get account details
      // Note: SendGrid doesn't have a simple ping endpoint, so we'll just validate the API key format
      return this.config.apiKey.startsWith('SG.') && this.config.apiKey.length > 20;
    } catch {
      return false;
    }
  }

  private initializeDefaultTemplates(): void {
    // Welcome email template
    this.registerTemplate('welcome', {
      subject: 'Welcome to Re:UseNet!',
      htmlBody: `
        <h1>Welcome to Re:UseNet, {{userName}}!</h1>
        <p>Thank you for joining our community-based waste exchange network.</p>
        <p>You can now:</p>
        <ul>
          <li>Post items you no longer need</li>
          <li>Search for items you want</li>
          <li>Connect with your local community</li>
          <li>Earn eco-points for your contributions</li>
        </ul>
        <p>Get started by <a href="{{appUrl}}/items/create">posting your first item</a>!</p>
        <p>Happy reusing!</p>
        <p>The Re:UseNet Team</p>
      `,
      textBody: `
        Welcome to Re:UseNet, {{userName}}!
        
        Thank you for joining our community-based waste exchange network.
        
        You can now:
        - Post items you no longer need
        - Search for items you want
        - Connect with your local community
        - Earn eco-points for your contributions
        
        Get started by visiting {{appUrl}}/items/create to post your first item!
        
        Happy reusing!
        The Re:UseNet Team
      `,
    });

    // Item interest notification
    this.registerTemplate('item_interest', {
      subject: 'Someone is interested in your item: {{itemTitle}}',
      htmlBody: `
        <h1>Great news, {{ownerName}}!</h1>
        <p><strong>{{interestedUserName}}</strong> is interested in your item: <strong>{{itemTitle}}</strong></p>
        <p>Item details:</p>
        <ul>
          <li>Title: {{itemTitle}}</li>
          <li>Category: {{itemCategory}}</li>
          <li>Posted: {{postedDate}}</li>
        </ul>
        <p>You can <a href="{{itemUrl}}">view the item</a> and contact {{interestedUserName}} to arrange the exchange.</p>
        <p>Contact information:</p>
        <ul>
          <li>Email: {{interestedUserEmail}}</li>
          <li>Rating: {{interestedUserRating}}/5 stars</li>
        </ul>
        <p>Happy exchanging!</p>
        <p>The Re:UseNet Team</p>
      `,
    });

    // Exchange completed notification
    this.registerTemplate('exchange_completed', {
      subject: 'Exchange completed: {{itemTitle}}',
      htmlBody: `
        <h1>Exchange Completed!</h1>
        <p>Congratulations! Your exchange of <strong>{{itemTitle}}</strong> has been completed.</p>
        <p>Exchange details:</p>
        <ul>
          <li>Item: {{itemTitle}}</li>
          <li>{{giverName}} gave to {{receiverName}}</li>
          <li>Completed: {{completedDate}}</li>
          <li>Eco-points awarded: {{ecoPointsAwarded}}</li>
        </ul>
        <p>Don't forget to <a href="{{ratingUrl}}">rate your exchange partner</a> to help build trust in our community.</p>
        <p>Thank you for contributing to a more sustainable future!</p>
        <p>The Re:UseNet Team</p>
      `,
    });

    // New item match notification
    this.registerTemplate('item_match', {
      subject: 'New item matches your interests: {{itemTitle}}',
      htmlBody: `
        <h1>We found something for you, {{userName}}!</h1>
        <p>A new item has been posted that matches your interests: <strong>{{itemTitle}}</strong></p>
        <p>Item details:</p>
        <ul>
          <li>Title: {{itemTitle}}</li>
          <li>Category: {{itemCategory}}</li>
          <li>Condition: {{itemCondition}}</li>
          <li>Distance: {{distance}} away</li>
          <li>Posted by: {{ownerName}} ({{ownerRating}}/5 stars)</li>
        </ul>
        <p><a href="{{itemUrl}}">View the item</a> and express your interest!</p>
        <p>Happy hunting!</p>
        <p>The Re:UseNet Team</p>
      `,
    });

    // Password reset template
    this.registerTemplate('password_reset', {
      subject: 'Reset your Re:UseNet password',
      htmlBody: `
        <h1>Password Reset Request</h1>
        <p>Hi {{userName}},</p>
        <p>We received a request to reset your password for your Re:UseNet account.</p>
        <p><a href="{{resetUrl}}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a></p>
        <p>This link will expire in 24 hours.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>The Re:UseNet Team</p>
      `,
    });
  }
}