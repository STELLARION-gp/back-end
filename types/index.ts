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

export interface DatabaseUser {
    id: number;
    firebase_uid: string;
    email: string;
    created_at: Date;
    updated_at: Date;
}

export interface CreateUserRequest {
    firebaseUser: {
        uid: string;
        email: string;
    };
}
