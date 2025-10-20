import { Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import cloudinary from '../config/cloudinary';
import { NotificationService } from '../services/notification.service';
import { NotificationType, NotificationPriority } from '../types/notification.types';
import { sendEmail } from '../services/email.service';
import { prisma } from '../lib/prisma';

// Use shared Prisma instance to prevent connection pool exhaustion

// Helper function to upload image to Cloudinary
async function uploadEventImageToCloudinary(file: Express.Multer.File, eventId?: string): Promise<string> {
    return new Promise((resolve, reject) => {
        console.log('[event-image-upload] Starting upload to Cloudinary...');
        const stream: any = cloudinary.uploader.upload_stream(
            {
                folder: 'events',
                resource_type: 'image',
                public_id: eventId ? `event_${eventId}_${Date.now()}` : `event_${Date.now()}`,
                transformation: [
                    { width: 1920, height: 1080, crop: 'limit' }, // Larger for event banners
                    { quality: 'auto' },
                    { fetch_format: 'auto' }
                ]
            },
            (error, result) => {
                if (error) {
                    console.error('[event-image-upload] Upload failed:', error);
                    reject(error);
                    return;
                }
                console.log('[event-image-upload] Upload successful:', result.secure_url);
                resolve(result.secure_url);
            }
        );
        stream.end(file.buffer);
    });
}

// Image upload can be toggled off via ENV flag (EVENTS_IMAGE_UPLOAD_ENABLED=false)
const IMAGES_ENABLED = process.env.EVENTS_IMAGE_UPLOAD_ENABLED !== 'false';

function parseIntNullable(v: any): number | null {
  if (v === undefined || v === null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n;
}

function validatePayload(body: any) {
  // Accept both snake_case and camelCase from frontend
  const aliasMap: Record<string,string[]> = {
    event_name: ['event_name','eventName'],
    society_name: ['society_name','societyName'],
    description: ['description'],
    visibility: ['visibility'],
    date: ['date','eventDate'],
    time: ['time','eventTime'],
    location: ['location'],
    event_category: ['event_category','eventCategory'],
    organized_by: ['organized_by','organizedBy'],
    event_status: ['event_status','eventStatus']
  };
  const required = Object.keys(aliasMap);
  const missingCalc: string[] = [];
  for (const key of required) {
    const variants = aliasMap[key];
    if (!variants.some(v => body[v])) missingCalc.push(key);
  }
  const missing = missingCalc;
  const errors: string[] = [];
  if (missing.length) errors.push('Missing: ' + missing.join(', '));
  if (body.visibility && !['public','private','members-only'].includes(body.visibility)) errors.push('Invalid visibility');
  const evtStatus = body.event_status || body.eventStatus;
  if (evtStatus && !['draft','organized','finalized'].includes(evtStatus)) errors.push('Invalid event_status');
  return errors;
}

export const createEvent = async (req: Request, res: Response) => {
  try {
    console.log('[events][create] incoming body:', JSON.stringify(req.body));
    console.log('[events][create] Files received:', req.files ? (req.files as any).length : 0);
    
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ success:false, message: errors.join('; ') });
    
    // Handle multiple image uploads with Cloudinary
    const files = req.files as Express.Multer.File[] || [];
    let uploadedImageUrls: string[] = [];
    
    if (files && files.length > 0) {
      console.log('[events][create] Uploading', files.length, 'images to Cloudinary...');
      try {
        // Upload all images to Cloudinary in parallel
        const uploadPromises = files.map(file => uploadEventImageToCloudinary(file));
        uploadedImageUrls = await Promise.all(uploadPromises);
        console.log('[events][create] All images uploaded successfully:', uploadedImageUrls);
      } catch (uploadError: any) {
        console.error('[events][create] Image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload images to cloud storage",
          error: uploadError.message
        });
      }
    }
    
    // Merge with any pre-uploaded image URLs from frontend
    const image_urls = req.body.image_urls ? (Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls]) : [];
    const allImages = [...image_urls, ...uploadedImageUrls];

    const authUser = (req as any).user;
    const authUserId = authUser?.userId || authUser?.id; // stay compatible with existing verifyToken
    if (!authUserId) {
      return res.status(401).json({ success:false, message:'Authentication required (no user id found)' });
    }
    // Normalize body values (support camelCase & snake_case)
    const body = req.body;
    const pick = (...keys:string[]) => {
      for (const k of keys) if (body[k] !== undefined && body[k] !== null && body[k] !== '') return body[k];
      return undefined;
    };
    const dateRaw = pick('date','eventDate');
    const timeRaw = pick('time','eventTime');
    const dateObj = dateRaw ? new Date(dateRaw) : null;
    if (dateRaw && isNaN(dateObj!.getTime())) {
      return res.status(400).json({ success:false, message:'Invalid date format (expected YYYY-MM-DD)' });
    }
    const baseData: any = {
      event_name: pick('event_name','eventName'),
      society_name: pick('society_name','societyName'),
      description: pick('description'),
      visibility: pick('visibility'),
      date: dateObj!,
      time: timeRaw,
      location: pick('location'),
      event_category: pick('event_category','eventCategory'),
      needed_volunteers_count: parseIntNullable(pick('needed_volunteers_count','neededVolunteers')) || undefined,
      organized_by: pick('organized_by','organizedBy'),
      image_urls: allImages,
      max_participants: parseIntNullable(pick('max_participants','maxParticipants')) || undefined,
      event_status: pick('event_status','eventStatus')
    };
    // Quick guard in case required normalized fields ended up undefined despite earlier validation
    const missingCore = Object.entries({
      event_name: baseData.event_name,
      society_name: baseData.society_name,
      description: baseData.description,
      visibility: baseData.visibility,
      date: baseData.date,
      time: baseData.time,
      location: baseData.location,
      event_category: baseData.event_category,
      organized_by: baseData.organized_by,
      event_status: baseData.event_status
    }).filter(([_,v]) => v === undefined || v === null).map(([k])=>k);
    if (missingCore.length) {
      return res.status(400).json({ success:false, message:'Normalization failed for: ' + missingCore.join(', ') });
    }
    // Attempt with moderation fields first (may fail if columns not present)
    let event;
    try {
      event = await (prisma as any).events.create({ data: { ...baseData, status: 'pending', created_by: authUserId } });
    } catch (e:any) {
      const lower = (e?.message || '').toLowerCase();
      // Log structured error for debugging
      console.error('[events][create] Prisma error:', {
        message: e?.message,
        code: e?.code,
        meta: e?.meta,
        stack: e?.stack
      });
      if (lower.includes('null value in column "created_by"')) {
        return res.status(400).json({ success:false, message:'Server expected created_by but received null. Ensure auth token is valid.' });
      }
      if (lower.includes('column') && (lower.includes('created_by') || lower.includes('status'))) {
        console.warn('[events] Moderation columns missing in DB, retrying without them');
        event = await (prisma as any).events.create({ data: baseData });
      } else if (e?.code === 'P2003') { // FK constraint
        return res.status(400).json({ success:false, message:'Invalid user reference for created_by' });
      } else if (e?.code === 'P2000') { // Value too long
        return res.status(400).json({ success:false, message:'One of the string fields exceeds allowed length' });
      } else {
        // Attempt RAW fallback for diagnostic purposes
        try {
          console.warn('[events][create] attempting raw SQL fallback');
          const cols: Array<{column_name:string}> = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='events'");
          const set = new Set(cols.map(c=>c.column_name));
          const dataCols: string[] = [];
          const values: any[] = [];
          const push = (name:string, val:any) => { if (set.has(name) && val !== undefined) { dataCols.push('"'+name+'"'); values.push(val);} };
          push('event_name', baseData.event_name);
          push('society_name', baseData.society_name);
          push('description', baseData.description);
          push('visibility', baseData.visibility);
          push('date', baseData.date);
          push('time', baseData.time);
          push('location', baseData.location);
          push('event_category', baseData.event_category);
          push('needed_volunteers_count', baseData.needed_volunteers_count);
          push('organized_by', baseData.organized_by);
          push('image_urls', baseData.image_urls);
          push('max_participants', baseData.max_participants);
          push('event_status', baseData.event_status);
          if (set.has('status')) push('status','pending');
          if (set.has('created_by')) push('created_by', authUserId);
          const placeholders = values.map((_,i)=>`$${i+1}`).join(',');
          const sql = `INSERT INTO events (${dataCols.join(',')}) VALUES (${placeholders}) RETURNING *`;
          console.log('[events][create] raw insert SQL:', sql, 'values:', values);
          const inserted: any[] = await prisma.$queryRawUnsafe(sql, ...values);
          event = inserted[0];
          console.warn('[events][create] raw SQL fallback succeeded');
        } catch (rawErr:any) {
          console.error('[events][create] raw SQL fallback failed', { message: rawErr?.message, code: rawErr?.code, stack: rawErr?.stack });
          throw e; // rethrow original prisma error
        }
      }
    }
    res.status(201).json({ success:true, event });
  } catch (err:any) {
    console.error('createEvent error', { message: err?.message, code: err?.code, meta: err?.meta, stack: err?.stack });
    res.status(500).json({ success:false, message:'Failed to create event', error: err?.message, code: err?.code });
  }
};

export const listEvents = async (_req: Request, res: Response) => {
  try {
    // Basic sanity check
    if (!(prisma as any).events || typeof (prisma as any).events.findMany !== 'function') {
      console.error('[events][list] prisma.events missing or invalid on client');
      return res.status(500).json({ success:false, message:'Events model not available on server (regenerate Prisma client?)' });
    }
    try {
      const events = await (prisma as any).events.findMany({ orderBy: { created_at: 'desc' } });
      return res.json({ success:true, events });
    } catch (err:any) {
      console.error('[events][list] primary query failed', { message: err?.message, code: err?.code, meta: err?.meta, stack: err?.stack });
      const msg = (err?.message || '').toLowerCase();
      // Fallback if created_at column issue
      if (msg.includes('created_at')) {
        console.warn('[events][list] retrying without orderBy (created_at issue)');
        try {
          const events = await (prisma as any).events.findMany();
          return res.json({ success:true, events, warning:'ordered list fallback used' });
        } catch (e2:any) {
          console.error('[events][list] fallback query also failed', { message: e2?.message, code: e2?.code, stack: e2?.stack });
        }
      }
      // Introspect columns for diagnostics
      try {
        const cols: Array<{ column_name: string }> = await prisma.$queryRawUnsafe("SELECT column_name FROM information_schema.columns WHERE table_name='events'");
        console.log('[events][list] existing columns:', cols.map(c=>c.column_name));
      } catch (icolErr:any) {
        console.error('[events][list] column introspection failed', { message: icolErr?.message });
      }
      return res.status(500).json({ success:false, message:'Failed to list events', error: err?.message });
    }
  } catch (err:any) {
    console.error('[events][list] outer error', { message: err?.message, code: err?.code, stack: err?.stack });
    res.status(500).json({ success:false, message:'Failed to list events', error: err.message });
  }
};

export const getEvent = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const event = await (prisma as any).events.findUnique({ where: { id } });
    if (!event) return res.status(404).json({ success:false, message:'Event not found' });
    res.json({ success:true, event });
  } catch (err:any) {
    res.status(500).json({ success:false, message:'Failed to fetch event', error: err.message });
  }
};

export const updateEvent = async (req: Request, res: Response) => {
  try {
    console.log('[events][update] Request for event ID:', req.params.id);
    console.log('[events][update] Files received:', req.files ? (req.files as any).length : 0);
    
    const id = Number(req.params.id);
    
    // Handle new image uploads
    const files = req.files as Express.Multer.File[] || [];
    let uploadedImageUrls: string[] = [];
    
    if (files && files.length > 0) {
      console.log('[events][update] Uploading', files.length, 'images to Cloudinary...');
      try {
        const uploadPromises = files.map(file => uploadEventImageToCloudinary(file, id.toString()));
        uploadedImageUrls = await Promise.all(uploadPromises);
        console.log('[events][update] All images uploaded successfully:', uploadedImageUrls);
      } catch (uploadError: any) {
        console.error('[events][update] Image upload failed:', uploadError);
        return res.status(500).json({
          success: false,
          message: "Failed to upload images to cloud storage",
          error: uploadError.message
        });
      }
    }
    
    // Merge with existing and pre-uploaded URLs
    let image_urls: string[] | undefined;
    if (req.body.image_urls) {
      const incoming = Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls];
      image_urls = [...incoming, ...uploadedImageUrls];
    } else if (uploadedImageUrls.length) {
      // If new images uploaded but no existing URLs provided, fetch existing first
      const existingEvent = await (prisma as any).events.findUnique({ where: { id } });
      const existingUrls = existingEvent?.image_urls || [];
      image_urls = [...existingUrls, ...uploadedImageUrls];
    }
    const data: any = {};
    ['event_name','society_name','description','visibility','date','time','location','event_category','organized_by','event_status'].forEach(f => { if (req.body[f]) data[f] = req.body[f]; });
    if (data.date) data.date = new Date(data.date);
    if (req.body.needed_volunteers_count !== undefined) data.needed_volunteers_count = parseIntNullable(req.body.needed_volunteers_count);
    if (req.body.max_participants !== undefined) data.max_participants = parseIntNullable(req.body.max_participants);
    if (image_urls !== undefined) data.image_urls = image_urls;
    const event = await (prisma as any).events.update({ where: { id }, data });
    res.json({ success:true, event });
  } catch (err:any) {
    if (err.code === 'P2025') return res.status(404).json({ success:false, message:'Event not found' });
    res.status(500).json({ success:false, message:'Failed to update event', error: err.message });
  }
};

export const deleteEvent = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    await (prisma as any).events.delete({ where: { id } });
    res.json({ success:true, message:'Event deleted' });
  } catch (err:any) {
    if (err.code === 'P2025') return res.status(404).json({ success:false, message:'Event not found' });
    res.status(500).json({ success:false, message:'Failed to delete event', error: err.message });
  }
};

export const moderateEvent = async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    const { action } = req.body; // 'approve' | 'reject'
    if (!['approve','reject'].includes(action)) {
      return res.status(400).json({ success:false, message:'Invalid action; use approve or reject' });
    }
    const authUser = (req as any).user;
  const existing = await (prisma as any).events.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success:false, message:'Event not found' });
  const authUserId = authUser?.userId || authUser?.id;
  if (existing.created_by && existing.created_by === authUserId && authUser?.role !== 'admin') {
      return res.status(403).json({ success:false, message:'Creators cannot moderate their own events' });
    }
    // Only moderator or admin
    if (!['moderator','admin'].includes(authUser?.role)) {
      return res.status(403).json({ success:false, message:'Insufficient role to moderate event' });
    }
    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    let event;
    try {
      event = await (prisma as any).events.update({ where: { id }, data: { status: newStatus, moderated_by: authUserId } });
    } catch (e:any) {
      const msg = (e?.message || '').toLowerCase();
      if (msg.includes('column') && (msg.includes('status') || msg.includes('moderated_by'))) {
        console.warn('[events] Moderation columns absent; returning existing event with simulated status change');
        event = existing; // do not modify DB if columns absent
      } else throw e;
    }
    res.json({ success:true, event });
  } catch (err:any) {
  console.error('[events][moderate] error', { message: err?.message, code: err?.code, meta: err?.meta });
  res.status(500).json({ success:false, message:'Failed to moderate event', error: process.env.NODE_ENV === 'development' ? err.message : undefined });
  }
};

// New: List only approved events
export const listApprovedEvents = async (_req: Request, res: Response) => {
  try {
    const events = await prisma.events.findMany({
      where: { status: 'approved' },
      orderBy: { date: 'asc' }
    });
    res.json({ success: true, events });
  } catch (err: any) {
    res.status(500).json({ success: false, message: 'Failed to list approved events', error: err.message });
  }
};

// New: Register for event
export const registerForEvent = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id;
    const firebaseUid = authUser?.uid || authUser?.firebaseUid || authUser?.firebase_uid;
    
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if event exists and is approved
    const event = await prisma.events.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }
    
    if (event.status !== 'approved') {
      return res.status(400).json({ success: false, message: 'Event is not approved for registration' });
    }

    // Check if user is already registered
    const existingRegistration = await prisma.event_registrations.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    if (existingRegistration) {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }

    // Check if event has reached max participants
    if (event.max_participants) {
      const registrationCount = await prisma.event_registrations.count({
        where: { event_id: eventId }
      });

      if (registrationCount >= event.max_participants) {
        return res.status(400).json({ success: false, message: 'Event has reached maximum participants' });
      }
    }

    // Register user for event
    await prisma.event_registrations.create({
      data: {
        event_id: eventId,
        user_id: userId,
        registered_at: new Date()
      }
    });

    // Send system notification
    try {
      console.log('[Event Registration] Attempting to send notification:', {
        firebaseUid,
        eventId,
        eventName: event.event_name,
        eventDate: event.date,
        eventLocation: event.location
      });
      if (firebaseUid) {
        const notificationResult = await NotificationService.createNotification({
          userId: firebaseUid,
          type: NotificationType.EVENT,
          priority: NotificationPriority.HIGH,
          title: '🎉 Event Registration Successful!',
          message: `You have successfully registered for "${event.event_name}". Event date: ${new Date(event.date).toLocaleDateString()}`,
          link: `/events/${eventId}`,
          isSystemGenerated: true,
          metadata: {
            eventId: eventId.toString(),
            eventName: event.event_name,
            eventDate: event.date.toISOString(),
            eventLocation: event.location
          }
        });
        console.log('[Event Registration] Notification creation result:', notificationResult);
        console.log(`✅ Event registration notification sent to user ${firebaseUid}`);
      } else {
        console.warn('[Event Registration] No firebaseUid found, notification not sent');
      }
    } catch (notificationError: any) {
      console.error('[Event Registration] Failed to send event registration notification:', notificationError);
      // Don't fail the registration if notification fails
    }

    // Send email notification
    try {
      const user = await prisma.users.findUnique({ where: { id: userId } });
      console.log('[Event Registration][Email] User lookup result:', user);
      if (user?.email) {
        console.log('[Event Registration][Email] Attempting to send email to:', user.email);
        const emailResult = await sendEmail({
          to: user.email,
          subject: `Event Registration Confirmation - ${event.event_name}`,
          html: `<p>You have successfully registered for ${event.event_name} on ${new Date(event.date).toLocaleDateString()} at ${event.location}.</p>`
        });
        console.log('[Event Registration][Email] sendEmail result:', emailResult);
        console.log(`[Event Registration] Confirmation email sent to ${user.email}`);
      } else {
        console.warn('[Event Registration][Email] No email found for user:', user);
      }
    } catch (emailError) {
      console.error('[Event Registration] Failed to send email:', emailError);
    }

    res.json({ 
      success: true, 
      message: 'Successfully registered for event. Notification sent!',
      registration: {
        eventId,
        eventName: event.event_name,
        eventDate: event.date,
        eventLocation: event.location
      }
    });
  } catch (err: any) {
    console.error('[events][register] error', { message: err?.message, code: err?.code, stack: err?.stack });
    
    if (err.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'You are already registered for this event' });
    }
    
    res.status(500).json({ success: false, message: 'Failed to register for event', error: err.message });
  }
};

// New: Check if user is registered for an event
export const checkEventRegistration = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const registration = await prisma.event_registrations.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    res.json({ 
      success: true, 
      isRegistered: !!registration,
      registration: registration || null
    });
  } catch (err: any) {
    console.error('[events][check-registration] error', { message: err?.message });
    res.status(500).json({ success: false, message: 'Failed to check registration status', error: err.message });
  }
};

// New: Get user's event registrations
export const getUserEventRegistrations = async (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const registrations = await prisma.event_registrations.findMany({
      where: { user_id: userId },
      include: {
        event: true
      },
      orderBy: { registered_at: 'desc' }
    });

    res.json({ 
      success: true, 
      registrations: registrations.map(reg => ({
        ...reg,
        event: reg.event
      }))
    });
  } catch (err: any) {
    console.error('[events][user-registrations] error', { message: err?.message });
    res.status(500).json({ success: false, message: 'Failed to fetch user registrations', error: err.message });
  }
};

// New: Unregister from event
export const unregisterFromEvent = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);
    const authUser = (req as any).user;
    const userId = authUser?.userId || authUser?.id;
    const firebaseUid = authUser?.firebaseUid || authUser?.firebase_uid;

    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    // Check if event exists
    const event = await prisma.events.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    // Check if user is registered
    const registration = await prisma.event_registrations.findUnique({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    if (!registration) {
      return res.status(400).json({ success: false, message: 'You are not registered for this event' });
    }

    // Delete registration
    await prisma.event_registrations.delete({
      where: {
        event_id_user_id: {
          event_id: eventId,
          user_id: userId
        }
      }
    });

    // Send cancellation notification
    try {
      if (firebaseUid) {
        await NotificationService.createNotification({
          userId: firebaseUid,
          type: NotificationType.INFO,
          priority: NotificationPriority.MEDIUM,
          title: 'Event Registration Cancelled',
          message: `You have cancelled your registration for "${event.event_name}"`,
          link: `/events/${eventId}`,
          isSystemGenerated: true,
          metadata: {
            eventId: eventId.toString(),
            eventName: event.event_name
          }
        });
      }
    } catch (notificationError: any) {
      console.error('Failed to send cancellation notification:', notificationError);
    }

    res.json({ 
      success: true, 
      message: 'Successfully unregistered from event'
    });
  } catch (err: any) {
    console.error('[events][unregister] error', { message: err?.message, code: err?.code });
    res.status(500).json({ success: false, message: 'Failed to unregister from event', error: err.message });
  }
};

// New: Get event registrations count and list (for event organizers)
export const getEventRegistrations = async (req: Request, res: Response) => {
  try {
    const eventId = Number(req.params.id);

    const event = await prisma.events.findUnique({ where: { id: eventId } });
    if (!event) {
      return res.status(404).json({ success: false, message: 'Event not found' });
    }

    const registrations = await prisma.event_registrations.findMany({
      where: { event_id: eventId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        }
      },
      orderBy: { registered_at: 'desc' }
    });

    const count = registrations.length;
    const maxParticipants = event.max_participants;
    const spotsAvailable = maxParticipants ? maxParticipants - count : null;

    res.json({ 
      success: true,
      count,
      maxParticipants,
      spotsAvailable,
      registrations: registrations.map(reg => ({
        id: reg.id,
        registeredAt: reg.registered_at,
        user: reg.user
      }))
    });
  } catch (err: any) {
    console.error('[events][registrations] error', { message: err?.message });
    res.status(500).json({ success: false, message: 'Failed to fetch event registrations', error: err.message });
  }
};
