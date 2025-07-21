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
exports.changeGuideApplicationStatus = exports.deleteGuideApplication = exports.updateGuideApplication = exports.getGuideApplication = exports.getGuideApplications = exports.createGuideApplication = void 0;
const db_1 = __importDefault(require("../db"));
// Create Guide Application
const createGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const userId = (_a = req.body.user) === null || _a === void 0 ? void 0 : _a.id;
        const data = req.body;
        const result = yield db_1.default.query(`INSERT INTO guide_application (
                user_id, first_name, last_name, email, phone_number, country, languages_spoken, certifications, stargazing_expertise, operating_locations, profile_bio, services_offered, max_group_size, pricing_range, photos_or_videos_links, availability_schedule, payment_method_pref
            ) VALUES (
                $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
            ) RETURNING *`, [
            userId,
            data.first_name,
            data.last_name,
            data.email,
            data.phone_number,
            data.country,
            data.languages_spoken,
            data.certifications,
            data.stargazing_expertise,
            data.operating_locations,
            data.profile_bio,
            data.services_offered,
            data.max_group_size,
            data.pricing_range,
            data.photos_or_videos_links,
            data.availability_schedule,
            data.payment_method_pref
        ]);
        res.status(201).json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.createGuideApplication = createGuideApplication;
// Get All Guide Applications
const getGuideApplications = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const result = yield db_1.default.query('SELECT * FROM guide_application WHERE deletion_status = FALSE');
        res.json({ success: true, data: result.rows });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.getGuideApplications = getGuideApplications;
// Get Single Guide Application
const getGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('SELECT * FROM guide_application WHERE application_id = $1 AND deletion_status = FALSE', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.getGuideApplication = getGuideApplication;
// Update Guide Application
const updateGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const data = req.body;
        // Only allow update if status is pending
        const check = yield db_1.default.query('SELECT * FROM guide_application WHERE application_id = $1 AND application_status = $2 AND deletion_status = FALSE', [id, 'pending']);
        if (!check.rows.length)
            return res.status(403).json({ success: false, message: 'Cannot edit this application' });
        const result = yield db_1.default.query(`UPDATE guide_application SET
                phone_number = $1, country = $2, languages_spoken = $3, certifications = $4, stargazing_expertise = $5, operating_locations = $6, profile_bio = $7, services_offered = $8, max_group_size = $9, pricing_range = $10, photos_or_videos_links = $11, availability_schedule = $12, payment_method_pref = $13, updated_at = NOW()
            WHERE application_id = $14 RETURNING *`, [
            data.phone_number,
            data.country,
            data.languages_spoken,
            data.certifications,
            data.stargazing_expertise,
            data.operating_locations,
            data.profile_bio,
            data.services_offered,
            data.max_group_size,
            data.pricing_range,
            data.photos_or_videos_links,
            data.availability_schedule,
            data.payment_method_pref,
            id
        ]);
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.updateGuideApplication = updateGuideApplication;
// Soft Delete Guide Application
const deleteGuideApplication = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const result = yield db_1.default.query('UPDATE guide_application SET deletion_status = TRUE, updated_at = NOW() WHERE application_id = $1 RETURNING *', [id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, message: 'Deleted' });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.deleteGuideApplication = deleteGuideApplication;
// Change Approve Application Status
const changeGuideApplicationStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { id } = req.params;
        const { status } = req.body; // 'accepted', 'pending', 'rejected'
        const result = yield db_1.default.query('UPDATE guide_application SET approve_application_status = $1, updated_at = NOW() WHERE application_id = $2 RETURNING *', [status, id]);
        if (!result.rows.length)
            return res.status(404).json({ success: false, message: 'Not found' });
        res.json({ success: true, data: result.rows[0] });
    }
    catch (err) {
        res.status(500).json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
});
exports.changeGuideApplicationStatus = changeGuideApplicationStatus;
