// Minimal Cloudinary type declarations
declare module 'cloudinary' {
  import type { Readable } from 'stream';
  interface UploadResult {
    secure_url: string;
    resource_type?: string;
    public_id: string;
  }
  type UploadCallback = (error: any, result?: UploadResult) => void;
  export const v2: {
    config: (opts: any) => void;
    uploader: {
      upload: (filePath: string, options?: any) => Promise<UploadResult>;
      upload_stream: (options: any, cb: UploadCallback) => Readable;
    };
  };
}
