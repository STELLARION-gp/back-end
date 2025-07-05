// types/index.ts
import { DecodedIdToken } from 'firebase-admin/auth';

declare global {
    namespace Express {
        interface Request {
            body: {
                firebaseUser?: DecodedIdToken;
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
    is_active: boolean;
    last_login?: Date;
    created_at: Date;
    updated_at: Date;
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
