import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import path from 'path';
import fs from 'fs';

const prisma = new PrismaClient();

// Simple disk storage image handling is managed at route via multer; here we just transform paths.

function parseIntNullable(v: any): number | null {
  if (v === undefined || v === null || v === '') return null; const n = Number(v); return isNaN(n) ? null : n;
}

function validatePayload(body: any) {
  const required = ['event_name','society_name','description','visibility','date','time','location','event_category','organized_by','event_status'];
  const missing = required.filter(k => !body[k]);
  const errors: string[] = [];
  if (missing.length) errors.push('Missing: ' + missing.join(', '));
  if (body.visibility && !['public','private','members-only'].includes(body.visibility)) errors.push('Invalid visibility');
  if (body.event_status && !['draft','organized','finalized'].includes(body.event_status)) errors.push('Invalid event_status');
  return errors;
}

export const createEvent = async (req: Request, res: Response) => {
  try {
    const errors = validatePayload(req.body);
    if (errors.length) return res.status(400).json({ success:false, message: errors.join('; ') });
    const files = (req as any).files as Express.Multer.File[] || [];
  const filePaths = files.map(f => '/public/uploads/' + path.basename(f.path));
    const image_urls = req.body.image_urls ? (Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls]) : [];
    const allImages = [...image_urls, ...filePaths];

    const event = await (prisma as any).events.create({ data: {
      event_name: req.body.event_name,
      society_name: req.body.society_name,
      description: req.body.description,
      visibility: req.body.visibility,
      date: new Date(req.body.date),
      time: req.body.time,
      location: req.body.location,
      event_category: req.body.event_category,
      needed_volunteers_count: parseIntNullable(req.body.needed_volunteers_count) || undefined,
      organized_by: req.body.organized_by,
      image_urls: allImages,
      max_participants: parseIntNullable(req.body.max_participants) || undefined,
      event_status: req.body.event_status,
    }});
    res.status(201).json({ success:true, event });
  } catch (err:any) {
    console.error('createEvent error', err);
    res.status(500).json({ success:false, message:'Failed to create event', error: err.message });
  }
};

export const listEvents = async (_req: Request, res: Response) => {
  try {
    const events = await (prisma as any).events.findMany({ orderBy: { created_at: 'desc' } });
    res.json({ success:true, events });
  } catch (err:any) {
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
    const id = Number(req.params.id);
    const files = (req as any).files as Express.Multer.File[] || [];
  const addPaths = files.map(f => '/public/uploads/' + path.basename(f.path));
    let image_urls: string[] | undefined;
    if (req.body.image_urls) {
      const incoming = Array.isArray(req.body.image_urls) ? req.body.image_urls : [req.body.image_urls];
      image_urls = [...incoming, ...addPaths];
    } else if (addPaths.length) {
      image_urls = addPaths;
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
