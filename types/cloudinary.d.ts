// Minimal Cloudinary type declarations
declare module 'cloudinary' {
  export const v2: {
    config: (opts: any) => void;
    uploader: {
      upload: (filePath: string, options?: any) => Promise<{ secure_url: string }>; 
    };
  };
}
