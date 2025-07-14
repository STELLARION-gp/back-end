# Application APIs Documentation

This document describes the Mentor, Influencer, and Guide Application APIs, including endpoints, request/response structures, and authentication requirements.

---

## Mentor Application APIs

### Create Mentor Application
`POST /api/mentor-applications`
- **Auth:** Required (Bearer token)
- **Body:**
```json
{
  "phone_number": "string",
  "date_of_birth": "YYYY-MM-DD",
  "country": "string",
  "profile_bio": "string",
  "educational_background": "string",
  "area_of_expertise": ["string"],
  "linkedin_profile": "string",
  "intro_video_url": "string",
  "max_mentees": 3,
  "availability_schedule": { "monday": ["09:00-12:00"] },
  "motivation_statement": "string",
  "portfolio_attachments": ["url"]
}
```
- **Response:** `201 Created`

---

### List Mentor Applications
`GET /api/mentor-applications`
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": [ { ...application } ]
}
```

---

### Get Mentor Application
`GET /api/mentor-applications/{id}`
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "data": { ...application }
}
```

---

### Update Mentor Application
`PUT /api/mentor-applications/{id}`
- **Auth:** Required
- **Body:** Same as create
- **Response:**
```json
{
  "success": true,
  "data": { ...application }
}
```

---

### Delete Mentor Application
`DELETE /api/mentor-applications/{id}`
- **Auth:** Required
- **Response:**
```json
{
  "success": true,
  "message": "Deleted"
}
```

---

### Change Mentor Application Status
`PATCH /api/mentor-applications/{id}/status`
- **Auth:** Required (admin/mod only)
- **Body:**
```json
{
  "status": "accepted" | "pending" | "rejected"
}
```
- **Response:**
```json
{
  "success": true,
  "data": { ...application }
}
```

---

## Influencer Application APIs

### Create Influencer Application
`POST /api/influencer-applications`
- **Auth:** Required
- **Body:**
```json
{
  "phone_number": "string",
  "country": "string",
  "bio": "string",
  "specialization_tags": ["string"],
  "social_links": { "youtube": "url" },
  "intro_video_url": "string",
  "sample_content_links": ["url"],
  "preferred_session_format": "Live" | "Recorded" | "Hybrid",
  "willing_to_host_sessions": true,
  "tools_used": ["string"]
}
```
- **Response:** `201 Created`

---

### List Influencer Applications
`GET /api/influencer-applications`
- **Auth:** Required

### Get Influencer Application
`GET /api/influencer-applications/{id}`
- **Auth:** Required

### Update Influencer Application
`PUT /api/influencer-applications/{id}`
- **Auth:** Required
- **Body:** Same as create

### Delete Influencer Application
`DELETE /api/influencer-applications/{id}`
- **Auth:** Required

### Change Influencer Application Status
`PATCH /api/influencer-applications/{id}/status`
- **Auth:** Required (admin/mod only)
- **Body:**
```json
{
  "status": "accepted" | "pending" | "rejected"
}
```

---

## Guide Application APIs

### Create Guide Application
`POST /api/guide-applications`
- **Auth:** Required
- **Body:**
```json
{
  "phone_number": "string",
  "country": "string",
  "languages_spoken": ["string"],
  "certifications": ["string"],
  "stargazing_expertise": ["string"],
  "operating_locations": ["string"],
  "profile_bio": "string",
  "services_offered": ["string"],
  "max_group_size": 10,
  "pricing_range": "LKR 2000–5000",
  "photos_or_videos_links": ["url"],
  "availability_schedule": { "friday": ["18:00-22:00"] },
  "payment_method_pref": "Bank" | "e-wallet" | "PayPal" | "Other"
}
```
- **Response:** `201 Created`

---

### List Guide Applications
`GET /api/guide-applications`
- **Auth:** Required

### Get Guide Application
`GET /api/guide-applications/{id}`
- **Auth:** Required

### Update Guide Application
`PUT /api/guide-applications/{id}`
- **Auth:** Required
- **Body:** Same as create

### Delete Guide Application
`DELETE /api/guide-applications/{id}`
- **Auth:** Required

### Change Guide Application Status
`PATCH /api/guide-applications/{id}/status`
- **Auth:** Required (admin/mod only)
- **Body:**
```json
{
  "status": "accepted" | "pending" | "rejected"
}
```

---

## Common Notes
- All endpoints require authentication (Bearer token).
- Only the owner can edit/delete their own application if status is `pending`.
- Only admin/moderator can approve/reject applications.
- All deletes are soft deletes (`deletion_status = true`).
- All timestamps are ISO strings.
