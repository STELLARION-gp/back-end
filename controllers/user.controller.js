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
exports.activateUser = exports.deactivateUser = exports.updateUserRole = exports.getAllUsers = exports.getUserProfile = exports.createUserIfNotExists = void 0;
const db_1 = __importDefault(require("../db"));
const createUserIfNotExists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    console.log('🔥 Registration request received:', {
        body: req.body,
        hasFirebaseUser: !!req.body.firebaseUser,
        email: (_a = req.body.firebaseUser) === null || _a === void 0 ? void 0 : _a.email,
        uid: (_b = req.body.firebaseUser) === null || _b === void 0 ? void 0 : _b.uid
    });
    const { firebaseUser, role, first_name, last_name } = req.body;
    if (!firebaseUser || !firebaseUser.uid || !firebaseUser.email) {
        res.status(400).json({
            success: false,
            message: "Missing firebaseUser data (uid and email required)"
        });
        return;
    }
    const { uid, email, name } = firebaseUser;
    const userRole = role || 'learner';
    // Parse name if provided and first_name/last_name not explicitly set
    let firstName = first_name;
    let lastName = last_name;
    if (!firstName && !lastName && name) {
        const nameParts = name.split(' ');
        firstName = nameParts[0];
        lastName = nameParts.slice(1).join(' ');
    }
    try {
        console.log('💾 Checking for existing user with uid:', uid);
        const existing = yield db_1.default.query("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
        if (existing.rows.length > 0) {
            console.log('✅ User already exists, updating last login');
            // Update last login
            yield db_1.default.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1", [uid]);
            res.json({
                success: true,
                message: "User already exists",
                data: existing.rows[0]
            });
            return;
        }
        console.log('🆕 Creating new user with data:', {
            uid, email, userRole, firstName, lastName
        });
        // Extract display name from email if name not available
        const displayName = name || firstName || email.split('@')[0];
        const result = yield db_1.default.query("INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login) VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP) RETURNING *", [uid, email, userRole, firstName, lastName, displayName]);
        console.log('✅ User created successfully:', result.rows[0]);
        // Create default user settings for the new user
        try {
            yield db_1.default.query(`INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
         VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`, [result.rows[0].id]);
            console.log('✅ Default user settings created');
        }
        catch (settingsError) {
            console.error('⚠️ Failed to create user settings:', settingsError);
            // Don't fail the registration if settings creation fails
        }
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: result.rows[0]
        });
    }
    catch (err) {
        console.error("❌ Database error during user creation:", err);
        res.status(500).json({
            success: false,
            message: "Database error",
            error: err instanceof Error ? err.message : 'Unknown error'
        });
    }
});
exports.createUserIfNotExists = createUserIfNotExists;
const getUserProfile = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const firebaseUser = req.user;
        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }
        console.log('🔍 Looking up user with Firebase UID:', firebaseUser.uid);
        console.log('🔍 Firebase user data:', {
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            name: firebaseUser.name
        });
        let result = yield db_1.default.query("SELECT id, firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login, created_at, updated_at FROM users WHERE firebase_uid = $1", [firebaseUser.uid]);
        if (result.rows.length === 0) {
            console.log('⚠️ User not found in database, auto-creating...');
            // Auto-create user if they don't exist but have valid Firebase token
            const email = firebaseUser.email;
            const name = firebaseUser.name || firebaseUser.display_name || '';
            // Parse name into first and last name
            let firstName = '';
            let lastName = '';
            if (name) {
                const nameParts = name.split(' ');
                firstName = nameParts[0] || '';
                lastName = nameParts.slice(1).join(' ') || '';
            }
            // Extract display name from email if name not available
            const displayName = name || email.split('@')[0];
            try {
                const createResult = yield db_1.default.query(`INSERT INTO users (firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login, created_at, updated_at) 
           VALUES ($1, $2, $3, $4, $5, $6, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP) 
           RETURNING id, firebase_uid, email, role, first_name, last_name, display_name, is_active, last_login, created_at, updated_at`, [firebaseUser.uid, email, 'learner', firstName, lastName, displayName]);
                console.log('✅ User auto-created successfully:', createResult.rows[0]);
                // Also create default user settings
                yield db_1.default.query(`INSERT INTO user_settings (user_id, language, email_notifications, push_notifications, profile_visibility, allow_direct_messages, show_online_status, theme, timezone) 
           VALUES ($1, 'en', true, true, 'public', true, true, 'dark', 'UTC')`, [createResult.rows[0].id]);
                res.json({
                    success: true,
                    message: "User profile created and retrieved successfully",
                    data: createResult.rows[0]
                });
                return;
            }
            catch (createError) {
                console.error('❌ Error creating user:', createError);
                res.status(500).json({
                    success: false,
                    message: "Failed to create user profile",
                    error: createError instanceof Error ? createError.message : 'Unknown error'
                });
                return;
            }
        }
        const user = result.rows[0];
        if (!user.is_active) {
            console.log('⚠️ User found but inactive:', user.firebase_uid);
            res.status(403).json({
                success: false,
                message: "User account is inactive"
            });
            return;
        }
        // Update last login
        yield db_1.default.query("UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE firebase_uid = $1", [firebaseUser.uid]);
        console.log('✅ User profile retrieved successfully:', user.firebase_uid);
        res.json({
            success: true,
            message: "Profile retrieved successfully",
            data: user
        });
    }
    catch (error) {
        console.error("Get profile error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getUserProfile = getUserProfile;
const getAllUsers = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { page = 1, limit = 10, role, search } = req.query;
        const offset = (Number(page) - 1) * Number(limit);
        let query = `
      SELECT id, firebase_uid, email, role, first_name, last_name, is_active, last_login, created_at, updated_at 
      FROM users 
      WHERE 1=1
    `;
        const params = [];
        let paramCount = 0;
        if (role) {
            paramCount++;
            query += ` AND role = $${paramCount}`;
            params.push(role);
        }
        if (search) {
            paramCount++;
            query += ` AND (email ILIKE $${paramCount} OR first_name ILIKE $${paramCount} OR last_name ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY created_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
        params.push(Number(limit), offset);
        const result = yield db_1.default.query(query, params);
        // Get total count
        let countQuery = "SELECT COUNT(*) FROM users WHERE 1=1";
        const countParams = [];
        let countParamCount = 0;
        if (role) {
            countParamCount++;
            countQuery += ` AND role = $${countParamCount}`;
            countParams.push(role);
        }
        if (search) {
            countParamCount++;
            countQuery += ` AND (email ILIKE $${countParamCount} OR first_name ILIKE $${countParamCount} OR last_name ILIKE $${countParamCount})`;
            countParams.push(`%${search}%`);
        }
        const countResult = yield db_1.default.query(countQuery, countParams);
        const total = parseInt(countResult.rows[0].count);
        res.json({
            success: true,
            message: "Users retrieved successfully",
            data: {
                users: result.rows,
                pagination: {
                    page: Number(page),
                    limit: Number(limit),
                    total: total,
                    pages: Math.ceil(total / Number(limit))
                }
            }
        });
    }
    catch (error) {
        console.error("Get all users error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.getAllUsers = getAllUsers;
const updateUserRole = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const { role } = req.body;
        if (!role) {
            res.status(400).json({
                success: false,
                message: "Role is required"
            });
            return;
        }
        const validRoles = ['admin', 'moderator', 'learner', 'guide', 'enthusiast', 'mentor', 'influencer'];
        if (!validRoles.includes(role)) {
            res.status(400).json({
                success: false,
                message: "Invalid role. Valid roles are: " + validRoles.join(', ')
            });
            return;
        }
        const result = yield db_1.default.query("UPDATE users SET role = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *", [role, userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        res.json({
            success: true,
            message: "User role updated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error("Update user role error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.updateUserRole = updateUserRole;
const deactivateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const result = yield db_1.default.query("UPDATE users SET is_active = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *", [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        res.json({
            success: true,
            message: "User deactivated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error("Deactivate user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.deactivateUser = deactivateUser;
const activateUser = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { userId } = req.params;
        const result = yield db_1.default.query("UPDATE users SET is_active = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *", [userId]);
        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }
        res.json({
            success: true,
            message: "User activated successfully",
            data: result.rows[0]
        });
    }
    catch (error) {
        console.error("Activate user error:", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
});
exports.activateUser = activateUser;
