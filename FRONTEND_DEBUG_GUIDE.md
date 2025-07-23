# Frontend Debug Guide - Fix Controlled/Uncontrolled Input Issues

## 🐛 Issue 1: Controlled/Uncontrolled Input Warning

The warning occurs when form inputs change from `undefined` to a defined value. Here's how to fix it:

### ✅ Solution: Initialize All Form Fields

```typescript
// ❌ WRONG - This causes the warning
const [formData, setFormData] = useState({
  fullName: undefined, // Don't use undefined
  email: undefined,
  // ... other fields
});

// ✅ CORRECT - Initialize with empty strings/appropriate defaults
const [formData, setFormData] = useState<ApplicationForm>({
  // Personal Information
  fullName: '',                    // Empty string, not undefined
  email: '',
  phone: '',
  dateOfBirth: '',
  address: '',
  city: '',
  
  // Professional Background
  currentOccupation: '',
  educationLevel: '',
  astronomyEducation: '',
  guideExperience: '',
  totalExperience: 0,              // Number, not undefined
  
  // Certifications & Skills (Always arrays)
  certifications: [],              // Empty array, not undefined
  astronomySkills: [],
  languages: [],
  firstAid: false,                 // Boolean, not undefined
  drivingLicense: false,
  
  // Camp-Specific Experience
  campTypes: [],
  groupSizes: [],
  equipmentFamiliarity: [],
  outdoorExperience: '',
  
  // Availability & Preferences
  availableDates: [],
  preferredLocations: [],
  accommodationNeeds: '',
  transportationNeeds: '',
  
  // Additional Information
  motivation: '',
  specialSkills: '',
  emergencyContact: {              // Object with all required fields
    name: '',
    relationship: '',
    phone: ''
  },
  
  // Documents
  documents: {                     // Object with all fields initialized
    resume: null,
    certifications: null,
    portfolio: null,
    references: null
  },
  
  // Selected Camps
  selectedCamps: [],
  
  // Agreement
  termsAccepted: false,
  backgroundCheckConsent: false
});
```

### ✅ Fix Input Components

```typescript
// ❌ WRONG - Value might be undefined
<input
  type="text"
  value={formData.fullName}  // Could be undefined
  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
/>

// ✅ CORRECT - Always provide a fallback
<input
  type="text"
  value={formData.fullName || ''}  // Fallback to empty string
  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
/>

// OR initialize properly so no fallback is needed
<input
  type="text"
  value={formData.fullName}  // Safe if initialized properly
  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
/>
```

### ✅ Fix Array/Object Fields

```typescript
// For arrays (skills, certifications, etc.)
const handleArrayChange = (field: keyof ApplicationForm, values: string[]) => {
  setFormData(prev => ({
    ...prev,
    [field]: values || []  // Always ensure it's an array
  }));
};

// For emergency contact object
const handleEmergencyContactChange = (field: string, value: string) => {
  setFormData(prev => ({
    ...prev,
    emergencyContact: {
      ...prev.emergencyContact,
      [field]: value || ''  // Always ensure it's a string
    }
  }));
};
```

## 🐛 Issue 2: Backend 500 Error

### ✅ Check Your API Request Format

Make sure your frontend is sending data in the correct format:

```typescript
const submitApplication = async (formData: ApplicationForm) => {
  const token = localStorage.getItem('token');
  
  if (!token) {
    throw new Error('No authentication token found');
  }
  
  // Create FormData for file upload
  const submitData = new FormData();
  
  // Add all non-file fields
  const { documents, ...otherData } = formData;
  
  // Convert complex objects/arrays to JSON strings
  Object.entries(otherData).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      // Skip null/undefined values or set defaults
      return;
    }
    
    if (typeof value === 'object') {
      // Convert objects/arrays to JSON
      submitData.append(key, JSON.stringify(value));
    } else {
      // Convert primitive values to strings
      submitData.append(key, String(value));
    }
  });
  
  // Add files if they exist
  if (documents) {
    Object.entries(documents).forEach(([key, file]) => {
      if (file instanceof File) {
        submitData.append(key, file);
      }
    });
  }
  
  // Debug: Log what we're sending
  console.log('Submitting application data:');
  for (let [key, value] of submitData.entries()) {
    console.log(\`\${key}:\`, value);
  }
  
  try {
    const response = await fetch('/api/guide-applications', {
      method: 'POST',
      headers: {
        'Authorization': \`Bearer \${token}\`
        // Don't set Content-Type for FormData
      },
      body: submitData
    });
    
    const result = await response.json();
    
    if (!response.ok) {
      throw new Error(\`Server error: \${response.status} \${response.statusText}\`);
    }
    
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Application submission failed');
    }
  } catch (error) {
    console.error('Error submitting application:', error);
    throw error;
  }
};
```

### ✅ Validate Required Fields Before Submission

```typescript
const validateForm = (formData: ApplicationForm): string[] => {
  const errors: string[] = [];
  
  // Required fields
  if (!formData.fullName?.trim()) errors.push('Full name is required');
  if (!formData.email?.trim()) errors.push('Email is required');
  if (!formData.phone?.trim()) errors.push('Phone is required');
  if (formData.totalExperience < 0) errors.push('Total experience must be 0 or greater');
  if (!formData.emergencyContact?.name?.trim()) errors.push('Emergency contact name is required');
  if (!formData.emergencyContact?.phone?.trim()) errors.push('Emergency contact phone is required');
  if (!formData.termsAccepted) errors.push('You must accept the terms and conditions');
  
  return errors;
};

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // Validate form
  const validationErrors = validateForm(formData);
  if (validationErrors.length > 0) {
    console.error('Validation errors:', validationErrors);
    alert('Please fix the following errors:\\n' + validationErrors.join('\\n'));
    return;
  }
  
  try {
    await submitApplication(formData);
    alert('Application submitted successfully!');
  } catch (error) {
    console.error('Submission error:', error);
    alert('Failed to submit application. Please try again.');
  }
};
```

## 🔧 Complete Working Example

```typescript
import React, { useState } from 'react';

interface ApplicationForm {
  fullName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  address: string;
  city: string;
  currentOccupation: string;
  educationLevel: string;
  astronomyEducation: string;
  guideExperience: string;
  totalExperience: number;
  certifications: string[];
  astronomySkills: string[];
  languages: string[];
  firstAid: boolean;
  drivingLicense: boolean;
  campTypes: string[];
  groupSizes: string[];
  equipmentFamiliarity: string[];
  outdoorExperience: string;
  availableDates: string[];
  preferredLocations: string[];
  accommodationNeeds: string;
  transportationNeeds: string;
  motivation: string;
  specialSkills: string;
  emergencyContact: {
    name: string;
    relationship: string;
    phone: string;
  };
  documents: {
    resume: File | null;
    certifications: File | null;
    portfolio: File | null;
    references: File | null;
  };
  selectedCamps: string[];
  termsAccepted: boolean;
  backgroundCheckConsent: boolean;
}

const GuideApplicationForm: React.FC = () => {
  // ✅ CORRECT: All fields properly initialized
  const [formData, setFormData] = useState<ApplicationForm>({
    fullName: '',
    email: '',
    phone: '',
    dateOfBirth: '',
    address: '',
    city: '',
    currentOccupation: '',
    educationLevel: '',
    astronomyEducation: '',
    guideExperience: '',
    totalExperience: 0,
    certifications: [],
    astronomySkills: [],
    languages: [],
    firstAid: false,
    drivingLicense: false,
    campTypes: [],
    groupSizes: [],
    equipmentFamiliarity: [],
    outdoorExperience: '',
    availableDates: [],
    preferredLocations: [],
    accommodationNeeds: '',
    transportationNeeds: '',
    motivation: '',
    specialSkills: '',
    emergencyContact: {
      name: '',
      relationship: '',
      phone: ''
    },
    documents: {
      resume: null,
      certifications: null,
      portfolio: null,
      references: null
    },
    selectedCamps: [],
    termsAccepted: false,
    backgroundCheckConsent: false
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      await submitApplication(formData);
      alert('Application submitted successfully!');
    } catch (error) {
      console.error('Submission error:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* ✅ All inputs are controlled with proper values */}
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
      
      <input
        type="number"
        placeholder="Total Experience (years)"
        value={formData.totalExperience}
        onChange={(e) => setFormData(prev => ({ ...prev, totalExperience: parseInt(e.target.value) || 0 }))}
        min="0"
        required
      />
      
      <label>
        <input
          type="checkbox"
          checked={formData.termsAccepted}
          onChange={(e) => setFormData(prev => ({ ...prev, termsAccepted: e.target.checked }))}
          required
        />
        I accept the terms and conditions
      </label>
      
      <button type="submit" disabled={loading}>
        {loading ? 'Submitting...' : 'Submit Application'}
      </button>
    </form>
  );
};

export default GuideApplicationForm;
```

## 🚀 Testing Steps

1. **Start the debug server**: Run \`node debug-guide-api.js\` to get detailed error logs
2. **Update your frontend**: Fix all undefined values in form initialization
3. **Test with minimal data**: Submit with just required fields first
4. **Check console logs**: Look for detailed error messages in both frontend and backend
5. **Verify data format**: Ensure arrays/objects are properly formatted before sending

This should resolve both the controlled input warning and the 500 server error!
