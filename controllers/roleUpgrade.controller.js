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
exports.processRoleUpgradeRequest = exports.getAllRoleUpgradeRequests = exports.getRoleUpgradeStatus = exports.requestRoleUpgrade = void 0;
const db_1 = __importDefault(require("../db"));
// Request role upgrade
const requestRoleUpgrade = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        const { requested_role, reason, supporting_evidence = [] } = req.body;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        if (!requested_role || !reason) {
            res.status(400).json({
                success: false,
                message: "Requested role and reason are required"
            });
            return;
        }
        // Get user details
        const userResult = yield db_1.default.query("SELECT * FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        if (userResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        const user = userResult.rows[0];
        // Validate requested role
        const validRoles = ['admin', 'moderator', 'learner', 'guide', 'enthusiast', 'mentor', 'influencer'];
        if (!validRoles.includes(requested_role)) {
            res.status(400).json({
                success: false,
                message: "Invalid requested role"
            });
            return;
        }
        // Check if user already has the requested role
        if (user.role === requested_role) {
            res.status(400).json({
                success: false,
                message: "User already has the requested role"
            });
            return;
        }
        // Check if user has a pending request for the same role
        const existingRequest = yield db_1.default.query("SELECT * FROM role_upgrade_requests WHERE user_id = $1 AND requested_user_role = $2 AND status = 'pending'", [user.id, requested_role]);
        if (existingRequest.rows.length > 0) {
            res.status(400).json({
                success: false,
                message: "You already have a pending request for this role"
            });
            return;
        }
        // Create role upgrade request
        const result = yield db_1.default.query(`INSERT INTO role_upgrade_requests (user_id, current_user_role, requested_user_role, reason, supporting_evidence) 
             VALUES ($1, $2, $3, $4, $5) RETURNING *`, [user.id, user.role, requested_role, reason, JSON.stringify(supporting_evidence)]);
        res.status(201).json({
            success: true,
            message: "Role upgrade request submitted successfully",
            data: {
                request_id: result.rows[0].id,
                status: result.rows[0].status,
                submitted_at: result.rows[0].submitted_at
            }
        });
    }
    catch (error) {
        console.error("Request role upgrade error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.requestRoleUpgrade = requestRoleUpgrade;
// Get role upgrade status
const getRoleUpgradeStatus = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        // Get user details
        const userResult = yield db_1.default.query("SELECT id FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        if (userResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        const userId = userResult.rows[0].id;
        // Get current pending requests
        const currentRequestsResult = yield db_1.default.query(`SELECT r.*, u.email as reviewer_email 
             FROM role_upgrade_requests r 
             LEFT JOIN users u ON r.reviewer_id = u.id 
             WHERE r.user_id = $1 AND r.status = 'pending' 
             ORDER BY r.submitted_at DESC`, [userId]);
        // Get request history
        const historyResult = yield db_1.default.query(`SELECT r.*, u.email as reviewer_email 
             FROM role_upgrade_requests r 
             LEFT JOIN users u ON r.reviewer_id = u.id 
             WHERE r.user_id = $1 AND r.status != 'pending' 
             ORDER BY r.reviewed_at DESC`, [userId]);
        const formatRequest = (request) => ({
            request_id: request.id,
            requested_role: request.requested_user_role,
            current_role: request.current_user_role,
            status: request.status,
            reason: request.reason,
            supporting_evidence: JSON.parse(request.supporting_evidence || '[]'),
            submitted_at: request.submitted_at,
            reviewed_at: request.reviewed_at,
            reviewer_notes: request.reviewer_notes,
            reviewer_email: request.reviewer_email
        });
        res.json({
            success: true,
            message: "Role upgrade status retrieved successfully",
            data: {
                current_requests: currentRequestsResult.rows.map(formatRequest),
                request_history: historyResult.rows.map(formatRequest)
            }
        });
    }
    catch (error) {
        console.error("Get role upgrade status error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getRoleUpgradeStatus = getRoleUpgradeStatus;
// Get all role upgrade requests (Admin only)
const getAllRoleUpgradeRequests = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, status } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        // Build query
        let query = `
            SELECT r.*, u.email, u.first_name, u.last_name, u.display_name,
                   reviewer.email as reviewer_email, reviewer.first_name as reviewer_first_name
            FROM role_upgrade_requests r
            JOIN users u ON r.user_id = u.id
            LEFT JOIN users reviewer ON r.reviewer_id = reviewer.id
        `;
        const params = [];
        let paramCount = 0;
        if (status) {
            paramCount++;
            query += ` WHERE r.status = $${paramCount}`;
            params.push(status);
        }
        query += ` ORDER BY r.submitted_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(Number(limit), offset);
        const result = yield db_1.default.query(query, params);
        // Get total count
        let countQuery = "SELECT COUNT(*) FROM role_upgrade_requests r";
        const countParams = [];
        if (status) {
            countQuery += " WHERE r.status = $1";
            countParams.push(status);
        }
        const countResult = yield db_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        const formattedRequests = result.rows.map(request => ({
            request_id: request.id,
            user: {
                id: request.user_id,
                email: request.email,
                first_name: request.first_name,
                last_name: request.last_name,
                display_name: request.display_name
            },
            current_role: request.current_user_role,
            requested_role: request.requested_user_role,
            reason: request.reason,
            supporting_evidence: JSON.parse(request.supporting_evidence || '[]'),
            status: request.status,
            submitted_at: request.submitted_at,
            reviewed_at: request.reviewed_at,
            reviewer_notes: request.reviewer_notes,
            reviewer: request.reviewer_email ? {
                email: request.reviewer_email,
                first_name: request.reviewer_first_name
            } : null
        }));
        res.json({
            success: true,
            message: "Role upgrade requests retrieved successfully",
            data: {
                requests: formattedRequests,
                pagination: {
                    currentPage: Number(page),
                    totalPages: Math.ceil(total / Number(limit)),
                    totalRequests: total,
                    limit: Number(limit)
                }
            }
        });
    }
    catch (error) {
        console.error("Get all role upgrade requests error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getAllRoleUpgradeRequests = getAllRoleUpgradeRequests;
// Process role upgrade request (Admin only)
const processRoleUpgradeRequest = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        const { requestId } = req.params;
        const { action, reviewer_notes = '' } = req.body; // action: 'approve' or 'reject'
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        if (!['approve', 'reject'].includes(action)) {
            res.status(400).json({
                success: false,
                message: "Invalid action. Must be 'approve' or 'reject'"
            });
            return;
        }
        // Get reviewer details
        const reviewerResult = yield db_1.default.query("SELECT * FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        if (reviewerResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Reviewer not found"
            });
            return;
        }
        const reviewer = reviewerResult.rows[0];
        // Get the request details
        const requestResult = yield db_1.default.query(`SELECT r.*, u.firebase_uid as user_firebase_uid 
             FROM role_upgrade_requests r 
             JOIN users u ON r.user_id = u.id 
             WHERE r.id = $1 AND r.status = 'pending'`, [requestId]);
        if (requestResult.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "Request not found or already processed"
            });
            return;
        }
        const request = requestResult.rows[0];
        const status = action === 'approve' ? 'approved' : 'rejected';
        // Begin transaction
        yield db_1.default.query('BEGIN');
        try {
            // Update the request status
            yield db_1.default.query(`UPDATE role_upgrade_requests 
                 SET status = $1, reviewer_id = $2, reviewer_notes = $3, reviewed_at = CURRENT_TIMESTAMP 
                 WHERE id = $4`, [status, reviewer.id, reviewer_notes, requestId]);
            // If approved, update user's role
            if (action === 'approve') {
                yield db_1.default.query("UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2", [request.requested_user_role, request.user_id]);
            }
            yield db_1.default.query('COMMIT');
            res.json({
                success: true,
                message: `Role upgrade request ${action}d successfully`,
                data: {
                    request_id: requestId,
                    status: status,
                    action: action,
                    processed_at: new Date().toISOString()
                }
            });
        }
        catch (error) {
            yield db_1.default.query('ROLLBACK');
            throw error;
        }
    }
    catch (error) {
        console.error("Process role upgrade request error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.processRoleUpgradeRequest = processRoleUpgradeRequest;
