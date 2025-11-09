import { ValidationError } from './AppError';

/**
 * Validation helper for common validation patterns
 */
export class ValidationHelper {
  /**
   * Validate required fields
   */
  static validateRequired(data: any, fields: string[]): void {
    const missing: string[] = [];
    
    for (const field of fields) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      throw new ValidationError(
        `Missing required fields: ${missing.join(', ')}`,
        { missingFields: missing }
      );
    }
  }

  /**
   * Validate email format
   */
  static validateEmail(email: string): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new ValidationError('Invalid email format', { field: 'email' });
    }
  }

  /**
   * Validate string length
   */
  static validateLength(
    value: string,
    field: string,
    min?: number,
    max?: number
  ): void {
    if (min !== undefined && value.length < min) {
      throw new ValidationError(
        `${field} must be at least ${min} characters`,
        { field, minLength: min, actualLength: value.length }
      );
    }
    if (max !== undefined && value.length > max) {
      throw new ValidationError(
        `${field} must not exceed ${max} characters`,
        { field, maxLength: max, actualLength: value.length }
      );
    }
  }

  /**
   * Validate numeric range
   */
  static validateRange(
    value: number,
    field: string,
    min?: number,
    max?: number
  ): void {
    if (min !== undefined && value < min) {
      throw new ValidationError(
        `${field} must be at least ${min}`,
        { field, min, value }
      );
    }
    if (max !== undefined && value > max) {
      throw new ValidationError(
        `${field} must not exceed ${max}`,
        { field, max, value }
      );
    }
  }

  /**
   * Validate enum value
   */
  static validateEnum<T>(
    value: T,
    field: string,
    allowedValues: T[]
  ): void {
    if (!allowedValues.includes(value)) {
      throw new ValidationError(
        `${field} must be one of: ${allowedValues.join(', ')}`,
        { field, allowedValues, value }
      );
    }
  }

  /**
   * Validate array
   */
  static validateArray(
    value: any,
    field: string,
    minLength?: number,
    maxLength?: number
  ): void {
    if (!Array.isArray(value)) {
      throw new ValidationError(`${field} must be an array`, { field });
    }

    if (minLength !== undefined && value.length < minLength) {
      throw new ValidationError(
        `${field} must contain at least ${minLength} items`,
        { field, minLength, actualLength: value.length }
      );
    }

    if (maxLength !== undefined && value.length > maxLength) {
      throw new ValidationError(
        `${field} must not contain more than ${maxLength} items`,
        { field, maxLength, actualLength: value.length }
      );
    }
  }

  /**
   * Validate coordinates
   */
  static validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new ValidationError(
        'Latitude must be between -90 and 90',
        { latitude }
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw new ValidationError(
        'Longitude must be between -180 and 180',
        { longitude }
      );
    }
  }

  /**
   * Validate URL format
   */
  static validateUrl(url: string, field: string = 'url'): void {
    try {
      new URL(url);
    } catch {
      throw new ValidationError(`Invalid ${field} format`, { field, url });
    }
  }

  /**
   * Validate phone number (basic validation)
   */
  static validatePhone(phone: string): void {
    const phoneRegex = /^\+?[\d\s\-()]+$/;
    if (!phoneRegex.test(phone) || phone.replace(/\D/g, '').length < 10) {
      throw new ValidationError('Invalid phone number format', { field: 'phone' });
    }
  }

  /**
   * Validate date
   */
  static validateDate(date: any, field: string): void {
    const dateObj = new Date(date);
    if (isNaN(dateObj.getTime())) {
      throw new ValidationError(`Invalid ${field} format`, { field, value: date });
    }
  }

  /**
   * Validate file size
   */
  static validateFileSize(sizeInBytes: number, maxSizeInMB: number): void {
    const maxSizeInBytes = maxSizeInMB * 1024 * 1024;
    if (sizeInBytes > maxSizeInBytes) {
      throw new ValidationError(
        `File size must not exceed ${maxSizeInMB}MB`,
        { maxSizeInMB, actualSizeInMB: (sizeInBytes / 1024 / 1024).toFixed(2) }
      );
    }
  }

  /**
   * Validate file type
   */
  static validateFileType(
    contentType: string,
    allowedTypes: string[]
  ): void {
    if (!allowedTypes.includes(contentType)) {
      throw new ValidationError(
        `File type must be one of: ${allowedTypes.join(', ')}`,
        { allowedTypes, actualType: contentType }
      );
    }
  }

  /**
   * Sanitize string input (basic XSS prevention)
   */
  static sanitizeString(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove < and >
      .trim();
  }

  /**
   * Validate pagination parameters
   */
  static validatePagination(limit?: number, offset?: number): { limit: number; offset: number } {
    const validatedLimit = limit !== undefined ? Math.min(Math.max(1, limit), 100) : 20;
    const validatedOffset = offset !== undefined ? Math.max(0, offset) : 0;

    return { limit: validatedLimit, offset: validatedOffset };
  }
}
