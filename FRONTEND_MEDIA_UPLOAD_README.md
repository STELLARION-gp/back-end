# Frontend Media Upload Integration Guide

Integrate your React frontend with the backend media upload and listing endpoints (`/api/media`). This pairs with the backend described in `MEDIA_UPLOAD_README.md`.

---
## 1. Feature Overview
Uploads a single file per request (jpg, jpeg, png, mp4, pdf ≤ 5MB), stores it in `/uploads`, records metadata in `media_uploads` table, and returns the DB record. Auth required (Firebase ID token in `Authorization: Bearer <token>`).

Endpoints:
| Method | Path        | Auth | Description                                |
|--------|-------------|------|--------------------------------------------|
| POST   | /api/media  | Yes  | Upload one file (multipart, field: `file`) |
| GET    | /api/media  | Yes  | List current user's uploaded files         |

---
## 2. Prerequisites
- Backend running (`npm run dev`) and media routes mounted.
- Valid Firebase ID token stored in `localStorage` as `token` (adjust if different).
- Optional: Static serving in backend: `app.use('/uploads', express.static('uploads'));`
- Optional Vite proxy for `/api` + `/uploads` to avoid CORS.

Vite proxy snippet (`vite.config.ts`):
```ts
server: {
  proxy: {
    '/api': 'http://localhost:5000',
    '/uploads': 'http://localhost:5000'
  }
}
```

---
## 3. Install Dependencies
```bash
npm i axios
```
(You can use fetch; axios enables progress callbacks.)

---
## 4. API Helper (create `src/api/media.ts`)
```ts
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE || '';

function authHeaders() {
  const token = localStorage.getItem('token');
  if (!token) throw new Error('Missing auth token');
  return { Authorization: `Bearer ${token}` };
}

export async function uploadMediaFile(
  file: File,
  onProgress?: (percent: number) => void
) {
  const form = new FormData();
  form.append('file', file);
  const res = await axios.post('/api/media', form, {
    baseURL: API_BASE,
    headers: { ...authHeaders() },
    onUploadProgress: evt => {
      if (!onProgress || !evt.total) return;
      onProgress(Math.round((evt.loaded / evt.total) * 100));
    }
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'Upload failed');
  return res.data.file; // { id, file_name, file_path, file_type, file_size, created_at }
}

export async function listUserMedia() {
  const res = await axios.get('/api/media', {
    baseURL: API_BASE,
    headers: { ...authHeaders() }
  });
  if (!res.data?.success) throw new Error(res.data?.message || 'List failed');
  return res.data.files; // array
}
```

---
## 5. Data Shape (Frontend)
```ts
type UploadStatus = 'pending' | 'uploading' | 'success' | 'error';
interface MediaItem {
  tempId: string;
  dbId?: number;
  file: File | null;        // null for records loaded from DB (no original blob)
  name: string;
  size: number;
  type: string;
  localPreview?: string;     // object URL before server URL known
  serverUrl?: string;        // file_path from backend (e.g. /uploads/...) 
  progress: number;          // 0-100
  status: UploadStatus;
  error?: string;
  meta?: { description?: string; album?: string; };
}
```

---
## 6. Upload Logic Example
```tsx
import { useState } from 'react';
import { uploadMediaFile, listUserMedia } from '@/api/media';

function useMediaUploads() {
  const [items, setItems] = useState<MediaItem[]>([]);

  async function initExisting() {
    try {
      const files = await listUserMedia();
      setItems(files.map((f: any) => ({
        tempId: 'db-' + f.id,
        dbId: f.id,
        file: null,
        name: f.file_name,
        size: f.file_size,
        type: f.file_type,
        serverUrl: f.file_path,
        progress: 100,
        status: 'success'
      })));
    } catch (e) { console.error('List failed', e); }
  }

  async function uploadSingle(file: File) {
    const tempId = crypto.randomUUID();
    const localPreview = URL.createObjectURL(file);
    setItems(prev => [...prev, {
      tempId, file, name: file.name, size: file.size, type: file.type,
      localPreview, progress: 0, status: 'uploading'
    }]);

    try {
      const record = await uploadMediaFile(file, (p) => {
        setItems(prev => prev.map(i => i.tempId === tempId ? { ...i, progress: p } : i));
      });
      setItems(prev => prev.map(i => i.tempId === tempId ? {
        ...i,
        dbId: record.id,
        serverUrl: record.file_path,
        status: 'success',
        progress: 100
      } : i));
    } catch (err: any) {
      setItems(prev => prev.map(i => i.tempId === tempId ? {
        ...i,
        status: 'error',
        error: err.message || 'Upload failed'
      } : i));
    }
  }

  return { items, uploadSingle, initExisting };
}
```

---
## 7. Simple Component
```tsx
function SimpleMediaUploader() {
  const { items, uploadSingle, initExisting } = useMediaUploads();
  useEffect(() => { initExisting(); }, []);

  return (
    <div>
      <input type="file" onChange={e => e.target.files && uploadSingle(e.target.files[0])} />
      <ul>
        {items.map(item => (
          <li key={item.tempId}>
            {item.name} - {item.progress}% - {item.status}
            {item.status === 'error' && <span style={{color:'red'}}> {item.error}</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}
```

---
## 8. Integrating With Existing `MediaUploadPanel`
1. Replace simulated progress intervals with `uploadMediaFile` progress callback.
2. Maintain `MediaItem` state shape; map existing preview logic to `localPreview`.
3. On mount, preload server files via `initExisting()`.
4. For album mode: iterate through selected files sequentially (or limited concurrency) calling `uploadSingle`.
5. After successful upload, show server URL (prefix with backend origin if needed: `http://localhost:5000` if not proxied).

---
## 9. Deriving Full URL
If using proxy, `serverUrl` (e.g. `/uploads/xyz.jpg`) works directly in `<img src>`.
Otherwise:
```ts
const API_ORIGIN = import.meta.env.VITE_API_ORIGIN || 'http://localhost:5000';
const full = item.serverUrl?.startsWith('/') ? API_ORIGIN + item.serverUrl : item.serverUrl;
```

---
## 10. Retry Pattern
```ts
async function retry(item: MediaItem) {
  if (!item.file) return;
  // Remove old error entry
  setItems(prev => prev.filter(i => i.tempId !== item.tempId));
  await uploadSingle(item.file);
}
```
Button: show when `item.status === 'error'`.

---
## 11. Validation (Client-Side Precheck Optional)
```ts
const ALLOWED = ['image/jpeg','image/png','image/jpg','video/mp4','application/pdf'];
function validate(file: File) {
  if (!ALLOWED.includes(file.type)) throw new Error('Unsupported type');
  if (file.size > 5 * 1024 * 1024) throw new Error('File exceeds 5MB');
}
```
Call before uploading to fail fast.

---
## 12. Testing Checklist
| Scenario | Expected |
|----------|----------|
| Valid PNG | Upload completes, record listed |
| 6MB file | Client or server rejects (size error) |
| Disallowed type | Error message |
| Refresh page | Previously uploaded items appear |
| Missing token | 401 -> handled gracefully |
| Rapid multiple uploads | Each shows independent progress |

---
## 13. Environment Variables (Frontend)
Optional if you want dynamic base URLs:
```
VITE_API_BASE=
VITE_API_ORIGIN=http://localhost:5000
```
Use when deploying with distinct backend origin.

---
## 14. Hardening & Enhancements
| Enhancement | Benefit |
|-------------|---------|
| AbortController | Cancel in-progress upload |
| Delete endpoint | Allow media removal |
| Pagination on GET | Scale for large libraries |
| Hash duplicate check | Prevent redundant uploads |
| Drag-and-drop visual cues | Better UX |
| Accessibility labels | Screen reader support |

---
## 15. Common Errors
| Message | Cause | Fix |
|---------|-------|-----|
| 401 Authentication required | Missing/expired token | Refresh Firebase token, re-login |
| Upload failed | Server validation (type/size) | Check constraints & file type |
| CORS error | Missing proxy / CORS config | Add Vite proxy or backend CORS origin |

---
## 16. Quick Start Summary
1. Add API helpers (`uploadMediaFile`, `listUserMedia`).
2. Implement state & upload function with progress.
3. Replace simulated logic in existing panel.
4. Preload existing media on mount.
5. Display server URLs / previews & handle errors.

---
Ready to implement.
