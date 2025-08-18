import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import cloudinary from '../config/cloudinary';

const prisma = new PrismaClient();

// Upload a single file buffer to Cloudinary
async function uploadToCloudinary(file: Express.Multer.File, userId: number) {
  return new Promise<{ url: string; resource_type: string; public_id: string }>((resolve, reject) => {
    const stream: any = cloudinary.uploader.upload_stream({
      folder: `tours/user_${userId}`,
      resource_type: 'auto'
    }, (err: any, result: any) => {
      if (err) return reject(err);
      resolve({ url: result.secure_url, resource_type: result.resource_type, public_id: result.public_id });
    });
    stream.end(file.buffer);
  });
}

function requireFields(body: any) {
  const missing: string[] = [];
  if (!body.tour_name) missing.push('tour_name');
  if (!body.description) missing.push('description');
  if (!body.location) missing.push('location');
  return missing;
}

export const uploadSingle = async (req: Request, res: Response) => {
  try {
    const auth: any = (req as any).user;
    if (!auth?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const missing = requireFields(req.body);
    if (missing.length) return res.status(400).json({ success: false, message: 'Missing: ' + missing.join(', ') });
    if (!req.file) return res.status(400).json({ success: false, message: 'File required' });

    const file = req.file;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Upload media to Cloudinary and insert media_uploads
      const uploaded = await uploadToCloudinary(file, auth.userId);
      const media = await (tx as any).media_uploads.create({
        data: {
          user_id: auth.userId,
          file_name: file.originalname,
          file_path: uploaded.url,
            file_type: file.mimetype,
            file_size: file.size
        }
      });

      // 2. Insert tour_media with the single media id
      const tour = await (tx as any).tour_media.create({
        data: {
          tour_name: req.body.tour_name,
          description: req.body.description,
          location: req.body.location,
          tags: req.body.tags || null,
          media_ids: [media.id]
        }
      });

      return { tour, media: [media] };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('uploadSingle error', err);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message });
  }
};

export const uploadAlbum = async (req: Request, res: Response) => {
  try {
    const auth: any = (req as any).user;
    if (!auth?.userId) return res.status(401).json({ success: false, message: 'Unauthorized' });
    const missing = requireFields(req.body);
    if (missing.length) return res.status(400).json({ success: false, message: 'Missing: ' + missing.join(', ') });
    const files = (req as any).files as Express.Multer.File[];
    if (!files || !files.length) return res.status(400).json({ success: false, message: 'At least one file required' });

    const result = await prisma.$transaction(async (tx) => {
      const mediaIds: number[] = [];
      const mediaRecords: any[] = [];

      for (const f of files) {
        const uploaded = await uploadToCloudinary(f, auth.userId);
        const media = await (tx as any).media_uploads.create({
          data: {
            user_id: auth.userId,
            file_name: f.originalname,
            file_path: uploaded.url,
            file_type: f.mimetype,
            file_size: f.size
          }
        });
        mediaIds.push(media.id);
        mediaRecords.push(media);
      }

      const tour = await (tx as any).tour_media.create({
        data: {
          tour_name: req.body.tour_name,
          description: req.body.description,
          location: req.body.location,
          tags: req.body.tags || null,
          media_ids: mediaIds
        }
      });

      return { tour, media: mediaRecords };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('uploadAlbum error', err);
    res.status(500).json({ success: false, message: 'Album upload failed', error: err.message });
  }
};

export const listTours = async (_req: Request, res: Response) => {
  try {
    // Get tours then hydrate media
    const tours = await (prisma as any).tour_media.findMany({ orderBy: { created_at: 'desc' } });
    const mediaMap: Record<number, any> = {};
    // Collect all media ids
    const allIds = Array.from(new Set(tours.flatMap((t: any) => t.media_ids as number[])));
    if (allIds.length) {
      const media = await (prisma as any).media_uploads.findMany({ where: { id: { in: allIds } } });
      media.forEach((m: any) => { mediaMap[m.id] = m; });
    }
    const enriched = tours.map((t: any) => ({ ...t, media: (t.media_ids as number[]).map(id => mediaMap[id]).filter(Boolean) }));
    res.json({ success: true, tours: enriched });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list tours', error: err.message });
  }
};

export const getTour = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const tour = await (prisma as any).tour_media.findUnique({ where: { tour_id: id } });
    if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
    const media = tour.media_ids.length ? await (prisma as any).media_uploads.findMany({ where: { id: { in: tour.media_ids } } }) : [];
    res.json({ success: true, tour: { ...tour, media } });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to fetch tour', error: err.message });
  }
};

export const updateTour = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const data: any = {};
    ['tour_name','description','location','tags'].forEach(f => { if (req.body[f] !== undefined) data[f] = req.body[f]; });
    if (Object.keys(data).length === 0) return res.status(400).json({ success: false, message: 'No updatable fields provided' });
    data.updated_at = new Date();
    const tour = await (prisma as any).tour_media.update({ where: { tour_id: id }, data });
    res.json({ success: true, tour });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
};

export const deleteTour = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await (prisma as any).tour_media.delete({ where: { tour_id: id } });
    res.json({ success: true, message: 'Tour deleted' });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
};
