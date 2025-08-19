# Events Feature Integration Guide

This guide explains how to integrate the backend Events API with your frontend `CreateEvent.tsx` (or similar) form.

## API Overview
Base URL prefix: `/api/events`

Endpoints:
- `POST /api/events` (auth required) - Create new event (supports multi-image upload)
- `GET /api/events` - List all events (newest first)
- `GET /api/events/:id` - Get single event
- `PUT /api/events/:id` (auth required) - Update event (can append new images)
- `DELETE /api/events/:id` (auth required) - Delete event

## Supported Fields
Match your form field names exactly:
```
 event_name (string, required)
 society_name (string, required)
 description (string, required)
 visibility (public | private | members-only, required)
 date (YYYY-MM-DD string, required)
 time (HH:mm, required)
 location (string, required)
 event_category (string, required)
 needed_volunteers_count (number, optional)
 organized_by (string, required)
 max_participants (number, optional)
 event_status (draft | organized | finalized, required)
 images (File[] via multipart, optional)
 image_urls (string|string[] optional, pre-existing URLs if reusing)
```

## Create Event (Frontend Example)
```ts
async function submitEvent(form: FormDataLike, token: string) {
  const fd = new FormData();
  Object.entries(form).forEach(([k,v]) => {
    if (v === undefined || v === null || v === '') return;
    if (k === 'images' && Array.isArray(v)) v.forEach(f => fd.append('images', f));
    else fd.append(k, v as any);
  });
  const res = await fetch('/api/events', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: fd
  });
  return res.json();
}
```

## Update Event
Append new images (existing image URLs must be re-sent if you want to preserve them; otherwise server only appends new uploads if you also send previous via `image_urls`).
```ts
async function updateEvent(id: number, data: any, token: string) {
  const fd = new FormData();
  Object.entries(data).forEach(([k,v]) => {
    if (v == null) return;
    if (k === 'images' && Array.isArray(v)) v.forEach(f => fd.append('images', f));
    else if (k === 'image_urls' && Array.isArray(v)) v.forEach(u => fd.append('image_urls', u));
    else fd.append(k, v as any);
  });
  const res = await fetch(`/api/events/${id}`, { method:'PUT', headers:{ Authorization:`Bearer ${token}` }, body: fd });
  return res.json();
}
```

## Response Shapes
Create / Update success:
```json
{ "success": true, "event": { /* event object */ } }
```
List:
```json
{ "success": true, "events": [ { /* event */ }, ... ] }
```
Errors:
```json
{ "success": false, "message": "Error description" }
```

## Event Object
```json
{
  "id": 1,
  "event_name": "Tech Meetup",
  "society_name": "Dev Society",
  "description": "...",
  "visibility": "public",
  "date": "2024-12-10T00:00:00.000Z",
  "time": "18:00",
  "location": "Auditorium",
  "event_category": "meetup",
  "needed_volunteers_count": 5,
  "organized_by": "Community Team",
  "image_urls": ["/uploads/169999-fileA.png"],
  "max_participants": 120,
  "event_status": "organized",
  "created_at": "2024-09-01T12:34:56.000Z"
}
```

## Auth
Endpoints that modify data (`POST`, `PUT`, `DELETE`) require `Authorization: Bearer <token>` header compatible with existing `verifyToken` middleware.

## Validation Rules
- Required fields enforced; server returns 400 with combined message.
- Visibility must be one of allowed values.
- Event status must be `draft`, `organized`, or `finalized`.
- Date parsed as `new Date(date)`; ensure format `YYYY-MM-DD` on client.

## Image Handling
Image Handling (Temporarily Disabled)
Image upload is currently disabled (no multipart processing). Any `images` you append will be ignored. To re-enable, set env `EVENTS_IMAGE_UPLOAD_ENABLED=true` and restore multer middleware in `event.routes.ts` or implement Cloudinary streaming (recommended). Existing logic gracefully treats images as an empty array.

Cloudinary Migration (future): use memoryStorage + `cloudinary.uploader.upload_stream` similar to the tours feature, collect secure URLs, and pass them as `image_urls`.

## Deleting Events
Simple `DELETE /api/events/:id` returns:
```json
{ "success": true, "message": "Event deleted" }
```

## Roadmap Enhancements (Optional)
- Add query filters: visibility, date range, status.
- Cloudinary integration for images.
- Pagination & search (title, category, location).
- Soft delete (add `deleted_at`).
- Ownership controls (tie `organized_by` to authenticated user id).

## Quick Test with curl (optional)
```bash
curl -X POST http://localhost:5000/api/events \
  -H "Authorization: Bearer <TOKEN>" \
  -F event_name=Demo \
  -F society_name=DevClub \
  -F description=Test \
  -F visibility=public \
  -F date=2025-01-10 \
  -F time=19:00 \
  -F location=Hall \
  -F event_category=tech \
  -F organized_by=Team \
  -F event_status=draft \
  -F images=@./somefile.png
```

---
If you need the Cloudinary-enabled version next, let me know and we can switch the storage layer while preserving the same API surface.
