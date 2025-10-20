// controllers/upload.controller.ts
// Universal upload controller using Cloudinary
import { Request, Response } from 'express';
import fs from 'fs/promises';
import path from 'path';
import cloudinary from '../config/cloudinary';

// Core reusable function
export async function uploadFile(filePath: string, folder: string = 'general'): Promise<string> {
  try {
    const result = await cloudinary.uploader.upload(filePath, {
      folder,
      resource_type: 'auto'
    });
    return result.secure_url;
  } finally {
    // Always attempt to remove temp file
    try { await fs.unlink(filePath); } catch { /* ignore */ }
  }
}

// Express handler
export async function handleUpload(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const folder = (req.body.folder as string) || 'general';
    const tempPath = req.file.path; // multer disk storage provides path

    const url = await uploadFile(tempPath, folder);
    res.json({ success: true, url });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
}
