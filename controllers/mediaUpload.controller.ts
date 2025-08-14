// controllers/mediaUpload.controller.ts
// Handles local file storage + DB record creation for media_uploads table
import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { PrismaClient } from '../prisma/generated/client';
import { Pool } from 'pg';

const prisma = new PrismaClient();
// Fallback pool for raw SQL before Prisma client is regenerated to include media_uploads model
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Allowed MIME types
const ALLOWED_TYPES = ['image/jpeg','image/png','image/jpg','video/mp4','application/pdf'];
const MAX_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

export const handleMediaUpload = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser: any = (req as any).user;
    if (!authUser?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file provided' });
      return;
    }

    const { mimetype, size, originalname, filename, path: storedPath } = req.file as any;

    if (!ALLOWED_TYPES.includes(mimetype)) {
      // Delete file if stored
      try { fs.unlinkSync(storedPath); } catch {}
      res.status(400).json({ success: false, message: 'Unsupported file type' });
      return;
    }

    if (size > MAX_SIZE_BYTES) {
      try { fs.unlinkSync(storedPath); } catch {}
      res.status(400).json({ success: false, message: 'File exceeds 5MB limit' });
      return;
    }

    // Normalize path for DB (relative from project root)
    const relativePath = path.relative(process.cwd(), storedPath).replace(/\\/g,'/');

    let record: any;
    if ((prisma as any).media_uploads) {
      record = await (prisma as any).media_uploads.create({
        data: {
          user_id: authUser.userId,
            file_name: originalname,
            file_path: '/' + relativePath,
            file_type: mimetype,
            file_size: size
        }
      });
    } else {
      // Raw SQL fallback until prisma generate executed
      const insertSql = `INSERT INTO media_uploads (user_id, file_name, file_path, file_type, file_size) VALUES ($1,$2,$3,$4,$5) RETURNING *`;
      const result = await pool.query(insertSql, [authUser.userId, originalname, '/' + relativePath, mimetype, size]);
      record = result.rows[0];
    }

    res.json({ success: true, file: record });
  } catch (err: any) {
    console.error('Media upload error:', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
};

export const listUserMedia = async (req: Request, res: Response): Promise<void> => {
  try {
    const authUser: any = (req as any).user;
    if (!authUser?.userId) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    let files: any[] = [];
    if ((prisma as any).media_uploads) {
      files = await (prisma as any).media_uploads.findMany({
        where: { user_id: authUser.userId },
        orderBy: { created_at: 'desc' }
      });
    } else {
      const result = await pool.query('SELECT * FROM media_uploads WHERE user_id = $1 ORDER BY created_at DESC', [authUser.userId]);
      files = result.rows;
    }

    res.json({ success: true, files });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list files', error: err.message });
  }
};
