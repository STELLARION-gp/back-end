// Debug script to test guide application API endpoint
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { Pool } = require('pg');
require('dotenv').config();

// Create Express app for testing
const app = express();
app.use(cors());
app.use(express.json());

// Database connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: parseInt(process.env.DB_PORT || "5432"),
});

// Mock Firebase admin (for testing without actual Firebase)
const mockFirebase = {
  storage: () => ({
    bucket: () => ({
      file: (fileName) => ({
        createWriteStream: () => {
          const stream = require('stream').PassThrough();
          setTimeout(() => {
            stream.emit('finish');
          }, 100);
          return stream;
        },
        makePublic: () => Promise.resolve()
      })
    })
  })
};

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({ 
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/png',
      'image/jpg'
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and images are allowed.'));
    }
  }
});

// Mock upload to Firebase function
const uploadToFirebase = async (file, path) => {
  // Simulate Firebase upload
  console.log(`📁 Mock uploading file: ${file.originalname} to ${path}`);
  return `https://storage.googleapis.com/mock-bucket/${path}/${Date.now()}-${file.originalname}`;
};

// Mock verify token middleware
const verifyToken = (req, res, next) => {
  // Mock user authentication
  req.user = { id: 1 };
  next();
};

// Debug version of createGuideApplication
const createGuideApplication = async (req, res) => {
  const client = await pool.connect();
  
  try {
    console.log('\n🔍 DEBUG: Starting guide application creation...');
    console.log('📨 Request body keys:', Object.keys(req.body));
    console.log('📎 Request files:', req.files ? Object.keys(req.files) : 'No files');
    
    await client.query('BEGIN');
    
    const userId = req.user.id;
    console.log('👤 User ID:', userId);
    
    // Log the request body
    console.log('📋 Full request body:', JSON.stringify(req.body, null, 2));
    
    // Check if required fields are present
    const requiredFields = ['fullName', 'email', 'phone', 'totalExperience', 'emergencyContact', 'termsAccepted'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      console.log('❌ Missing required fields:', missingFields);
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }
    
    // Parse the body data
    const body = {};
    
    // Handle string fields that might be JSON
    Object.entries(req.body).forEach(([key, value]) => {
      try {
        // Try to parse as JSON if it's a string that looks like JSON
        if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
          body[key] = JSON.parse(value);
        } else {
          body[key] = value;
        }
      } catch (e) {
        // If parsing fails, keep original value
        body[key] = value;
      }
    });
    
    console.log('📝 Parsed body:', JSON.stringify(body, null, 2));
    
    // Split fullName into first_name and last_name
    const fullName = body.fullName || '';
    const [firstName, ...lastNameParts] = fullName.trim().split(' ');
    const lastName = lastNameParts.join(' ') || '';
    
    console.log(`👤 Name split: "${firstName}" + "${lastName}"`);
    
    // Handle file uploads
    let documentUrls = {};
    
    if (req.files) {
      console.log('📎 Processing file uploads...');
      const files = req.files;
      
      for (const [fieldName, fileArray] of Object.entries(files)) {
        if (fileArray && fileArray.length > 0) {
          const file = fileArray[0];
          console.log(`📄 Uploading ${fieldName}: ${file.originalname}`);
          const firebaseUrl = await uploadToFirebase(file, `guide-applications/${userId}/${fieldName}`);
          documentUrls[fieldName] = firebaseUrl;
        }
      }
    }
    
    console.log('📁 Document URLs:', documentUrls);
    
    // Prepare data with defaults
    const applicationData = {
      firstName: firstName || 'Unknown',
      lastName: lastName || '',
      email: body.email || '',
      phone: body.phone || '',
      dateOfBirth: body.dateOfBirth || null,
      address: body.address || null,
      city: body.city || null,
      
      currentOccupation: body.currentOccupation || null,
      educationLevel: body.educationLevel || null,
      astronomyEducation: body.astronomyEducation || null,
      guideExperience: body.guideExperience || null,
      totalExperience: parseInt(body.totalExperience) || 0,
      
      certifications: Array.isArray(body.certifications) ? body.certifications : [],
      astronomySkills: Array.isArray(body.astronomySkills) ? body.astronomySkills : [],
      languages: Array.isArray(body.languages) ? body.languages : [],
      firstAid: Boolean(body.firstAid),
      drivingLicense: Boolean(body.drivingLicense),
      
      campTypes: Array.isArray(body.campTypes) ? body.campTypes : [],
      groupSizes: Array.isArray(body.groupSizes) ? body.groupSizes : [],
      equipmentFamiliarity: Array.isArray(body.equipmentFamiliarity) ? body.equipmentFamiliarity : [],
      outdoorExperience: body.outdoorExperience || null,
      
      availableDates: Array.isArray(body.availableDates) ? body.availableDates : [],
      preferredLocations: Array.isArray(body.preferredLocations) ? body.preferredLocations : [],
      accommodationNeeds: body.accommodationNeeds || null,
      transportationNeeds: body.transportationNeeds || null,
      
      motivation: body.motivation || null,
      specialSkills: body.specialSkills || null,
      emergencyContact: body.emergencyContact || {},
      
      selectedCamps: Array.isArray(body.selectedCamps) ? body.selectedCamps : [],
      
      termsAccepted: Boolean(body.termsAccepted),
      backgroundCheckConsent: Boolean(body.backgroundCheckConsent)
    };
    
    console.log('🎯 Final application data prepared');
    
    // Insert guide application
    const query = `
      INSERT INTO guide_application (
        user_id, first_name, last_name, email, phone, date_of_birth, address, city,
        current_occupation, education_level, astronomy_education, guide_experience, total_experience,
        certifications, astronomy_skills, languages, first_aid, driving_license,
        camp_types, group_sizes, equipment_familiarity, outdoor_experience,
        available_dates, preferred_locations, accommodation_needs, transportation_needs,
        motivation, special_skills, emergency_contact,
        documents, selected_camps,
        terms_accepted, background_check_consent,
        application_status, approve_application_status, deletion_status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, $26,
        $27, $28, $29,
        $30, $31,
        $32, $33,
        'pending', 'pending', false
      ) RETURNING application_id
    `;
    
    const values = [
      userId,
      applicationData.firstName,
      applicationData.lastName,
      applicationData.email,
      applicationData.phone,
      applicationData.dateOfBirth,
      applicationData.address,
      applicationData.city,
      
      applicationData.currentOccupation,
      applicationData.educationLevel,
      applicationData.astronomyEducation,
      applicationData.guideExperience,
      applicationData.totalExperience,
      
      JSON.stringify(applicationData.certifications),
      JSON.stringify(applicationData.astronomySkills),
      JSON.stringify(applicationData.languages),
      applicationData.firstAid,
      applicationData.drivingLicense,
      
      JSON.stringify(applicationData.campTypes),
      JSON.stringify(applicationData.groupSizes),
      JSON.stringify(applicationData.equipmentFamiliarity),
      applicationData.outdoorExperience,
      
      JSON.stringify(applicationData.availableDates),
      JSON.stringify(applicationData.preferredLocations),
      applicationData.accommodationNeeds,
      applicationData.transportationNeeds,
      
      applicationData.motivation,
      applicationData.specialSkills,
      JSON.stringify(applicationData.emergencyContact),
      
      JSON.stringify(documentUrls),
      JSON.stringify(applicationData.selectedCamps),
      
      applicationData.termsAccepted,
      applicationData.backgroundCheckConsent
    ];
    
    console.log('💾 Executing database insert...');
    const result = await client.query(query, values);
    const applicationId = result.rows[0].application_id;
    
    await client.query('COMMIT');
    
    console.log('✅ Application created successfully!');
    console.log('🆔 Application ID:', applicationId);
    
    res.status(201).json({
      success: true,
      message: 'Guide application submitted successfully',
      data: {
        applicationId,
        status: 'pending'
      }
    });
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error creating guide application:', error);
    console.error('📋 Error details:', error.message);
    console.error('📍 Stack trace:', error.stack);
    
    res.status(500).json({
      success: false,
      message: 'Failed to submit guide application',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    client.release();
  }
};

// Multer configuration for file uploads
const uploadFields = upload.fields([
  { name: 'resume', maxCount: 1 },
  { name: 'certifications', maxCount: 1 },
  { name: 'portfolio', maxCount: 1 },
  { name: 'references', maxCount: 1 }
]);

// Set up routes
app.post('/api/guide-applications', verifyToken, uploadFields, createGuideApplication);

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Debug server is running', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('💥 Unhandled error:', error);
  res.status(500).json({
    success: false,
    message: 'Internal server error',
    error: error.message
  });
});

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`🐛 Debug server running on http://localhost:${PORT}`);
  console.log(`🧪 Test endpoint: http://localhost:${PORT}/api/test`);
  console.log(`📝 Guide applications: http://localhost:${PORT}/api/guide-applications`);
  console.log('\nReady to debug guide application submissions!');
});
