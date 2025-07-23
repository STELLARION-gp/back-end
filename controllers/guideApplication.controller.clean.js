"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changeGuideApplicationStatus = exports.deleteGuideApplication = exports.updateGuideApplication = exports.getUserGuideApplications = exports.getGuideApplication = exports.getGuideApplications = exports.createGuideApplication = exports.upload = void 0;
const db_1 = __importDefault(require("../db"));
const multer_1 = __importDefault(require("multer"));
// Try to import Firebase Admin, but handle errors gracefully
let admin = null;
try {
    admin = require('../firebaseAdmin').default;
}
catch (error) {
    console.warn('⚠️ Firebase Admin not available:', error.message);
}
// Configure multer for memory storage
const storage = multer_1.default.memoryStorage();
exports.upload = (0, multer_1.default)({
    storage,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        // Allow common document and image formats
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
        }
        else {
            cb(new Error('Invalid file type. Only PDF, DOC, DOCX, and images are allowed.'));
        }
    }
});
// Firebase upload function with fallback
const uploadToFirebase = (file, path) => __awaiter(void 0, void 0, void 0, function* () {
    if (!admin) {
        // Fallback: return a mock URL for development
        console.log('📁 Mock upload (Firebase not available):', file.originalname);
        return `https://mock-storage.example.com/${path}/${Date.now()}-${file.originalname}`;
    }
    try {
        const bucket = admin.storage().bucket();
        const fileName = `${path}/${Date.now()}-${file.originalname}`;
        const fileUpload = bucket.file(fileName);
        const stream = fileUpload.createWriteStream({
            metadata: {
                contentType: file.mimetype,
            },
        });
        return new Promise((resolve, reject) => {
            stream.on('error', reject);
            stream.on('finish', () => __awaiter(void 0, void 0, void 0, function* () {
                try {
                    yield fileUpload.makePublic();
                    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${fileName}`;
                    resolve(publicUrl);
                }
                catch (error) {
                    reject(error);
                }
            }));
            stream.end(file.buffer);
        });
    }
    catch (error) {
        console.error('Firebase upload error:', error);
        throw new Error('Failed to upload file');
    }
});
// Create Guide Application with enhanced error handling
const createGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const client = yield db_1.default.connect();
    try {
        console.log('🔍 Starting guide application creation...');
        console.log('📨 Request body keys:', Object.keys(req.body));
        console.log('📎 Request files:', req.files ? Object.keys(req.files) : 'No files');
        yield client.query('BEGIN');
        const userId = (_a = req.user) === null || _a === void 0 ? void 0 : _a.id;
        if (!userId) {
            res.status(401).json({
                success: false,
                message: 'User authentication required'
            });
            return;
        }
        // Parse and validate request body
        const body = {};
        // Handle FormData parsing
        Object.entries(req.body).forEach(([key, value]) => {
            try {
                // Try to parse JSON strings
                if (typeof value === 'string' && (value.startsWith('[') || value.startsWith('{'))) {
                    body[key] = JSON.parse(value);
                }
                else {
                    body[key] = value;
                }
            }
            catch (e) {
                body[key] = value;
            }
        });
        console.log('📝 Parsed request body:', JSON.stringify(body, null, 2));
        // Validate required fields
        if (!body.fullName || !body.email || !body.phone) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields: fullName, email, phone'
            });
            return;
        }
        // Split fullName into first_name and last_name
        const fullName = String(body.fullName || '').trim();
        const [firstName, ...lastNameParts] = fullName.split(' ');
        const lastName = lastNameParts.join(' ') || '';
        if (!firstName) {
            res.status(400).json({
                success: false,
                message: 'Full name must contain at least a first name'
            });
            return;
        }
        // Handle file uploads
        let documentUrls = {};
        if (req.files) {
            console.log('📎 Processing file uploads...');
            const files = req.files;
            try {
                for (const [fieldName, fileArray] of Object.entries(files)) {
                    if (fileArray && fileArray.length > 0) {
                        const file = fileArray[0];
                        console.log(`📄 Uploading ${fieldName}: ${file.originalname}`);
                        const firebaseUrl = yield uploadToFirebase(file, `guide-applications/${userId}/${fieldName}`);
                        documentUrls[fieldName] = firebaseUrl;
                    }
                }
            }
            catch (uploadError) {
                console.error('File upload error:', uploadError);
                res.status(500).json({
                    success: false,
                    message: 'File upload failed',
                    error: uploadError.message
                });
                return;
            }
        }
        // Prepare data with safe defaults
        const safeString = (value) => {
            if (value === null || value === undefined || value === '')
                return null;
            return String(value);
        };
        const safeArray = (value) => {
            if (Array.isArray(value))
                return value;
            if (typeof value === 'string') {
                try {
                    const parsed = JSON.parse(value);
                    return Array.isArray(parsed) ? parsed : [];
                }
                catch (_a) {
                    return [];
                }
            }
            return [];
        };
        const safeBoolean = (value) => {
            if (typeof value === 'boolean')
                return value;
            if (typeof value === 'string')
                return value.toLowerCase() === 'true';
            return false;
        };
        const safeNumber = (value) => {
            const num = parseInt(String(value || '0'));
            return isNaN(num) ? 0 : num;
        };
        const safeObject = (value) => {
            if (typeof value === 'object' && value !== null)
                return value;
            if (typeof value === 'string') {
                try {
                    return JSON.parse(value);
                }
                catch (_a) {
                    return {};
                }
            }
            return {};
        };
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
            firstName,
            lastName,
            body.email,
            body.phone,
            safeString(body.dateOfBirth),
            safeString(body.address),
            safeString(body.city),
            safeString(body.currentOccupation),
            safeString(body.educationLevel),
            safeString(body.astronomyEducation),
            safeString(body.guideExperience),
            safeNumber(body.totalExperience),
            JSON.stringify(safeArray(body.certifications)),
            JSON.stringify(safeArray(body.astronomySkills)),
            JSON.stringify(safeArray(body.languages)),
            safeBoolean(body.firstAid),
            safeBoolean(body.drivingLicense),
            JSON.stringify(safeArray(body.campTypes)),
            JSON.stringify(safeArray(body.groupSizes)),
            JSON.stringify(safeArray(body.equipmentFamiliarity)),
            safeString(body.outdoorExperience),
            JSON.stringify(safeArray(body.availableDates)),
            JSON.stringify(safeArray(body.preferredLocations)),
            safeString(body.accommodationNeeds),
            safeString(body.transportationNeeds),
            safeString(body.motivation),
            safeString(body.specialSkills),
            JSON.stringify(safeObject(body.emergencyContact)),
            JSON.stringify(documentUrls),
            JSON.stringify(safeArray(body.selectedCamps)),
            safeBoolean(body.termsAccepted),
            safeBoolean(body.backgroundCheckConsent)
        ];
        console.log('💾 Executing database insert...');
        const result = yield client.query(query, values);
        const applicationId = result.rows[0].application_id;
        yield client.query('COMMIT');
        console.log('✅ Application created successfully! ID:', applicationId);
        res.status(201).json({
            success: true,
            message: 'Guide application submitted successfully',
            data: {
                applicationId,
                status: 'pending'
            }
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('❌ Error creating guide application:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to submit guide application',
            error: error.message,
            details: process.env.NODE_ENV === 'development' ? {
                stack: error.stack,
                code: error.code
            } : undefined
        });
    }
    finally {
        client.release();
    }
});
exports.createGuideApplication = createGuideApplication;
// Get All Guide Applications
const getGuideApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query(`
      SELECT 
        ga.*,
        u.username,
        u.email as user_email
      FROM guide_application ga
      JOIN users u ON ga.user_id = u.id
      WHERE ga.deletion_status = FALSE
      ORDER BY ga.submitted_at DESC
    `);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching guide applications:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getGuideApplications = getGuideApplications;
// Get Single Guide Application
const getGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query(`
      SELECT 
        ga.*,
        u.username,
        u.email as user_email
      FROM guide_application ga
      JOIN users u ON ga.user_id = u.id
      WHERE ga.application_id = $1 AND ga.deletion_status = FALSE
    `, [id]);
        if (!result.rows.length) {
            res.status(404).json({
                success: false,
                message: 'Guide application not found'
            });
            return;
        }
        res.json({
            success: true,
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error('Error fetching guide application:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getGuideApplication = getGuideApplication;
// Get User's Guide Applications
const getUserGuideApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const userId = req.user.id;
        const result = yield db_1.default.query(`
      SELECT * FROM guide_application 
      WHERE user_id = $1 AND deletion_status = FALSE
      ORDER BY submitted_at DESC
    `, [userId]);
        res.json({
            success: true,
            data: result.rows
        });
    }
    catch (error) {
        console.error('Error fetching user guide applications:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.getUserGuideApplications = getUserGuideApplications;
// Update Guide Application
const updateGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield db_1.default.connect();
    try {
        yield client.query('BEGIN');
        const { id } = req.params;
        const userId = req.user.id;
        const body = req.body;
        // Check if application exists and belongs to user
        const checkResult = yield client.query(`
      SELECT * FROM guide_application 
      WHERE application_id = $1 AND user_id = $2 AND application_status = 'pending' AND deletion_status = FALSE
    `, [id, userId]);
        if (!checkResult.rows.length) {
            res.status(403).json({
                success: false,
                message: 'Cannot edit this application or application not found'
            });
            return;
        }
        // Split fullName into first_name and last_name
        const [firstName, ...lastNameParts] = body.fullName.trim().split(' ');
        const lastName = lastNameParts.join(' ') || '';
        // Handle file uploads
        let documentUrls = JSON.parse(checkResult.rows[0].documents || '{}');
        if (req.files) {
            const files = req.files;
            // Upload each document type
            for (const [fieldName, fileArray] of Object.entries(files)) {
                if (fileArray && fileArray.length > 0) {
                    const file = fileArray[0];
                    const firebaseUrl = yield uploadToFirebase(file, `guide-applications/${userId}/${fieldName}`);
                    documentUrls[fieldName] = firebaseUrl;
                }
            }
        }
        // Update guide application
        const updateQuery = `
      UPDATE guide_application SET
        first_name = $1, last_name = $2, email = $3, phone = $4, date_of_birth = $5, address = $6, city = $7,
        current_occupation = $8, education_level = $9, astronomy_education = $10, guide_experience = $11, total_experience = $12,
        certifications = $13, astronomy_skills = $14, languages = $15, first_aid = $16, driving_license = $17,
        camp_types = $18, group_sizes = $19, equipment_familiarity = $20, outdoor_experience = $21,
        available_dates = $22, preferred_locations = $23, accommodation_needs = $24, transportation_needs = $25,
        motivation = $26, special_skills = $27, emergency_contact = $28,
        documents = $29, selected_camps = $30,
        terms_accepted = $31, background_check_consent = $32,
        updated_at = NOW()
      WHERE application_id = $33
      RETURNING *
    `;
        const updateValues = [
            firstName,
            lastName,
            body.email,
            body.phone,
            body.dateOfBirth || null,
            body.address || null,
            body.city || null,
            body.currentOccupation || null,
            body.educationLevel || null,
            body.astronomyEducation || null,
            body.guideExperience || null,
            body.totalExperience,
            JSON.stringify(body.certifications || []),
            JSON.stringify(body.astronomySkills || []),
            JSON.stringify(body.languages || []),
            body.firstAid || false,
            body.drivingLicense || false,
            JSON.stringify(body.campTypes || []),
            JSON.stringify(body.groupSizes || []),
            JSON.stringify(body.equipmentFamiliarity || []),
            body.outdoorExperience || null,
            JSON.stringify(body.availableDates || []),
            JSON.stringify(body.preferredLocations || []),
            body.accommodationNeeds || null,
            body.transportationNeeds || null,
            body.motivation || null,
            body.specialSkills || null,
            JSON.stringify(body.emergencyContact),
            JSON.stringify(documentUrls),
            JSON.stringify(body.selectedCamps || []),
            body.termsAccepted || false,
            body.backgroundCheckConsent || false,
            id
        ];
        const result = yield client.query(updateQuery, updateValues);
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: 'Guide application updated successfully',
            data: result.rows[0]
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error updating guide application:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    finally {
        client.release();
    }
});
exports.updateGuideApplication = updateGuideApplication;
// Soft Delete Guide Application
const deleteGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const userId = req.user.id;
        const result = yield db_1.default.query(`
      UPDATE guide_application 
      SET deletion_status = TRUE, updated_at = NOW() 
      WHERE application_id = $1 AND user_id = $2 
      RETURNING *
    `, [id, userId]);
        if (!result.rows.length) {
            res.status(404).json({
                success: false,
                message: 'Guide application not found'
            });
            return;
        }
        res.json({
            success: true,
            message: 'Guide application deleted successfully'
        });
    }
    catch (error) {
        console.error('Error deleting guide application:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});
exports.deleteGuideApplication = deleteGuideApplication;
// Change Approve Application Status (Admin only)
const changeGuideApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const client = yield db_1.default.connect();
    try {
        yield client.query('BEGIN');
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        if (!['accepted', 'pending', 'rejected'].includes(status)) {
            res.status(400).json({
                success: false,
                message: 'Invalid status. Must be accepted, pending, or rejected'
            });
            return;
        }
        // Update application status
        const result = yield db_1.default.query(`
      UPDATE guide_application 
      SET approve_application_status = $1, updated_at = NOW() 
      WHERE application_id = $2 
      RETURNING *
    `, [status, id]);
        if (!result.rows.length) {
            res.status(404).json({
                success: false,
                message: 'Guide application not found'
            });
            return;
        }
        // If approved, update user role to 'guide'
        if (status === 'accepted') {
            yield client.query(`
        UPDATE users 
        SET role = 'guide' 
        WHERE id = $1
      `, [result.rows[0].user_id]);
        }
        yield client.query('COMMIT');
        res.json({
            success: true,
            message: `Guide application ${status} successfully`,
            data: result.rows[0]
        });
    }
    catch (error) {
        yield client.query('ROLLBACK');
        console.error('Error changing guide application status:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
    finally {
        client.release();
    }
});
exports.changeGuideApplicationStatus = changeGuideApplicationStatus;
