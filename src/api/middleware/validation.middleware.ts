import { Request, Response, NextFunction } from 'express';
import { ValidationError } from '../errors/AppError';
import { ValidationHelper } from '../errors/ValidationHelper';

/**
 * Validation middleware factory
 * Creates middleware that validates request data against a schema
 */
export function validateRequest(schema: {
  body?: (data: any) => void;
  query?: (data: any) => void;
  params?: (data: any) => void;
}) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Validate body
      if (schema.body && req.body) {
        schema.body(req.body);
      }

      // Validate query parameters
      if (schema.query && req.query) {
        schema.query(req.query);
      }

      // Validate URL parameters
      if (schema.params && req.params) {
        schema.params(req.params);
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Helper function to validate request body
 * Supports both validator functions and class-validator DTOs
 */
export function validateBody(validator: ((data: any) => void) | any) {
  // If validator is a function, use it directly
  if (typeof validator === 'function' && validator.prototype === undefined) {
    return validateRequest({ body: validator });
  }
  
  // If validator is a class (DTO), create a validator function
  // For now, just pass through - class-validator integration would go here
  return validateRequest({ 
    body: (data) => {
      // Basic validation - in a full implementation, you'd use class-validator here
      ValidationHelper.validateRequired(data, Object.keys(data));
    }
  });
}

/**
 * Helper function to validate query parameters
 */
export function validateQuery(validator: ((data: any) => void) | any) {
  if (typeof validator === 'function' && validator.prototype === undefined) {
    return validateRequest({ query: validator });
  }
  
  return validateRequest({ 
    query: (data) => {
      ValidationHelper.validateRequired(data, Object.keys(data));
    }
  });
}

/**
 * Helper function to validate URL parameters
 */
export function validateParams(validator: ((data: any) => void) | any) {
  if (typeof validator === 'function' && validator.prototype === undefined) {
    return validateRequest({ params: validator });
  }
  
  return validateRequest({ 
    params: (data) => {
      ValidationHelper.validateRequired(data, Object.keys(data));
    }
  });
}

/**
 * Validate item creation request
 */
export const validateCreateItem = validateRequest({
  body: (data) => {
    ValidationHelper.validateRequired(data, ['title', 'description', 'condition', 'location']);
    ValidationHelper.validateLength(data.title, 'title', 3, 100);
    ValidationHelper.validateLength(data.description, 'description', 10, 2000);
    ValidationHelper.validateEnum(
      data.condition,
      'condition',
      ['new', 'like-new', 'good', 'fair', 'poor']
    );

    if (data.location) {
      ValidationHelper.validateRequired(data.location, ['latitude', 'longitude', 'address']);
      ValidationHelper.validateCoordinates(data.location.latitude, data.location.longitude);
    }

    if (data.dimensions) {
      if (data.dimensions.length) ValidationHelper.validateRange(data.dimensions.length, 'length', 0);
      if (data.dimensions.width) ValidationHelper.validateRange(data.dimensions.width, 'width', 0);
      if (data.dimensions.height) ValidationHelper.validateRange(data.dimensions.height, 'height', 0);
      if (data.dimensions.weight) ValidationHelper.validateRange(data.dimensions.weight, 'weight', 0);
    }
  }
});

/**
 * Validate item update request
 */
export const validateUpdateItem = validateRequest({
  body: (data) => {
    if (data.title) {
      ValidationHelper.validateLength(data.title, 'title', 3, 100);
    }
    if (data.description) {
      ValidationHelper.validateLength(data.description, 'description', 10, 2000);
    }
    if (data.condition) {
      ValidationHelper.validateEnum(
        data.condition,
        'condition',
        ['new', 'like-new', 'good', 'fair', 'poor']
      );
    }
  }
});

/**
 * Validate search query
 */
export const validateSearchItems = validateRequest({
  query: (data) => {
    if (data.maxDistance) {
      const distance = parseInt(data.maxDistance as string);
      ValidationHelper.validateRange(distance, 'maxDistance', 0, 1000);
    }
    if (data.limit) {
      const limit = parseInt(data.limit as string);
      ValidationHelper.validateRange(limit, 'limit', 1, 100);
    }
    if (data.offset) {
      const offset = parseInt(data.offset as string);
      ValidationHelper.validateRange(offset, 'offset', 0);
    }
  }
});

/**
 * Validate user registration
 */
export const validateUserRegistration = validateRequest({
  body: (data) => {
    ValidationHelper.validateRequired(data, ['email', 'displayName', 'location']);
    ValidationHelper.validateEmail(data.email);
    ValidationHelper.validateLength(data.displayName, 'displayName', 2, 50);
    
    if (data.phone) {
      ValidationHelper.validatePhone(data.phone);
    }

    if (data.location) {
      ValidationHelper.validateRequired(data.location, ['latitude', 'longitude', 'address']);
      ValidationHelper.validateCoordinates(data.location.latitude, data.location.longitude);
    }

    if (data.accountType) {
      ValidationHelper.validateEnum(
        data.accountType,
        'accountType',
        ['individual', 'organization']
      );
    }
  }
});

/**
 * Validate exchange creation
 */
export const validateCreateExchange = validateRequest({
  body: (data) => {
    ValidationHelper.validateRequired(data, ['itemId']);
    
    if (data.scheduledPickup) {
      ValidationHelper.validateDate(data.scheduledPickup, 'scheduledPickup');
    }
  }
});

/**
 * Validate rating submission
 */
export const validateRating = validateRequest({
  body: (data) => {
    ValidationHelper.validateRequired(data, ['rating']);
    ValidationHelper.validateRange(data.rating, 'rating', 1, 5);
    
    if (data.review) {
      ValidationHelper.validateLength(data.review, 'review', 0, 500);
    }
  }
});

/**
 * Validate file upload
 */
export function validateFileUpload(
  maxSizeInMB: number = 5,
  allowedTypes: string[] = ['image/jpeg', 'image/png', 'image/webp']
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      if (!req.files || (Array.isArray(req.files) && req.files.length === 0)) {
        throw new ValidationError('At least one file is required');
      }

      const files = Array.isArray(req.files) ? req.files : [req.files];

      for (const file of files) {
        if ('size' in file && typeof file.size === 'number') {
          ValidationHelper.validateFileSize(file.size, maxSizeInMB);
        }
        if ('mimetype' in file && typeof file.mimetype === 'string') {
          ValidationHelper.validateFileType(file.mimetype, allowedTypes);
        }
      }

      next();
    } catch (error) {
      next(error);
    }
  };
}

/**
 * Sanitize request body to prevent XSS
 */
export function sanitizeRequestBody(req: Request, res: Response, next: NextFunction): void {
  if (req.body && typeof req.body === 'object') {
    sanitizeObject(req.body);
  }
  next();
}

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): void {
  for (const key in obj) {
    if (typeof obj[key] === 'string') {
      obj[key] = ValidationHelper.sanitizeString(obj[key]);
    } else if (typeof obj[key] === 'object' && obj[key] !== null) {
      sanitizeObject(obj[key]);
    }
  }
}
