export interface EmailTemplate {
  subject: string;
  htmlBody: string;
  textBody?: string;
}

export interface NotificationResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer | string;
  contentType: string;
}

export interface INotificationService {
  /**
   * Send an email notification
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param body - Email body (HTML or text)
   * @param isHtml - Whether the body is HTML (default: true)
   * @param attachments - Optional email attachments
   * @returns Promise resolving to notification result
   */
  sendEmail(
    to: string,
    subject: string,
    body: string,
    isHtml?: boolean,
    attachments?: EmailAttachment[]
  ): Promise<NotificationResult>;

  /**
   * Send an email using a template
   * @param to - Recipient email address
   * @param templateName - Name of the template to use
   * @param templateData - Data to populate the template
   * @returns Promise resolving to notification result
   */
  sendEmailFromTemplate(
    to: string,
    templateName: string,
    templateData: Record<string, any>
  ): Promise<NotificationResult>;

  /**
   * Send a push notification (placeholder for future implementation)
   * @param userId - User ID to send notification to
   * @param title - Notification title
   * @param message - Notification message
   * @param data - Optional additional data
   * @returns Promise resolving to notification result
   */
  sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, any>
  ): Promise<NotificationResult>;

  /**
   * Send bulk emails
   * @param recipients - Array of recipient email addresses
   * @param subject - Email subject
   * @param body - Email body
   * @param isHtml - Whether the body is HTML (default: true)
   * @returns Promise resolving to array of notification results
   */
  sendBulkEmails(
    recipients: string[],
    subject: string,
    body: string,
    isHtml?: boolean
  ): Promise<NotificationResult[]>;

  /**
   * Register an email template
   * @param templateName - Name of the template
   * @param template - Template configuration
   */
  registerTemplate(templateName: string, template: EmailTemplate): void;

  /**
   * Check if the notification service is available
   * @returns Promise resolving to true if service is available
   */
  isAvailable(): Promise<boolean>;
}