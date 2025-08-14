# Media Upload Feature

## Overview
Implements user-specific media upload with local storage and database tracking via Prisma / PostgreSQL.

## Table Definition (PostgreSQL)
See `sql/create_media_uploads.sql` or run:
```sql
CREATE TABLE IF NOT EXISTS media_uploads (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  file_name VARCHAR(255) NOT NULL,
  file_path VARCHAR(500) NOT NULL,
  file_type VARCHAR(100) NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_media_uploads_user_id ON media_uploads(user_id);
```

## API Endpoints
| Method | Path            | Auth | Description |
|--------|-----------------|------|-------------|
| POST   | /api/media      | Yes  | Upload one file (multipart field name: `file`) |
| GET    | /api/media      | Yes  | List current user's uploaded files |

## Upload Constraints
- Allowed types: jpg, jpeg, png, mp4, pdf
- Max size: 5MB
- Stored in `/uploads` directory
- Metadata persisted to `media_uploads` table

## Auth
Uses existing `verifyToken` middleware. Requires valid Firebase JWT; attaches `user.userId` used as FK.

## Frontend Example (Axios)
```ts
import axios from 'axios';

export async function uploadUserMedia(file: File) {
  const form = new FormData();
  form.append('file', file);
  const token = localStorage.getItem('token');
  const res = await axios.post('/api/media', form, {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.file; // { id, file_name, file_path, ... }
}

export async function listUserMedia() {
  const token = localStorage.getItem('token');
  const res = await axios.get('/api/media', {
    headers: { Authorization: `Bearer ${token}` }
  });
  return res.data.files;
}
```

## Integration Notes
- Serve static files: add `app.use('/uploads', express.static('uploads'))` if public access needed.
- For production, consider storing files in S3 / Cloudinary instead of local disk.
- Add cleanup / quota enforcement as needed.

## Migration Steps
1. Run SQL: `psql $DATABASE_URL -f sql/create_media_uploads.sql`
2. Update Prisma: `npx prisma db pull && npx prisma generate` (after table creation)
3. Restart server.

## Security Considerations
- Validate MIME/extension alignment if stricter control needed.
- Sanitize original file names if later exposed directly (currently we store original for reference, generated filename used on disk).
- Add rate limiting on upload route to prevent abuse.
