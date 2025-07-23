# Frontend Integration Guide for Guide Application System

This guide explains how to connect your React frontend to the backend API for the guide application system.

## 📋 Overview

The backend provides a complete API for learners to apply for guide roles, including:
- File upload support (resume, certifications, portfolio, references)
- Comprehensive application form handling
- Application status tracking
- Role upgrade upon approval

## 🔗 API Endpoints

### Base URL
```
http://localhost:3000/api/guide-applications
```

### Available Endpoints

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| POST | `/` | Submit new guide application | ✅ |
| GET | `/my-applications` | Get user's applications | ✅ |
| GET | `/:id` | Get specific application details | ✅ |
| PUT | `/:id` | Update pending application | ✅ |
| DELETE | `/:id` | Delete application | ✅ |
| GET | `/` | Get all applications (Admin/Moderator) | ✅ Admin |
| PATCH | `/:id/status` | Change application status (Admin/Moderator) | ✅ Admin |

## 🔐 Authentication

All endpoints require authentication. Include the JWT token in the Authorization header:

```javascript
const token = localStorage.getItem('token'); // or your token storage method
const headers = {
  'Authorization': `Bearer ${token}`,
  'Content-Type': 'application/json'
};
```

For file uploads, use FormData and don't set Content-Type (let the browser set it):
```javascript
const headers = {
  'Authorization': `Bearer ${token}`
  // Don't set Content-Type for FormData
};
```

## 📝 Frontend Form Interface

Your frontend form should match this structure:

```typescript
interface ApplicationForm {
  // Personal Information
  fullName: string;           // Will be split into first_name/last_name
  email: string;
  phone: string;
  dateOfBirth?: string;       // Format: YYYY-MM-DD
  address?: string;
  city?: string;
  
  // Professional Background
  currentOccupation?: string;
  educationLevel?: string;    // e.g., "High School", "Bachelor's", "Master's"
  astronomyEducation?: string;
  guideExperience?: string;   // Previous guide experience
  totalExperience: number;    // Years of experience
  
  // Certifications & Skills
  certifications: string[];   // Array of certification names
  astronomySkills: string[];  // Array of skills
  languages: string[];        // Array of languages spoken
  firstAid: boolean;
  drivingLicense: boolean;
  
  // Camp-Specific Experience
  campTypes: string[];        // Types of camps familiar with
  groupSizes: string[];       // Preferred group sizes
  equipmentFamiliarity: string[]; // Equipment you can handle
  outdoorExperience?: string;
  
  // Availability & Preferences
  availableDates: string[];   // Available date ranges
  preferredLocations: string[]; // Preferred locations
  accommodationNeeds?: string;
  transportationNeeds?: string;
  
  // Additional Information
  motivation?: string;        // Why you want to be a guide
  specialSkills?: string;     // Any special skills
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  
  // Documents (File objects)
  documents?: {
    resume?: File | null;
    certifications?: File | null;
    portfolio?: File | null;
    references?: File | null;
  };
  
  // Selected Camps
  selectedCamps: string[];    // IDs of camps interested in
  
  // Agreement
  termsAccepted: boolean;
  backgroundCheckConsent: boolean;
}
```

## 🔄 API Usage Examples

### 1. Submit New Application

```typescript
const submitApplication = async (formData: ApplicationForm) => {
  const token = localStorage.getItem('token');
  
  // Create FormData for file upload
  const submitData = new FormData();
  
  // Add all form fields (except files)
  const { documents, ...otherData } = formData;
  
  // Add form data as JSON
  Object.entries(otherData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      submitData.append(key, JSON.stringify(value));
    } else {
      submitData.append(key, String(value));
    }
  });
  
  // Add files if they exist
  if (documents) {
    Object.entries(documents).forEach(([key, file]) => {
      if (file) {
        submitData.append(key, file);
      }
    });
  }
  
  try {
    const response = await fetch('/api/guide-applications', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: submitData
    });
    
    const result = await response.json();
    
    if (result.success) {
      console.log('Application submitted:', result.data);
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
};
```

### 2. Get User's Applications

```typescript
const getUserApplications = async () => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch('/api/guide-applications/my-applications', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error fetching applications:', error);
    throw error;
  }
};
```

### 3. Update Application

```typescript
const updateApplication = async (applicationId: number, formData: ApplicationForm) => {
  const token = localStorage.getItem('token');
  
  // Create FormData for file upload
  const updateData = new FormData();
  
  // Add all form fields (except files)
  const { documents, ...otherData } = formData;
  
  // Add form data as JSON
  Object.entries(otherData).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      updateData.append(key, JSON.stringify(value));
    } else {
      updateData.append(key, String(value));
    }
  });
  
  // Add files if they exist
  if (documents) {
    Object.entries(documents).forEach(([key, file]) => {
      if (file) {
        updateData.append(key, file);
      }
    });
  }
  
  try {
    const response = await fetch(`/api/guide-applications/${applicationId}`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: updateData
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error updating application:', error);
    throw error;
  }
};
```

### 4. Get Application Details

```typescript
const getApplicationDetails = async (applicationId: number) => {
  const token = localStorage.getItem('token');
  
  try {
    const response = await fetch(`/api/guide-applications/${applicationId}`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    const result = await response.json();
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message);
    }
  } catch (error) {
    console.error('Error fetching application details:', error);
    throw error;
  }
};
```

## 🎯 React Hook Example

Here's a custom hook for managing guide applications:

```typescript
import { useState, useEffect } from 'react';

interface UseGuideApplications {
  applications: any[];
  loading: boolean;
  error: string | null;
  submitApplication: (formData: ApplicationForm) => Promise<any>;
  updateApplication: (id: number, formData: ApplicationForm) => Promise<any>;
  deleteApplication: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
}

export const useGuideApplications = (): UseGuideApplications => {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const fetchApplications = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await getUserApplications();
      setApplications(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };
  
  const submitApplication = async (formData: ApplicationForm) => {
    setError(null);
    try {
      const result = await submitApplication(formData);
      await fetchApplications(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  
  const updateApplication = async (id: number, formData: ApplicationForm) => {
    setError(null);
    try {
      const result = await updateApplication(id, formData);
      await fetchApplications(); // Refresh list
      return result;
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  
  const deleteApplication = async (id: number) => {
    setError(null);
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/guide-applications/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message);
      }
      
      await fetchApplications(); // Refresh list
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };
  
  useEffect(() => {
    fetchApplications();
  }, []);
  
  return {
    applications,
    loading,
    error,
    submitApplication,
    updateApplication,
    deleteApplication,
    refetch: fetchApplications
  };
};
```

## 📱 Sample React Component

```typescript
import React, { useState } from 'react';
import { useGuideApplications } from './hooks/useGuideApplications';

const GuideApplicationForm: React.FC = () => {
  const { submitApplication, loading, error } = useGuideApplications();
  const [formData, setFormData] = useState<ApplicationForm>({
    fullName: '',
    email: '',
    phone: '',
    totalExperience: 0,
    certifications: [],
    astronomySkills: [],
    languages: [],
    firstAid: false,
    drivingLicense: false,
    campTypes: [],
    groupSizes: [],
    equipmentFamiliarity: [],
    availableDates: [],
    preferredLocations: [],
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    selectedCamps: [],
    termsAccepted: false,
    backgroundCheckConsent: false
  });
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await submitApplication(formData);
      alert('Application submitted successfully!');
      // Reset form or redirect
    } catch (error) {
      console.error('Failed to submit application:', error);
    }
  };
  
  const handleFileChange = (field: string, file: File | null) => {
    setFormData(prev => ({
      ...prev,
      documents: {
        ...prev.documents,
        [field]: file
      }
    }));
  };
  
  return (
    <form onSubmit={handleSubmit} className="guide-application-form">
      {/* Personal Information */}
      <section>
        <h3>Personal Information</h3>
        <input
          type="text"
          placeholder="Full Name"
          value={formData.fullName}
          onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={formData.email}
          onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
          required
        />
        {/* Add more fields as needed */}
      </section>
      
      {/* File Uploads */}
      <section>
        <h3>Documents</h3>
        <div>
          <label>Resume:</label>
          <input
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => handleFileChange('resume', e.target.files?.[0] || null)}
          />
        </div>
        {/* Add more file inputs */}
      </section>
      
      {/* Agreement */}
      <section>
        <label>
          <input
            type="checkbox"
            checked={formData.termsAccepted}
            onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
            required
          />
          I accept the terms and conditions
        </label>
      </section>
      
      {error && <div className="error">{error}</div>}
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
};

export default GuideApplicationForm;
```

## 🔧 Environment Setup

Make sure your backend server is running on the correct port and your frontend can reach it:

1. **Backend URL**: Update the base URL in your API calls to match your backend server
2. **CORS**: Ensure your backend has CORS configured for your frontend domain
3. **File Upload Limits**: The backend accepts files up to 10MB
4. **Supported File Types**: PDF, DOC, DOCX, JPG, JPEG, PNG

## 📊 Application Status Flow

1. **pending** → Application submitted, waiting for review
2. **accepted** → Application approved, user role upgraded to 'guide'
3. **rejected** → Application rejected

## 🎉 Success!

You now have a complete guide application system! The backend handles:
- ✅ File uploads to Firebase Storage
- ✅ Comprehensive application data storage
- ✅ Role-based authentication
- ✅ Application status management
- ✅ Automatic role upgrade upon approval

Your frontend can now connect to these endpoints to provide a seamless user experience for guide applications.
