// services/googleDrive.service.ts
import { google } from 'googleapis';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Google Drive Service for uploading and managing application documents
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com/)
 * 2. Create a new project or select existing one
 * 3. Enable Google Drive API
 * 4. Create Service Account credentials
 * 5. Download the JSON key file
 * 6. Save it as 'google-drive-credentials.json' in the back-end folder
 * 7. Share a Google Drive folder with the service account email
 * 8. Set GOOGLE_DRIVE_FOLDER_ID in your .env file
 */

class GoogleDriveService {
  private drive: any;
  private folderId: string;

  constructor() {
    this.folderId = process.env.GOOGLE_DRIVE_FOLDER_ID || '';
    
    // Google Drive is disabled - using local storage instead
    console.log('� [STORAGE] Using local file storage (Google Drive disabled)');
    console.log('� [STORAGE] Files will be stored in: tmp-uploads/');
    
    // Don't initialize Google Drive
    this.drive = null;
  }

  /**
   * Upload a file to Google Drive
   * @param file - The file buffer or readable stream
   * @param fileName - Name for the file
   * @param mimeType - MIME type of the file
   * @returns Object containing file ID and web view link
   */
  async uploadFile(file: any, fileName: string, mimeType: string) {
    if (!this.drive) {
      throw new Error('Google Drive is not configured. Please check credentials.');
    }

    try {
      const fileMetadata = {
        name: fileName,
        parents: this.folderId ? [this.folderId] : [],
      };

      // Try with supportsAllDrives first (for Shared Drives)
      // If that fails, try without it (for regular folders shared with service account)
      let response;
      try {
        const media = {
          mimeType: mimeType,
          body: fs.createReadStream(file.path), // Create fresh stream
        };
        
        response = await this.drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true, // For Shared Drives
        });
      } catch (error: any) {
        console.log('⚠️ Shared Drive upload failed, trying regular folder...');
        
        // Create a NEW stream for the second attempt
        const media = {
          mimeType: mimeType,
          body: fs.createReadStream(file.path), // Fresh stream!
        };
        
        response = await this.drive.files.create({
          requestBody: fileMetadata,
          media: media,
          fields: 'id, name, webViewLink, webContentLink',
          // No supportsAllDrives for regular folders
        });
      }

      // Set file permissions to allow anyone with link to view
      try {
        await this.drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
          supportsAllDrives: true, // For Shared Drives
        });
      } catch (error) {
        // Fallback for regular folders
        await this.drive.permissions.create({
          fileId: response.data.id,
          requestBody: {
            role: 'reader',
            type: 'anyone',
          },
        });
      }

      // Get the updated file with permissions
      let file_data;
      try {
        file_data = await this.drive.files.get({
          fileId: response.data.id,
          fields: 'id, name, webViewLink, webContentLink',
          supportsAllDrives: true, // For Shared Drives
        });
      } catch (error) {
        // Fallback for regular folders
        file_data = await this.drive.files.get({
          fileId: response.data.id,
          fields: 'id, name, webViewLink, webContentLink',
        });
      }

      return {
        fileId: file_data.data.id,
        fileName: file_data.data.name,
        webViewLink: file_data.data.webViewLink,
        webContentLink: file_data.data.webContentLink,
      };
    } catch (error: any) {
      console.error('Error uploading file to Google Drive:', error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  /**
   * Upload multiple files to Google Drive
   * @param files - Array of file objects from multer
   * @returns Array of file metadata objects
   */
  async uploadMultipleFiles(files: any[]) {
    if (!this.drive) {
      throw new Error('Google Drive is not configured. Please check credentials.');
    }

    const uploadPromises = files.map(file => 
      this.uploadFile(file, file.originalname, file.mimetype)
    );

    return await Promise.all(uploadPromises);
  }

  /**
   * Delete a file from Google Drive
   * @param fileId - The Google Drive file ID
   */
  async deleteFile(fileId: string) {
    if (!this.drive) {
      throw new Error('Google Drive is not configured. Please check credentials.');
    }

    try {
      await this.drive.files.delete({
        fileId: fileId,
        supportsAllDrives: true, // Required for Shared Drives
      });
      return { success: true, message: 'File deleted successfully' };
    } catch (error: any) {
      console.error('Error deleting file from Google Drive:', error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  /**
   * Get file metadata
   * @param fileId - The Google Drive file ID
   */
  async getFileMetadata(fileId: string) {
    if (!this.drive) {
      throw new Error('Google Drive is not configured. Please check credentials.');
    }

    try {
      const response = await this.drive.files.get({
        fileId: fileId,
        fields: 'id, name, mimeType, size, createdTime, webViewLink, webContentLink',
        supportsAllDrives: true, // Required for Shared Drives
      });

      return response.data;
    } catch (error: any) {
      console.error('Error getting file metadata from Google Drive:', error);
      throw new Error(`Failed to get file metadata: ${error.message}`);
    }
  }

  /**
   * Check if Google Drive is properly configured
   */
  isConfigured(): boolean {
    return !!this.drive;
  }
}

export default new GoogleDriveService();
