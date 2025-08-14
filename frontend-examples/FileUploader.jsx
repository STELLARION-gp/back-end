// frontend-examples/FileUploader.jsx
// Minimal React component demonstrating Cloudinary upload via backend
import React, { useState } from 'react';

async function uploadFileClient(file, folder = 'general') {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('folder', folder);

  const res = await fetch('/api/upload', {
    method: 'POST',
    body: formData
  });

  const data = await res.json();
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Upload failed');
  }
  return data.url;
}

export default function FileUploader() {
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  const onChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setUploading(true);
    try {
      const uploadedUrl = await uploadFileClient(file, 'user_uploads');
      console.log('Uploaded URL:', uploadedUrl);
      setUrl(uploadedUrl);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div style={{ padding: 16, border: '1px solid #ccc', maxWidth: 420 }}>
      <h3>File Uploader</h3>
      <input type="file" onChange={onChange} disabled={uploading} />
      {uploading && <p>Uploading...</p>}
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {url && (
        <div>
          <p>Uploaded URL:</p>
          <a href={url} target="_blank" rel="noreferrer">{url}</a>
        </div>
      )}
    </div>
  );
}

export { uploadFileClient };
