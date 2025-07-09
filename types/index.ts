// types/index.ts
import { DecodedIdToken } from 'firebase-admin/auth';

declare global {
    namespace Express {
        interface Request {
            body: {
                firebaseUser?: DecodedIdToken;
                [key: string]: any;
            };
            user?: {
                uid: string;
                id: number;
                email: string;
                role: string;
            };
        }
    }
}

export interface DatabaseUser {
    id: number;
    firebase_uid: string;
    email: string;
    first_name?: string;
    last_name?: string;
    display_name?: string;
    role: string;
    is_active: boolean;
    last_login?: Date;
    profile_data: ProfileData;
    role_specific_data: RoleSpecificData;
    created_at: Date;
    updated_at: Date;
}

export interface ProfileData {
    profile_picture?: string;
    bio?: string;
    location?: string;
    website?: string;
    github?: string;
    linkedin?: string;
    astronomy_experience?: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    favorite_astronomy_fields?: string[];
    telescope_owned?: boolean;
    telescope_type?: string;
    observation_experience?: number;
    certifications?: string[];
    achievements?: string[];
    contributions?: string[];
    joined_communities?: string[];
}

export interface RoleSpecificData {
    // For mentors/guides
    mentoring_areas?: string[];
    years_of_experience?: number;

    // For influencers
    social_media_followers?: number;
    content_platforms?: string[];

    // For learners/enthusiasts
    learning_goals?: string[];
    current_projects?: string[];
}

export interface UserSettings {
    id: number;
    user_id: number;
    language: string;
    email_notifications: boolean;
    push_notifications: boolean;
    profile_visibility: 'public' | 'community-only' | 'private';
    allow_direct_messages: boolean;
    show_online_status: boolean;
    theme: 'light' | 'dark';
    timezone: string;
    created_at: Date;
    updated_at: Date;
}

export interface RoleUpgradeRequest {
    id: number;
    user_id: number;
    current_role: string;
    requested_role: string;
    reason?: string;
    supporting_evidence?: string[];
    status: 'pending' | 'approved' | 'rejected';
    reviewer_id?: number;
    reviewer_notes?: string;
    submitted_at: Date;
    reviewed_at?: Date;
}

export interface UserAvatar {
    id: number;
    user_id: number;
    file_path: string;
    file_size?: number;
    mime_type?: string;
    uploaded_at: Date;
    is_active: boolean;
}

export interface CreateUserRequest {
    firebaseUser: {
        uid: string;
        email: string;
    };
}

export interface UpdateProfileRequest {
    first_name?: string;
    last_name?: string;
    display_name?: string;
    profile_data?: Partial<ProfileData>;
    role_specific_data?: Partial<RoleSpecificData>;
}

export interface ChangePasswordRequest {
    current_password: string;
    new_password: string;
}

export interface DeleteAccountRequest {
    confirmation: string;
    password: string;
}

export interface RoleUpgradeRequestBody {
    requested_role: string;
    reason?: string;
    supporting_evidence?: string[];
}
