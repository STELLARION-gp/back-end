import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import { Pool } from 'pg';
import cloudinary from '../config/cloudinary';

const prisma = new PrismaClient();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Upload a single file buffer to Cloudinary
async function uploadToCloudinary(file: Express.Multer.File, userId: number) {
  console.log('[uploadToCloudinary] Starting upload for user:', userId);
  console.log('[uploadToCloudinary] File:', file.originalname, 'Size:', file.size, 'Type:', file.mimetype);
  
  if (!file.buffer) {
    console.error('[uploadToCloudinary] No buffer in file object!');
    throw new Error('File buffer is missing - multer memory storage not configured?');
  }
  
  console.log('[uploadToCloudinary] Buffer size:', file.buffer.length);
  
  return new Promise<{ url: string; resource_type: string; public_id: string }>((resolve, reject) => {
    try {
      console.log('[uploadToCloudinary] Creating upload stream...');
      const stream: any = cloudinary.uploader.upload_stream({
        folder: `tours/user_${userId}`,
        resource_type: 'auto'
      }, (err: any, result: any) => {
        if (err) {
          console.error('[uploadToCloudinary] Cloudinary error:', err);
          return reject(err);
        }
        if (!result) {
          console.error('[uploadToCloudinary] Empty result from Cloudinary');
          return reject(new Error('Empty result from Cloudinary'));
        }
        console.log('[uploadToCloudinary] Upload successful:', result.secure_url);
        resolve({ url: result.secure_url, resource_type: result.resource_type, public_id: result.public_id });
      });
      console.log('[uploadToCloudinary] Ending stream with buffer...');
      stream.end(file.buffer);
    } catch (err) {
      console.error('[uploadToCloudinary] Exception creating stream:', err);
      reject(err);
    }
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
    console.log('[tour-upload-single] Request received');
    console.log('[tour-upload-single] Body:', req.body);
    console.log('[tour-upload-single] File present:', !!req.file);
    console.log('[tour-upload-single] User:', (req as any).user);
    
    const auth: any = (req as any).user;
    if (!auth?.userId) {
      console.log('[tour-upload-single] Unauthorized - no userId');
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    
    console.log('[tour-upload-single] Authenticated user ID:', auth.userId);
    
    // IMPORTANT: Verify user exists in database before attempting upload
    try {
      const userExists = await prisma.$queryRaw`SELECT id FROM users WHERE id = ${auth.userId}` as any[];
      
      if (!userExists || userExists.length === 0) {
        console.error('[tour-upload-single] User ID', auth.userId, 'does not exist in database!');
        return res.status(400).json({ 
          success: false, 
          message: `Invalid user ID ${auth.userId}. User does not exist in database.` 
        });
      }
      console.log('[tour-upload-single] User verified in database');
    } catch (userCheckErr: any) {
      console.error('[tour-upload-single] Error checking user:', userCheckErr);
      return res.status(500).json({ success: false, message: 'Error verifying user' });
    }
    
    const missing = requireFields(req.body);
    if (missing.length) {
      console.log('[tour-upload-single] Missing fields:', missing);
      return res.status(400).json({ success: false, message: 'Missing: ' + missing.join(', ') });
    }
    
    if (!req.file) {
      console.log('[tour-upload-single] No file in request');
      return res.status(400).json({ success: false, message: 'File required' });
    }

    const file = req.file;
    console.log('[tour-upload-single] File details:', { name: file.originalname, size: file.size, type: file.mimetype });

    // If prisma has models use it, else fallback raw SQL
    let result: any;
    console.log('[tour-upload-single] Checking Prisma models - tour_media:', typeof (prisma as any).tour_media !== 'undefined', ', media_uploads:', typeof (prisma as any).media_uploads !== 'undefined');
    
    if ((prisma as any).tour_media && (prisma as any).media_uploads) {
      console.log('[tour-upload-single] Using Prisma transaction');
      
      // Upload to Cloudinary FIRST (outside transaction to avoid rollback on DB error)
      console.log('[tour-upload-single] Starting Cloudinary upload...');
      const uploaded = await uploadToCloudinary(file, auth.userId);
      console.log('[tour-upload-single] Cloudinary success:', uploaded.url);
      
      try {
        result = await prisma.$transaction(async (tx) => {
          console.log('[tour-upload-single] Starting DB transaction...');
          console.log('[tour-upload-single] Creating media_uploads record with data:', {
            user_id: auth.userId,
            file_name: file.originalname,
            file_path: uploaded.url,
            file_type: file.mimetype,
            file_size: file.size
          });
          
          const media = await (tx as any).media_uploads.create({
            data: {
              user_id: auth.userId,
              file_name: file.originalname,
              file_path: uploaded.url,
              file_type: file.mimetype,
              file_size: file.size
            }
          });
          console.log('[tour-upload-single] ✓ Media created, id:', media.id);
          
          console.log('[tour-upload-single] Creating tour_media record with data:', {
            tour_name: req.body.tour_name,
            description: req.body.description,
            location: req.body.location,
            tags: req.body.tags || null,
            media_ids: [media.id]
          });
          
          const tour = await (tx as any).tour_media.create({
            data: {
              tour_name: req.body.tour_name,
              description: req.body.description,
              location: req.body.location,
              tags: req.body.tags || null,
              media_ids: [media.id]
            }
          });
          console.log('[tour-upload-single] ✓ Tour created, id:', tour.tour_id);
          return { tour, media: [media] };
        });
        console.log('[tour-upload-single] ✓✓✓ Transaction committed successfully');
      } catch (dbError: any) {
        console.error('[tour-upload-single] DATABASE TRANSACTION FAILED:');
        console.error('  Message:', dbError.message);
        console.error('  Code:', dbError.code);
        console.error('  Meta:', dbError.meta);
        console.error('  Stack:', dbError.stack);
        throw new Error(`Database error: ${dbError.message} (Cloudinary file uploaded but DB insert failed)`);
      }
    } else {
      console.log('[tour-upload-single] Using raw SQL fallback');
      // Raw SQL fallback transaction
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const uploaded = await uploadToCloudinary(file, auth.userId);
        const mediaInsert = await client.query(
          `INSERT INTO media_uploads (user_id,file_name,file_path,file_type,file_size) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [auth.userId, file.originalname, uploaded.url, file.mimetype, file.size]
        );
        const media = mediaInsert.rows[0];
        const tourInsert = await client.query(
          `INSERT INTO tour_media (tour_name,description,location,tags,media_ids) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [req.body.tour_name, req.body.description, req.body.location, req.body.tags || null, [media.id]]
        );
        const tour = tourInsert.rows[0];
        await client.query('COMMIT');
        result = { tour, media: [media] };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('[tour-upload-single] ERROR:', err);
    console.error('[tour-upload-single] Error stack:', err.stack);
    console.error('[tour-upload-single] Error message:', err.message);
    console.error('[tour-upload-single] Error code:', err.code);
    res.status(500).json({ success: false, message: 'Upload failed', error: err.message, code: err.code });
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

    let result: any;
    if ((prisma as any).tour_media && (prisma as any).media_uploads) {
      result = await prisma.$transaction(async (tx) => {
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
    } else {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const mediaIds: number[] = [];
        const mediaRecords: any[] = [];
        for (const f of files) {
          const uploaded = await uploadToCloudinary(f, auth.userId);
            const ins = await client.query(
              `INSERT INTO media_uploads (user_id,file_name,file_path,file_type,file_size) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
              [auth.userId, f.originalname, uploaded.url, f.mimetype, f.size]
            );
            const row = ins.rows[0];
            mediaIds.push(row.id);
            mediaRecords.push(row);
        }
        const tourIns = await client.query(
          `INSERT INTO tour_media (tour_name,description,location,tags,media_ids) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
          [req.body.tour_name, req.body.description, req.body.location, req.body.tags || null, mediaIds]
        );
        await client.query('COMMIT');
        result = { tour: tourIns.rows[0], media: mediaRecords };
      } catch (e) {
        await client.query('ROLLBACK');
        throw e;
      } finally {
        client.release();
      }
    }

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('uploadAlbum error', err);
    res.status(500).json({ success: false, message: 'Album upload failed', error: err.message });
  }
};

export const listTours = async (_req: Request, res: Response) => {
  try {
    if ((prisma as any).tour_media && (prisma as any).media_uploads) {
      const tours = await (prisma as any).tour_media.findMany({ orderBy: { created_at: 'desc' } });
      const mediaMap: Record<number, any> = {};
      const allIds = Array.from(new Set(tours.flatMap((t: any) => t.media_ids as number[])));
      if (allIds.length) {
        const media = await (prisma as any).media_uploads.findMany({ where: { id: { in: allIds } } });
        media.forEach((m: any) => { mediaMap[m.id] = m; });
      }
      const enriched = tours.map((t: any) => ({ ...t, media: (t.media_ids as number[]).map(id => mediaMap[id]).filter(Boolean) }));
      res.json({ success: true, tours: enriched });
    } else {
      const client = await pool.connect();
      try {
        const toursRes = await client.query('SELECT * FROM tour_media ORDER BY created_at DESC');
        const tours = toursRes.rows;
        const allIds = Array.from(new Set(tours.flatMap((t: any) => t.media_ids as number[])));
        let mediaRows: any[] = [];
        if (allIds.length) {
          const mediaRes = await client.query('SELECT * FROM media_uploads WHERE id = ANY($1)', [allIds]);
          mediaRows = mediaRes.rows;
        }
        const mediaMap: Record<number, any> = {};
        mediaRows.forEach(m => { mediaMap[m.id] = m; });
        const enriched = tours.map(t => ({ ...t, media: (t.media_ids || []).map((id: number) => mediaMap[id]).filter(Boolean) }));
        res.json({ success: true, tours: enriched });
      } finally {
        client.release();
      }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list tours', error: err.message });
  }
};

export const getTour = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if ((prisma as any).tour_media && (prisma as any).media_uploads) {
      const tour = await (prisma as any).tour_media.findUnique({ where: { tour_id: id } });
      if (!tour) return res.status(404).json({ success: false, message: 'Tour not found' });
      const media = tour.media_ids.length ? await (prisma as any).media_uploads.findMany({ where: { id: { in: tour.media_ids } } }) : [];
      res.json({ success: true, tour: { ...tour, media } });
    } else {
      const client = await pool.connect();
      try {
        const tourRes = await client.query('SELECT * FROM tour_media WHERE tour_id = $1', [id]);
        if (tourRes.rowCount === 0) return res.status(404).json({ success: false, message: 'Tour not found' });
        const tour = tourRes.rows[0];
        let media: any[] = [];
        if (tour.media_ids && tour.media_ids.length) {
          const mediaRes = await client.query('SELECT * FROM media_uploads WHERE id = ANY($1)', [tour.media_ids]);
          media = mediaRes.rows;
        }
        res.json({ success: true, tour: { ...tour, media } });
      } finally {
        client.release();
      }
    }
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
    if ((prisma as any).tour_media) {
      const tour = await (prisma as any).tour_media.update({ where: { tour_id: id }, data });
      res.json({ success: true, tour });
    } else {
      const client = await pool.connect();
      try {
        const sets: string[] = [];
        const values: any[] = [];
        let idx = 1;
        for (const [k,v] of Object.entries(data)) { sets.push(`${k} = $${idx++}`); values.push(v); }
        values.push(id);
        const sql = `UPDATE tour_media SET ${sets.join(', ')} WHERE tour_id = $${idx} RETURNING *`;
        const upd = await client.query(sql, values);
        if (upd.rowCount === 0) return res.status(404).json({ success: false, message: 'Tour not found' });
        res.json({ success: true, tour: upd.rows[0] });
      } finally { client.release(); }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Update failed', error: err.message });
  }
};

export const deleteTour = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if ((prisma as any).tour_media) {
      await (prisma as any).tour_media.delete({ where: { tour_id: id } });
      res.json({ success: true, message: 'Tour deleted' });
    } else {
      const client = await pool.connect();
      try {
        const del = await client.query('DELETE FROM tour_media WHERE tour_id = $1 RETURNING tour_id', [id]);
        if (del.rowCount === 0) return res.status(404).json({ success: false, message: 'Tour not found' });
        res.json({ success: true, message: 'Tour deleted' });
      } finally { client.release(); }
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Delete failed', error: err.message });
  }
};
