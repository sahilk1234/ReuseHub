export interface DatabaseConfig {
  type: 'postgresql' | 'mysql' | 'firestore';
  connection: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
}

export interface StorageConfig {
  provider: 'aws-s3' | 'gcs' | 'local';
  config: Record<string, any>;
}

export interface AuthConfig {
  provider: 'auth0' | 'okta' | 'firebase' | 'custom';
  config: Record<string, any>;
}

export interface AIConfig {
  provider: 'openai' | 'google' | 'azure';
  config: Record<string, any>;
}

export interface MapsConfig {
  provider: 'google' | 'mapbox' | 'osm';
  config: Record<string, any>;
}

export interface NotificationConfig {
  provider: 'sendgrid' | 'ses' | 'mailgun';
  config: Record<string, any>;
}

export interface AppConfig {
  port: number;
  nodeEnv: string;
  database: DatabaseConfig;
  storage: StorageConfig;
  auth: AuthConfig;
  ai: AIConfig;
  maps: MapsConfig;
  notification: NotificationConfig;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  rateLimit: {
    windowMs: number;
    max: number;
  };
}