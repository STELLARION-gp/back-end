// __tests__/controllers/user.controller.test.ts
import { Request, Response } from 'express';
import { prismaMock } from '../mocks/prisma.mock';
import * as userController from '../../controllers/user.controller';
import { DatabaseUser, UserRole } from '../../types';
import { user_role, subscription_plan, subscription_status } from '../../prisma/generated/client';

// Mock Express request and response
const mockRequest = () => {
  const req: Partial<Request> = {
    body: {},
    params: {},
    query: {},
  };
  return req as Request;
};

const mockResponse = () => {
  const res: Partial<Response> = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
  return res as Response;
};

describe('User Controller', () => {
  // Common mock data
  const mockUser = {
    id: 1,
    firebase_uid: 'test-firebase-uid-123',
    email: 'test@example.com',
    role: user_role.learner,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
    first_name: 'Test',
    last_name: 'User',
    display_name: 'Test User',
    subscription_plan: subscription_plan.starseeker,
    subscription_status: subscription_status.active,
    subscription_start_date: new Date(),
    subscription_end_date: new Date(),
    auto_renew: false,
    chatbot_questions_used: 0,
    chatbot_questions_reset_date: new Date(),
    profile_data: {},
    role_specific_data: {},
    last_login: new Date()
  };

  describe('createUserIfNotExists', () => {
    it('should return existing user when user already exists', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        firebaseUser: {
          uid: 'test-firebase-uid-123',
          email: 'test@example.com',
          name: 'Test User'
        }
      };

      prismaMock.users.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.users.update.mockResolvedValueOnce(mockUser);

      // Act
      await userController.createUserIfNotExists(req, res);

      // Assert
      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { firebase_uid: 'test-firebase-uid-123' }
      });
      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { firebase_uid: 'test-firebase-uid-123' },
        data: { last_login: expect.any(Date) }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User already exists",
        data: mockUser
      });
    });

    it('should create a new user when user does not exist', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        firebaseUser: {
          uid: 'new-firebase-uid',
          email: 'new@example.com',
          name: 'New User'
        }
      };

      prismaMock.users.findUnique.mockResolvedValueOnce(null);

      const newUser = {
        ...mockUser,
        id: 2,
        firebase_uid: 'new-firebase-uid',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        display_name: 'New User',
        role: user_role.learner,
        subscription_plan: subscription_plan.starseeker,
        subscription_status: subscription_status.active,
      };

      // Mock the transaction
      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.users.create.mockResolvedValueOnce(newUser);
      prismaMock.user_settings.create.mockResolvedValueOnce({ id: 1, user_id: 2 } as any);

      // Act
      await userController.createUserIfNotExists(req, res);

      // Assert
      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { firebase_uid: 'new-firebase-uid' }
      });
      expect(prismaMock.users.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          firebase_uid: 'new-firebase-uid',
          email: 'new@example.com',
          role: 'learner',
          first_name: 'New',
          last_name: 'User',
          display_name: 'New User',
          is_active: true
        })
      });
      expect(prismaMock.user_settings.create).toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User created successfully",
        data: newUser
      });
    });

    it('should return error when firebaseUser data is missing', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        // Missing firebaseUser data
      };

      // Act
      await userController.createUserIfNotExists(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Missing firebaseUser data (uid and email required)"
      });
    });

    it('should handle database errors', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.body = {
        firebaseUser: {
          uid: 'test-firebase-uid',
          email: 'test@example.com'
        }
      };

      const error = new Error('Database connection error');
      prismaMock.users.findUnique.mockRejectedValueOnce(error);

      // Act
      await userController.createUserIfNotExists(req, res);

      // Assert
      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { firebase_uid: 'test-firebase-uid' }
      });
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Database error",
        error: 'Database connection error'
      });
    });
  });

  describe('getUserProfile', () => {
    it('should return user profile if user exists', async () => {
      // Arrange
      const req = mockRequest() as any;
      const res = mockResponse();

      req.user = {
        uid: 'test-firebase-uid-123',
        email: 'test@example.com',
        name: 'Test User'
      };

      prismaMock.users.findUnique.mockResolvedValueOnce(mockUser);
      prismaMock.users.update.mockResolvedValueOnce(mockUser);

      // Act
      await userController.getUserProfile(req, res);

      // Assert
      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { firebase_uid: 'test-firebase-uid-123' },
        select: expect.any(Object)
      });
      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { firebase_uid: 'test-firebase-uid-123' },
        data: { last_login: expect.any(Date) }
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Profile retrieved successfully",
        data: mockUser
      });
    });

    it('should auto-create user if not found but has valid Firebase token', async () => {
      // Arrange
      const req = mockRequest() as any;
      const res = mockResponse();

      req.user = {
        uid: 'new-firebase-uid',
        email: 'new@example.com',
        name: 'New User'
      };

      prismaMock.users.findUnique.mockResolvedValueOnce(null);

      const newUser = {
        ...mockUser,
        id: 2,
        firebase_uid: 'new-firebase-uid',
        email: 'new@example.com',
        first_name: 'New',
        last_name: 'User',
        display_name: 'New User',
        role: user_role.learner,
        subscription_plan: subscription_plan.starseeker,
        subscription_status: subscription_status.active,
      };

      // Mock the transaction
      prismaMock.$transaction.mockImplementationOnce(async (callback) => {
        return await callback(prismaMock);
      });

      prismaMock.users.create.mockResolvedValueOnce(newUser);
      prismaMock.user_settings.create.mockResolvedValueOnce({ id: 1, user_id: 2 } as any);

      // Act
      await userController.getUserProfile(req, res);

      // Assert
      expect(prismaMock.users.findUnique).toHaveBeenCalledWith({
        where: { firebase_uid: 'new-firebase-uid' },
        select: expect.any(Object)
      });
      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User profile created and retrieved successfully",
        data: newUser
      });
    });

    it('should return error if user is not authenticated', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      // No user property on req

      // Act
      await userController.getUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Authentication required"
      });
    });

    it('should return error if user is inactive', async () => {
      // Arrange
      const req = mockRequest() as any;
      const res = mockResponse();

      req.user = {
        uid: 'inactive-user-uid',
        email: 'inactive@example.com',
        name: 'Inactive User'
      };

      const inactiveUser = {
        ...mockUser,
        firebase_uid: 'inactive-user-uid',
        email: 'inactive@example.com',
        is_active: false,
      };

      prismaMock.users.findUnique.mockResolvedValueOnce(inactiveUser);

      // Act
      await userController.getUserProfile(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User account is inactive"
      });
    });
  });

  describe('getAllUsers', () => {
    it('should return a list of users with pagination', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.query = {
        page: '1',
        limit: '10'
      };

      const users = [mockUser];
      const total = 1;

      prismaMock.users.findMany.mockResolvedValueOnce(users);
      prismaMock.users.count.mockResolvedValueOnce(total);

      // Act
      await userController.getAllUsers(req, res);

      // Assert
      expect(prismaMock.users.findMany).toHaveBeenCalledWith(expect.objectContaining({
        skip: 0,
        take: 10
      }));
      expect(prismaMock.users.count).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Users retrieved successfully",
        data: {
          users: users,
          pagination: {
            page: 1,
            limit: 10,
            total: total,
            pages: 1
          }
        }
      });
    });

    it('should filter users by role if provided', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.query = {
        role: 'admin'
      };

      const adminUser = {
        ...mockUser,
        role: user_role.admin
      };

      const users = [adminUser];
      const total = 1;

      prismaMock.users.findMany.mockResolvedValueOnce(users);
      prismaMock.users.count.mockResolvedValueOnce(total);

      // Act
      await userController.getAllUsers(req, res);

      // Assert
      expect(prismaMock.users.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { role: 'admin' }
      }));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Users retrieved successfully",
        data: expect.any(Object)
      });
    });

    it('should filter users by search term if provided', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.query = {
        search: 'test'
      };

      const users = [mockUser];
      const total = 1;

      prismaMock.users.findMany.mockResolvedValueOnce(users);
      prismaMock.users.count.mockResolvedValueOnce(total);

      // Act
      await userController.getAllUsers(req, res);

      // Assert
      expect(prismaMock.users.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: {
          OR: expect.arrayContaining([
            { email: { contains: 'test', mode: 'insensitive' } }
          ])
        }
      }));
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "Users retrieved successfully",
        data: expect.any(Object)
      });
    });
  });

  describe('updateUserRole', () => {
    it('should update user role successfully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '1' };
      req.body = { role: 'admin' };

      const updatedUser = {
        ...mockUser,
        role: user_role.admin
      };

      prismaMock.users.update.mockResolvedValueOnce(updatedUser);

      // Act
      await userController.updateUserRole(req, res);

      // Assert
      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          role: 'admin',
          updated_at: expect.any(Date)
        })
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User role updated successfully",
        data: updatedUser
      });
    });

    it('should return error for invalid role', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '1' };
      req.body = { role: 'invalid-role' };

      // Act
      await userController.updateUserRole(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: expect.stringContaining("Invalid role")
      });
    });

    it('should return error if role is not provided', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '1' };
      req.body = {};  // No role provided

      // Act
      await userController.updateUserRole(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "Role is required"
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '999' };  // Non-existent user
      req.body = { role: 'admin' };

      const error: any = new Error('User not found');
      error.code = 'P2025';
      prismaMock.users.update.mockRejectedValueOnce(error);

      // Act
      await userController.updateUserRole(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });
  });

  describe('deactivateUser', () => {
    it('should deactivate user successfully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '1' };

      const deactivatedUser = {
        ...mockUser,
        is_active: false
      };

      prismaMock.users.update.mockResolvedValueOnce(deactivatedUser);

      // Act
      await userController.deactivateUser(req, res);

      // Assert
      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          is_active: false,
          updated_at: expect.any(Date)
        })
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User deactivated successfully",
        data: deactivatedUser
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '999' };  // Non-existent user

      const error: any = new Error('User not found');
      error.code = 'P2025';
      prismaMock.users.update.mockRejectedValueOnce(error);

      // Act
      await userController.deactivateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });
  });

  describe('activateUser', () => {
    it('should activate user successfully', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '1' };

      const activatedUser = {
        ...mockUser,
        is_active: true
      };

      prismaMock.users.update.mockResolvedValueOnce(activatedUser);

      // Act
      await userController.activateUser(req, res);

      // Assert
      expect(prismaMock.users.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          is_active: true,
          updated_at: expect.any(Date)
        })
      });
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        message: "User activated successfully",
        data: activatedUser
      });
    });

    it('should return 404 if user not found', async () => {
      // Arrange
      const req = mockRequest();
      const res = mockResponse();

      req.params = { userId: '999' };  // Non-existent user

      const error: any = new Error('User not found');
      error.code = 'P2025';
      prismaMock.users.update.mockRejectedValueOnce(error);

      // Act
      await userController.activateUser(req, res);

      // Assert
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        message: "User not found"
      });
    });
  });
});
