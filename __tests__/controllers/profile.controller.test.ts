import { Request, Response } from 'express';
import { prismaMock } from '../mocks/prisma.mock';
import * as profileController from '../../controllers/profile.controller';

const mockReq = () => ({ params: {}, body: {}, query: {} } as unknown as Request);
const mockRes = () => { const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn() }; return res as Response; };

describe('Profile Controller (Prisma)', () => {
    beforeEach(() => { jest.clearAllMocks(); });

    describe('getDetailedProfile', () => {
        it('401 when unauthenticated', async () => {
            const req = mockReq();
            const res = mockRes();
            await profileController.getDetailedProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(401);
        });

        it('returns existing profile with settings', async () => {
            const req = mockReq();
            const res = mockRes();
            (req as any).user = { uid: 'abc', email: 't@e.com' };
            prismaMock.users.findUnique.mockResolvedValueOnce({
                id: 1, firebase_uid: 'abc', email: 't@e.com', role: 'learner', first_name: 'T', last_name: 'E', display_name: 'T E', is_active: true,
                last_login: new Date(), created_at: new Date(), updated_at: new Date(), profile_data: {}, role_specific_data: {},
                user_settings: { language: 'en', email_notifications: true, push_notifications: true, profile_visibility: 'public', allow_direct_messages: true, show_online_status: true, theme: 'dark', timezone: 'UTC' }
            } as any);
            prismaMock.users.update.mockResolvedValueOnce({} as any);
            await profileController.getDetailedProfile(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));
        });

        it('403 for inactive user', async () => {
            const req = mockReq();
            const res = mockRes();
            (req as any).user = { uid: 'inactive', email: 'i@e.com' };
            prismaMock.users.findUnique.mockResolvedValueOnce({
                id: 2, firebase_uid: 'inactive', email: 'i@e.com', role: 'learner', is_active: false,
                first_name: 'In', last_name: 'Active', display_name: 'In Active', last_login: new Date(), created_at: new Date(), updated_at: new Date(),
                profile_data: {}, role_specific_data: {}, user_settings: { language: 'en' }
            } as any);
            await profileController.getDetailedProfile(req, res);
            expect(res.status).toHaveBeenCalledWith(403);
        });
    });
});
