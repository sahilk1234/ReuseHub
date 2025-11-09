import { ConfigLoader } from '../ConfigLoader';

describe('ConfigLoader', () => {
  beforeEach(() => {
    // Clear environment variables
    delete process.env.NODE_ENV;
    delete process.env.PORT;
    delete process.env.DATABASE_TYPE;
  });

  it('should load default configuration', () => {
    const config = ConfigLoader.load();
    
    expect(config).toBeDefined();
    expect(config.port).toBe(3000);
    expect(config.nodeEnv).toBe('development');
    expect(config.database.type).toBe('postgresql');
    expect(config.storage.provider).toBe('local');
    expect(config.auth.provider).toBe('custom');
    expect(config.ai.provider).toBe('openai');
    expect(config.maps.provider).toBe('google');
    expect(config.notification.provider).toBe('sendgrid');
  });

  it('should load configuration from environment variables', () => {
    process.env.NODE_ENV = 'production';
    process.env.PORT = '8080';
    process.env.DATABASE_TYPE = 'mysql';
    process.env.STORAGE_PROVIDER = 'aws-s3';
    
    const config = ConfigLoader.load();
    
    expect(config.nodeEnv).toBe('production');
    expect(config.port).toBe(8080);
    expect(config.database.type).toBe('mysql');
    expect(config.storage.provider).toBe('aws-s3');
  });

  it('should configure CORS settings', () => {
    const config = ConfigLoader.load();
    
    expect(config.cors).toBeDefined();
    expect(config.cors.origin).toEqual(['http://localhost:3000']);
    expect(config.cors.credentials).toBe(false);
  });

  it('should configure rate limiting', () => {
    const config = ConfigLoader.load();
    
    expect(config.rateLimit).toBeDefined();
    expect(config.rateLimit.windowMs).toBe(900000); // 15 minutes
    expect(config.rateLimit.max).toBe(100);
  });
});