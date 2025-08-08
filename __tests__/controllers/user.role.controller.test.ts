// __tests__/controllers/user.role.controller.test.ts
import { Request, Response } from 'express';
import { prismaMock } from '../mocks/prisma.mock';
import { updateUserRole } from '../../controllers/user.controller';

const mockReq = () => ({ params: {}, body: {} } as unknown as Request);
const mockRes = () => { const r: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn() }; return r as Response; };

describe('updateUserRole', () => {
    it('400 when missing role', async () => {
        const req = mockReq();
        const res = mockRes();
        req.params = { userId: '1' } as any;
        await updateUserRole(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('400 when invalid role', async () => {
        const req = mockReq();
        const res = mockRes();
        req.params = { userId: '1' } as any;
        req.body = { role: 'invalid' } as any;
        await updateUserRole(req, res);
        expect(res.status).toHaveBeenCalledWith(400);
    });

    it('404 when user not found', async () => {
        const req = mockReq();
        const res = mockRes();
        req.params = { userId: '99' } as any;
        req.body = { role: 'admin' } as any;
        const error: any = new Error('Not found');
        error.code = 'P2025';
        prismaMock.users.update.mockRejectedValueOnce(error);
        await updateUserRole(req, res);
        expect(res.status).toHaveBeenCalledWith(404);
    });
});
