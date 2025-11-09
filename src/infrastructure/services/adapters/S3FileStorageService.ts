import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { IFileStorageService } from '../IFileStorageService';

export interface S3Config {
  region: string;
  bucketName: string;
  accessKeyId: string;
  secretAccessKey: string;
  endpoint?: string; // For S3-compatible services like MinIO
}

export class S3FileStorageService implements IFileStorageService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor(private config: S3Config) {
    this.bucketName = config.bucketName;
    this.s3Client = new S3Client({
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      endpoint: config.endpoint,
      forcePathStyle: !!config.endpoint, // Required for MinIO and other S3-compatible services
    });
  }

  async uploadFile(file: Buffer, path: string, contentType: string): Promise<string> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: path,
        Body: file,
        ContentType: contentType,
        ACL: 'public-read', // Make files publicly accessible
      });

      await this.s3Client.send(command);
      
      // Return the public URL
      return this.getPublicUrl(path);
    } catch (error) {
      throw new Error(`Failed to upload file to S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3Client.send(command);
    } catch (error) {
      throw new Error(`Failed to delete file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getFileUrl(path: string): Promise<string> {
    return this.getPublicUrl(path);
  }

  async fileExists(path: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: path,
      });

      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getPublicUrl(path: string): string {
    if (this.config.endpoint) {
      // For S3-compatible services
      return `${this.config.endpoint}/${this.bucketName}/${path}`;
    }
    // For AWS S3
    return `https://${this.bucketName}.s3.${this.config.region}.amazonaws.com/${path}`;
  }
}