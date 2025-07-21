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
exports.changeMentorApplicationStatus = exports.deleteMentorApplication = exports.updateMentorApplication = exports.getMentorApplication = exports.getMentorApplications = exports.createMentorApplication = void 0;
const db_1 = __importDefault(require("../db"));
// Create Mentor Application
const createMentorApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.body.user) === null || _a === void 0 ? void 0 : _a.id;
        const data = req.body;
        const result = yield db_1.default.query(`INSERT INTO mentor_application (
                user_id, first_name, last_name, email, phone_number, date_of_birth, country, profile_bio, educational_background, area_of_expertise, linkedin_profile, intro_video_url, max_mentees, availability_schedule, motivation_statement, portfolio_attachments
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
            ) RETURNING *`, [
            userId,
            data.first_name,
            data.last_name,
            data.email,
            data.phone_number,
            data.date_of_birth,
            data.country,
            data.profile_bio,
            data.educational_background,
            data.area_of_expertise,
            data.linkedin_profile,
            data.intro_video_url,
            data.max_mentees,
            data.availability_schedule,
            data.motivation_statement,
            data.portfolio_attachments
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.createMentorApplication = createMentorApplication;
// Get All Mentor Applications
const getMentorApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM mentor_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.getMentorApplications = getMentorApplications;
// Get Single Mentor Application
const getMentorApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM mentor_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.getMentorApplication = getMentorApplication;
// Update Mentor Application
const updateMentorApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = yield db_1.default.query('SELECT * FROM mentor_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length)
            return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = yield db_1.default.query(`UPDATE mentor_application SET
                phone_number = $1, date_of_birth = $2, country = $3, profile_bio = $4, educational_background = $5, area_of_expertise = $6, linkedin_profile = $7, intro_video_url = $8, max_mentees = $9, availability_schedule = $10, motivation_statement = $11, portfolio_attachments = $12, updated_at = NOW()
            WHERE application_id = $13 RETURNING *`, [
            data.phone_number,
            data.date_of_birth,
            data.country,
            data.profile_bio,
            data.educational_background,
            data.area_of_expertise,
            data.linkedin_profile,
            data.intro_video_url,
            data.max_mentees,
            data.availability_schedule,
            data.motivation_statement,
            data.portfolio_attachments,
            id
        ]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.updateMentorApplication = updateMentorApplication;
// Soft Delete Mentor Application
const deleteMentorApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('UPDATE mentor_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.deleteMentorApplication = deleteMentorApplication;
// Change Approve Application Status
const changeMentorApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = yield db_1.default.query('UPDATE mentor_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
exports.changeMentorApplicationStatus = changeMentorApplicationStatus;
