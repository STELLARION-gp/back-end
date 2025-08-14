# Universal Cloudinary File Upload System

## Overview
Adds a production-ready universal upload endpoint to handle images, videos, PDFs and any other file type through Cloudinary using `resource_type: auto`.

## Backend Components

1. `config/cloudinary.ts` – Centralized Cloudinary config (uses environment variables)
2. `controllers/upload.controller.ts` – Exposes reusable `uploadFile(filePath, folder)` and HTTP handler
3. `routes/upload.routes.ts` – `POST /api/upload` endpoint (multipart form, field name: `file`)
4. `index.ts` – Route mounted at `/api/upload`

## Environment Variables
Add to your `.env` file:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

## Endpoint
`POST /api/upload`

FormData fields:
- `file` (required) – The file blob
- `folder` (optional) – Target Cloudinary folder (default: `general`)

Success Response:
```json
{ "success": true, "url": "https://res.cloudinary.com/..." }
```
Error Response:
```json
{ "success": false, "message": "Upload failed" }
```

## Frontend Helper (React)
Located at `frontend-examples/FileUploader.jsx`, exports:
- `uploadFileClient(file, folder?)` – Returns Cloudinary URL
- `FileUploader` – Minimal demo component

## Usage Example
```js
import { uploadFileClient } from './FileUploader';

async function handleSelect(e) {
  const file = e.target.files[0];
  const url = await uploadFileClient(file, 'my_folder');
  console.log(url);
}
```

## Error Handling
- Backend: Returns structured JSON with `success` and `message`
- Frontend: Throws on non-OK or unsuccessful response
- Temp files always deleted (best-effort) after Cloudinary upload

## Notes
- File size limit: 25MB (adjust in `routes/upload.routes.ts`)
- Disk storage used (Cloudinary requires local path). For memory storage you would need to stream manually.
- Extend security (auth / mime filtering / rate limiting) as needed for production.

## Next Steps
- Add auth middleware if you want to restrict uploads
- Persist uploaded URL with related entities in DB
- Add file type validation if required
