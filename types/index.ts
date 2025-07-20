// Application status enums
export type ApplicationStatus = 'pending' | 'approved' | 'rejected';
export type ApproveApplicationStatus = 'pending' | 'accepted' | 'rejected';
export type SessionFormat = 'Live' | 'Recorded' | 'Hybrid';
export type PaymentMethod = 'Bank' | 'e-wallet' | 'PayPal' | 'Other';

// Subscription types
export type SubscriptionPlan = 'starseeker' | 'galaxy_explorer' | 'cosmic_voyager';
export type SubscriptionStatus = 'active' | 'cancelled' | 'expired' | 'pending';
export type PaymentStatus = 'pending' | 'completed' | 'failed' | 'refunded';

export interface SubscriptionPlanDetails {
    id: number;
    plan_type: SubscriptionPlan;
    name: string;
    description: string;
    price_lkr: number;
    price_usd?: number;
    features: string[];
    chatbot_questions_limit: number; // -1 for unlimited
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Subscription {
    id: number;
    user_id: number;
    plan_type: SubscriptionPlan;
    status: SubscriptionStatus;
    start_date: string;
    end_date?: string;
    auto_renew: boolean;
    created_at: string;
    updated_at: string;
    cancelled_at?: string;
    cancellation_reason?: string;
}

export interface Payment {
    id: number;
    user_id: number;
    subscription_id?: number;
    amount: number;
    currency: string;
    payment_status: PaymentStatus;
    payment_method?: string;
    payment_gateway: string;
    gateway_transaction_id?: string;
    gateway_order_id?: string;
    payment_date?: string;
    metadata: any;
    created_at: string;
    updated_at: string;
}

export interface ChatbotUsage {
    id: number;
    user_id: number;
    question_count: number;
    usage_date: string;
    created_at: string;
}

export interface MentorApplication {
    application_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    date_of_birth: string;
    country: string;
    profile_bio: string;
    educational_background: string;
    area_of_expertise: any; // JSONB
    linkedin_profile?: string;
    intro_video_url?: string;
    max_mentees: number;
    availability_schedule: any; // JSONB
    motivation_statement: string;
    portfolio_attachments?: any; // JSONB
    application_status: ApplicationStatus;
    approve_application_status: ApproveApplicationStatus;
    deletion_status: boolean;
    submitted_at: string;
    updated_at: string;
}

export interface InfluencerApplication {
    application_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    country: string;
    bio: string;
    specialization_tags: any; // JSONB
    social_links: any; // JSONB
    intro_video_url?: string;
    sample_content_links: any; // JSONB
    preferred_session_format: SessionFormat;
    willing_to_host_sessions: boolean;
    tools_used: any; // JSONB
    application_status: ApplicationStatus;
    approve_application_status: ApproveApplicationStatus;
    deletion_status: boolean;
    submitted_at: string;
    updated_at: string;
}

export interface GuideApplication {
    application_id: number;
    user_id: number;
    first_name: string;
    last_name: string;
    email: string;
    phone_number: string;
    country: string;
    languages_spoken: any; // JSONB
    certifications: any; // JSONB
    stargazing_expertise: any; // JSONB
    operating_locations: any; // JSONB
    profile_bio: string;
    services_offered: any; // JSONB
    max_group_size: number;
    pricing_range: string;
    photos_or_videos_links: any; // JSONB
    availability_schedule: any; // JSONB
    payment_method_pref: PaymentMethod;
    application_status: ApplicationStatus;
    approve_application_status: ApproveApplicationStatus;
    deletion_status: boolean;
    submitted_at: string;
    updated_at: string;
}
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
