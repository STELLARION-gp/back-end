// types/index.ts
import { DecodedIdToken } from 'firebase-admin/auth';

declare global {
    namespace Express {
        interface Request {
            body: {
                firebaseUser?: DecodedIdToken;
                user?: DatabaseUser;
                [key: string]: any;
            };
        }
    }
}

export type UserRole = 'admin' | 'moderator' | 'learner' | 'guide' | 'enthusiast' | 'mentor' | 'influencer';

export interface DatabaseUser {
    id: number;
    firebase_uid: string;
    email: string;
    role: UserRole;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    is_active: boolean;
    last_login?: Date;
    created_at: Date;
    updated_at: Date;
    profile_data?: any;
    role_specific_data?: any;
}

export interface UserSettings {
    id: number;
    user_id: number;
    language: string;
    email_notifications: boolean;
    push_notifications: boolean;
    profile_visibility: string;
    allow_direct_messages: boolean;
    show_online_status: boolean;
    theme: string;
    timezone: string;
    created_at: Date;
    updated_at: Date;
}

export interface RoleUpgradeRequest {
    id: number;
    user_id: number;
    current_user_role: UserRole;
    requested_user_role: UserRole;
    reason?: string;
    supporting_evidence?: string[];
    status: 'pending' | 'approved' | 'rejected';
    reviewer_id?: number;
    reviewer_notes?: string;
    submitted_at: Date;
    reviewed_at?: Date;
}

export interface CreateUserRequest {
    firebaseUser: {
        uid: string;
        email: string;
        name?: string;
    };
    role?: UserRole;
    first_name?: string;
    last_name?: string;
}

export interface AuthenticatedRequest extends Request {
    user?: DatabaseUser;
    firebaseUser?: DecodedIdToken;
}

export interface SignUpRequest {
    email: string;
    password: string;
    first_name?: string;
    last_name?: string;
    role?: UserRole;
}

export interface SignInRequest {
    email: string;
    password: string;
}

export interface UpdateProfileRequest {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    email?: string;
    profile_data?: any;
    role_specific_data?: any;
}

export interface ChangePasswordRequest {
    current_password?: string;
    new_password: string;
}

export interface AuthResponse {
    success: boolean;
    message: string;
    user?: DatabaseUser;
    customToken?: string;
}

export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
}

export interface UpdateSettingsRequest {
    language?: string;
    email_notifications?: boolean;
    push_notifications?: boolean;
    profile_visibility?: string;
    allow_direct_messages?: boolean;
    show_online_status?: boolean;
    theme?: string;
    timezone?: string;
}

export interface RoleUpgradeRequestData {
    requested_role: UserRole;
    reason: string;
    supporting_evidence?: string[];
}
