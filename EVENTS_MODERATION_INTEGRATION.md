## Events Moderation Backend Integration

### Overview
Events now include moderation workflow with statuses: `pending`, `approved`, `rejected`. New events default to `pending` and cannot be self‑moderated by their creator unless the creator is an `admin`.

### Schema Additions
Added columns to `events` table:
```
status VARCHAR(50) DEFAULT 'pending'
created_by INT NOT NULL REFERENCES users(id)
moderated_by INT REFERENCES users(id)
```

Indexes: `idx_events_moderation_status`, `idx_events_created_by`, `idx_events_moderated_by`.

### Prisma Model Additions
Fields: `status`, `created_by`, `moderated_by` with relations to `users`.

### Endpoints
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | /api/events | Create event (status=pending) | Any authenticated user |
| GET | /api/events | List events | Public (adjust if needed) |
| GET | /api/events/:id | Get single event | Public |
| PUT | /api/events/:id | Update (non‑moderation data) | Creator OR higher (adjust as needed) |
| PUT | /api/events/:id/status | Moderate (approve/reject) | Moderator/Admin (not creator) |
| DELETE | /api/events/:id | Delete event | Creator, Moderator, Admin |

### Create Event (Frontend)
```
const token = authToken;
await fetch('/api/events', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    event_name: 'Astronomy Workshop 2025',
    society_name: 'Space Society',
    description: 'Hands-on telescope session',
    visibility: 'public',
    date: '2025-09-10',
    time: '18:00',
    location: 'Main Hall',
    event_category: 'Workshop',
    organized_by: 'Dr. Jane',
    event_status: 'draft'
  })
});
```
Response contains `status: "pending"` plus `created_by`.

### Fetch for Moderation List
```
const res = await fetch('/api/events');
const { events } = await res.json();
// Map to frontend shape if different
```

### Approve / Reject
```
async function moderate(id, action, token) { // action = 'approve' | 'reject'
  const res = await fetch(`/api/events/${id}/status`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ action })
  });
  return res.json();
}
```
Server enforces:
1. Creator cannot moderate own event (unless admin)
2. User role must be `moderator` or `admin`

### Hide Buttons for Creator
When rendering each event:
```
const isCreator = event.created_by === currentUser.id;
const canModerate = (currentUser.role === 'admin' || currentUser.role === 'moderator') && !isCreator;
```
Then conditionally show Approve / Reject buttons only if `canModerate`.

### Mapping Backend -> Frontend (Example)
Backend event fields vs current frontend mock (`PlatformEvent`):
```
backend.id            -> event.id
backend.event_name    -> event.eventName
backend.society_name  -> event.societyName
backend.date          -> event.date (toISOString().slice(0,10) if needed)
backend.time          -> event.time
backend.location      -> event.location
backend.event_category-> event.eventCategory
backend.needed_volunteers_count -> event.neededVolunteers
backend.description   -> event.description
backend.organized_by  -> event.organizedBy
backend.image_urls    -> event.imageUrls
backend.max_participants -> event.maxParticipants
backend.event_status  -> event.eventStatus
backend.created_at    -> event.created_at
backend.status        -> event.status
backend.created_by    -> event.created_by (for permission checks)
backend.moderated_by  -> event.moderated_by
```

Transform example:
```
function mapBackend(e) {
  return {
    id: e.id.toString(),
    eventName: e.event_name,
    societyName: e.society_name,
    date: e.date.split('T')[0],
    time: e.time,
    location: e.location,
    eventCategory: e.event_category,
    neededVolunteers: e.needed_volunteers_count || 0,
    description: e.description,
    organizedBy: e.organized_by,
    imageUrls: e.image_urls || [],
    maxParticipants: e.max_participants || 0,
    eventStatus: e.event_status,
    created_at: e.created_at,
    status: e.status,
    priority: 'medium', // derive separately if needed
    reportCount: 0,
  };
}
```

### Error Responses
```
{ "success": false, "message": "Creators cannot moderate their own events" }
{ "success": false, "message": "Insufficient role to moderate event" }
```

### Testing Quick Commands (PowerShell)
```powershell
# Create (as normal user)
curl -Method POST http://localhost:5000/api/events -H "Authorization: Bearer $token" -ContentType 'application/json' -Body '{"event_name":"Test","society_name":"Soc","description":"Desc","visibility":"public","date":"2025-10-01","time":"18:00","location":"Hall","event_category":"Workshop","organized_by":"Org","event_status":"draft"}'

# Moderate (as moderator/admin)
curl -Method PUT http://localhost:5000/api/events/1/status -H "Authorization: Bearer $modToken" -ContentType 'application/json' -Body '{"action":"approve"}'
```

---
This document will stay updated alongside moderation changes.
