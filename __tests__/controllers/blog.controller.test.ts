// __tests__/controllers/blog.controller.test.ts
import { Request, Response } from 'express';
import { prismaMock } from '../mocks/prisma.mock';
import { getBlogs, getBlogById } from '../../controllers/blog.controller';

const mockReq = () => ({ query: {}, params: {} } as unknown as Request);
const mockRes = () => {
    const res: Partial<Response> = { status: jest.fn().mockReturnThis(), json: jest.fn() };
    return res as Response;
};

describe('Blog Controller', () => {
    describe('getBlogs', () => {
        it('returns empty list', async () => {
            const req = mockReq();
            const res = mockRes();
            prismaMock.blogs.findMany.mockResolvedValueOnce([] as any);
            prismaMock.blogs.count.mockResolvedValueOnce(0);
            await getBlogs(req, res);
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, data: expect.objectContaining({ blogs: [] }) }));
        });
    });

    describe('getBlogById', () => {
        it('returns 404 for missing blog', async () => {
            const req = mockReq();
            const res = mockRes();
            req.params = { id: '1' } as any;
            prismaMock.blogs.findUnique.mockResolvedValueOnce(null as any);
            await getBlogById(req, res);
            expect(res.status).toHaveBeenCalledWith(404);
        });
    });
});
