export interface IFileStorageService {
  /**
   * Upload a file to the storage service
   * @param file - The file buffer to upload
   * @param path - The path where the file should be stored
   * @param contentType - The MIME type of the file
   * @returns Promise resolving to the public URL of the uploaded file
   */
  uploadFile(file: Buffer, path: string, contentType: string): Promise<string>;

  /**
   * Delete a file from the storage service
   * @param path - The path of the file to delete
   * @returns Promise that resolves when the file is deleted
   */
  deleteFile(path: string): Promise<void>;

  /**
   * Get the public URL for a file
   * @param path - The path of the file
   * @returns Promise resolving to the public URL of the file
   */
  getFileUrl(path: string): Promise<string>;

  /**
   * Check if a file exists in the storage service
   * @param path - The path of the file to check
   * @returns Promise resolving to true if the file exists, false otherwise
   */
  fileExists(path: string): Promise<boolean>;
}