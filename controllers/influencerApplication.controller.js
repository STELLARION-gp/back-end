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
exports.changeInfluencerApplicationStatus = exports.deleteInfluencerApplication = exports.updateInfluencerApplication = exports.getInfluencerApplication = exports.getInfluencerApplications = exports.createInfluencerApplication = void 0;
const db_1 = __importDefault(require("../db"));
// Create Influencer Application
const createInfluencerApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.body.user) === null || _a === void 0 ? void 0 : _a.id;
        const data = req.body;
        const result = yield db_1.default.query(`INSERT INTO influencer_application (
                user_id, first_name, last_name, email, phone_number, country, bio, specialization_tags, social_links, intro_video_url, sample_content_links, preferred_session_format, willing_to_host_sessions, tools_used
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
            ) RETURNING *`, [
            userId,
            data.first_name,
            data.last_name,
            data.email,
            data.phone_number,
            data.country,
            data.bio,
            data.specialization_tags,
            data.social_links,
            data.intro_video_url,
            data.sample_content_links,
            data.preferred_session_format,
            data.willing_to_host_sessions,
            data.tools_used
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.createInfluencerApplication = createInfluencerApplication;
// Get All Influencer Applications
const getInfluencerApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM influencer_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.getInfluencerApplications = getInfluencerApplications;
// Get Single Influencer Application
const getInfluencerApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM influencer_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.getInfluencerApplication = getInfluencerApplication;
// Update Influencer Application
const updateInfluencerApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = yield db_1.default.query('SELECT * FROM influencer_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length)
            return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = yield db_1.default.query(`UPDATE influencer_application SET
                phone_number = $1, country = $2, bio = $3, specialization_tags = $4, social_links = $5, intro_video_url = $6, sample_content_links = $7, preferred_session_format = $8, willing_to_host_sessions = $9, tools_used = $10, updated_at = NOW()
            WHERE application_id = $11 RETURNING *`, [
            data.phone_number,
            data.country,
            data.bio,
            data.specialization_tags,
            data.social_links,
            data.intro_video_url,
            data.sample_content_links,
            data.preferred_session_format,
            data.willing_to_host_sessions,
            data.tools_used,
            id
        ]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.updateInfluencerApplication = updateInfluencerApplication;
// Soft Delete Influencer Application
const deleteInfluencerApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('UPDATE influencer_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.deleteInfluencerApplication = deleteInfluencerApplication;
// Change Approve Application Status
const changeInfluencerApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = yield db_1.default.query('UPDATE influencer_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.changeInfluencerApplicationStatus = changeInfluencerApplicationStatus;
