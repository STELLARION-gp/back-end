# Tour Media Upload Integration Guide (Frontend)

This guide explains how to integrate the new Tour Media backend APIs into your frontend (e.g. React + Firebase Auth). It covers single + album uploads, listing, viewing, updating, and deleting tours while leveraging the existing authenticated media upload system.

---
## 1. Feature Overview
A "Tour" groups one or more uploaded media items (images / videos / pdf). Each tour row stores required tour details plus an array of associated `media_uploads.id` values. All uploads are streamed to Cloudinary; the secure URLs are stored.

| Entity        | Table         | Key Fields | Notes |
|---------------|---------------|-----------|-------|
| Media File    | `media_uploads` | `id`, `file_name`, `file_path` (Cloudinary URL), `file_type`, `file_size` | Created first for each file |
| Tour          | `tour_media`    | `tour_id`, `tour_name`, `description`, `location`, `tags`, `media_ids` | Created after all media rows are inserted |

Transactions ensure: either ALL media + tour are saved, or nothing.

---
## 2. Endpoints Summary
Base path: `/api/tours`

| Method | Path | Purpose | Auth | Body Type |
|--------|------|---------|------|-----------|
| POST | `/upload-single` | Upload 1 file + create tour | Bearer token | multipart/form-data |
| POST | `/upload-album` | Upload multiple files + one tour | Bearer token | multipart/form-data |
| GET | `/` | List all tours (with hydrated media) | Bearer token | - |
| GET | `/:id` | Get one tour + media | Bearer token | - |
| PUT | `/:id` | Update tour metadata (no media changes) | Bearer token | JSON |
| DELETE | `/:id` | Delete tour (does NOT delete media rows right now) | Bearer token | - |

### Required Tour Fields (for both upload endpoints)
- `tour_name` (string)
- `description` (string)
- `location` (string)
Optional:
- `tags` (string; you can store comma-separated tags)

### File Field Names
- Single upload: field name `file`
- Album upload: field name `files` (array)

---
## 3. Authentication
All endpoints require a Firebase ID token in the `Authorization` header:
```
Authorization: Bearer <firebase_id_token>
```
Obtain token: `await firebaseAuth.currentUser?.getIdToken()`.

---
## 4. Response Shapes
### POST /api/tours/upload-single
```json
{
  "success": true,
  "tour": {
    "tour_id": 7,
    "tour_name": "Lunar Ridge",
    "description": "Crater observation session",
    "location": "Desert Station",
    "tags": "moon,crater",
    "media_ids": [42],
    "created_at": "2025-08-18T12:34:56.123Z"
  },
  "media": [
    {
      "id": 42,
      "file_name": "ridge.jpg",
      "file_path": "https://res.cloudinary.com/<cloud>/.../ridge.jpg",
      "file_type": "image/jpeg",
      "file_size": 183421,
      "created_at": "2025-08-18T12:34:56.120Z"
    }
  ]
}
```

### POST /api/tours/upload-album
Same structure; `media` array contains multiple media objects; `media_ids` includes all IDs.

### GET /api/tours
```json
{
  "success": true,
  "tours": [
    {
      "tour_id": 7,
      "tour_name": "Lunar Ridge",
      "description": "Crater observation session",
      "location": "Desert Station",
      "tags": "moon,crater",
      "media_ids": [42,43],
      "created_at": "2025-08-18T12:34:56.123Z",
      "updated_at": "2025-08-18T12:34:56.123Z",
      "media": [ { /* hydrated media_uploads row */ } ]
    }
  ]
}
```

### GET /api/tours/:id
```json
{
  "success": true,
  "tour": {
    "tour_id": 7,
    "tour_name": "Lunar Ridge",
    "media": [ { /* media rows */ } ],
    ...
  }
}
```

---
## 5. Frontend API Service (Example)
Create / extend an `apiTours.ts` helper.
```ts
import { auth } from '../firebase';
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

async function authHeaders(force?: boolean) {
  const user = auth.currentUser; if (!user) throw new Error('Not authenticated');
  const token = await user.getIdToken(!!force);
  return { Authorization: `Bearer ${token}` };
}

export async function uploadSingleTour(file: File, meta: { tour_name: string; description: string; location: string; tags?: string; }) {
  const form = new FormData();
  Object.entries(meta).forEach(([k,v]) => v !== undefined && form.append(k, String(v)));
  form.append('file', file);
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/tours/upload-single`, { method: 'POST', headers, body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadAlbumTour(files: File[], meta: { tour_name: string; description: string; location: string; tags?: string; }) {
  const form = new FormData();
  Object.entries(meta).forEach(([k,v]) => v !== undefined && form.append(k, String(v)));
  files.forEach(f => form.append('files', f));
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/tours/upload-album`, { method: 'POST', headers, body: form });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listTours() {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/tours`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function getTour(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/tours/${id}`, { headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function updateTour(id: number, data: Partial<{ tour_name: string; description: string; location: string; tags: string; }>) {
  const headers = { ...(await authHeaders()), 'Content-Type': 'application/json' };
  const res = await fetch(`${API_BASE}/tours/${id}`, { method: 'PUT', headers, body: JSON.stringify(data) });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteTour(id: number) {
  const headers = await authHeaders();
  const res = await fetch(`${API_BASE}/tours/${id}`, { method: 'DELETE', headers });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

---
## 6. Sample React Component (Album Upload)
```tsx
import React, { useState } from 'react';
import { uploadAlbumTour } from '../services/apiTours';

export function TourAlbumUploader() {
  const [files, setFiles] = useState<File[]>([]);
  const [form, setForm] = useState({ tour_name:'', description:'', location:'', tags:'' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const onSelect: React.ChangeEventHandler<HTMLInputElement> = e => {
    if (e.target.files) setFiles(Array.from(e.target.files));
  };

  const submit = async () => {
    setLoading(true); setError(null);
    try {
      const res = await uploadAlbumTour(files, form);
      setResult(res);
    } catch (e:any) { setError(e.message); }
    finally { setLoading(false); }
  };

  return (
    <div>
      <h3>Upload Tour Album</h3>
      {['tour_name','description','location','tags'].map(k => (
        <input key={k} placeholder={k} value={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.value}))} />
      ))}
      <input type="file" multiple onChange={onSelect} />
      <button disabled={loading || !files.length || !form.tour_name || !form.description || !form.location} onClick={submit}>Upload</button>
      {loading && <p>Uploading...</p>}
      {error && <p style={{color:'red'}}>{error}</p>}
      {result && <pre>{JSON.stringify(result,null,2)}</pre>}
    </div>
  );
}
```

---
## 7. Error Handling Patterns
| Scenario | Status | Message |
|----------|--------|---------|
| Missing auth | 401 | Unauthorized / Authentication required |
| Missing required tour fields | 400 | Missing: tour_name, description, location |
| No file(s) provided | 400 | File required / At least one file required |
| Cloudinary failure | 500 | Upload failed / Album upload failed |
| Not found (GET /:id) | 404 | Tour not found |

Always wrap calls in try/catch and surface user-friendly messages.

---
## 8. UX Recommendations
- Disable submit until required fields + file(s) chosen.
- Show per-file progress (optional: use a separate custom upload stream if needed—current endpoint handles internally).
- Normalize tags input (e.g. user enters comma-separated => store same string).
- Cache recent tours after listing to avoid redundant network calls.

---
## 9. Adding Tags as Array (Optional Enhancement)
If you later want structured tags:
1. Change backend `tags` column to `TEXT[]` or a separate relation.
2. Send `tags` as JSON string: `form.append('tags', JSON.stringify(['moon','crater']))`.
3. Parse on list render: `JSON.parse(tour.tags)`.

---
## 10. Deleting Tours & Media (Future)
Currently deleting a tour leaves media rows intact (reuse elsewhere). If you want cascading cleanup of unused media, implement a backend check to delete `media_uploads` whose IDs exist only inside the removed tour and not any other reference logic.

---
## 11. Quick Integration Checklist
- [ ] Ensure backend running with new `/api/tours` routes
- [ ] Add API helper functions (above) to frontend
- [ ] Add upload UI for single + album
- [ ] Include tour_name, description, location (required) in every upload form
- [ ] Display Cloudinary thumbnails using `media.file_path`
- [ ] Implement list + detail views
- [ ] Handle 401 retry (existing global logic may already do this)

---
## 12. Smoke Test Script (Manual)
1. Sign in (Firebase) -> get token.
2. Hit POST `/api/tours/upload-single` with one image + required fields via Postman.
3. Verify 200 and DB: `SELECT * FROM tour_media ORDER BY tour_id DESC LIMIT 1;`
4. Verify `media_ids` length matches expectation.
5. Access `/api/tours` and see hydrated media objects.
6. Update tour name with PUT.
7. Delete a tour; confirm row removal.

---
## 13. Security Notes
- Only authenticated users can create tours (middleware enforced).
- No role restriction added yet; add role check if needed (e.g. only guides).
- Validate file types on backend (already in media upload logic). If you add non-image/video types, adjust MIME whitelist.

---
## 14. Common Pitfalls
| Issue | Cause | Fix |
|-------|-------|-----|
| 400 Missing fields | Not all required fields appended | Ensure tour_name, description, location included before submit |
| Empty `media` array | Upload aborted mid-transaction | Check server logs; network or Cloudinary credentials |
| 401 Unauthorized | Missing/expired Firebase token | Refresh token (`getIdToken(true)`) and retry |
| Broken thumbnails | Using relative path assumption | Use `media.file_path` directly (already full HTTPS URL) |

---
## 15. Example Display Component (Listing)
```tsx
import React, { useEffect, useState } from 'react';
import { listTours } from '../services/apiTours';

export function TourGallery() {
  const [tours,setTours] = useState<any[]>([]);
  const [error,setError] = useState<string|null>(null);
  useEffect(() => { (async () => {
    try { const data = await listTours(); setTours(data.tours || []); } catch(e:any){ setError(e.message); }
  })(); }, []);
  if (error) return <p>Error: {error}</p>;
  return <div className="tour-grid">
    {tours.map(t => (
      <div key={t.tour_id} className="tour-card">
        <h4>{t.tour_name}</h4>
        <p>{t.location}</p>
        <div className="thumb-row">
          {t.media.slice(0,3).map((m:any) => <img key={m.id} src={m.file_path} alt={m.file_name} style={{width:80,height:80,objectFit:'cover'}} />)}
        </div>
      </div>
    ))}
  </div>;
}
```

---
## 16. Troubleshooting
| Symptom | Debug Steps |
|---------|-------------|
| 500 Upload failed | Check server logs for Cloudinary error; verify env vars; ensure memoryStorage used |
| media_ids empty but media rows created | Transaction misconfiguration (report); verify both inserts wrapped | 
| GET list missing media hydration | Ensure backend list endpoint version deployed; check JSON shape |

---
## 17. Environment Variables (Backend)
Ensure these are set:
```
CLOUDINARY_CLOUD_NAME=your_cloud
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

No special frontend env required unless you proxy `VITE_API_BASE`.

---
## 18. Performance Considerations
- Album upload currently serial; you can parallelize media insertion by `Promise.all` AFTER all Cloudinary uploads if throughput needed.
- Thumbnails: For large images use Cloudinary transformation params (e.g. append `/c_fill,w_300,h_300/` before public_id).

---
## 19. Future Enhancements (Optional)
- Add role restriction for tour creation.
- Introduce separate `tags` table or JSONB array.
- Add endpoint to append media to existing tour.
- Soft delete tours (flag) instead of hard delete.
- Caching layer / pagination for `/api/tours`.

---
## 20. Quick Single Upload (cURL Example)
```bash
curl -X POST http://localhost:5000/api/tours/upload-single \
  -H "Authorization: Bearer <TOKEN>" \
  -F tour_name="Mars Dawn" \
  -F description="Sunrise over crater" \
  -F location="Mars Sim Lab" \
  -F file=@./image.jpg
```

---
## 21. Summary
Integrate by adding the API helper, building a form that gathers required tour fields plus files, posting to the correct upload endpoint, and then displaying tours using the listing endpoint. All returned media paths are Cloudinary URLs safe for direct rendering.

Happy building!
