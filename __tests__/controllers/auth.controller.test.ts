// __tests__/controllers/auth.controller.test.ts
import { Request, Response } from "express";
import {
  signUp,
  signIn,
  signOut,
  updateProfile,
  changePassword,
  deleteAccount,
  resetPassword,
  verifyEmail,
} from "../../controllers/auth.controller";
import admin from "../../firebaseAdmin";
import { PrismaClient } from "../../prisma/generated/client";
import axios from "axios";

// Mock dependencies
jest.mock("../../firebaseAdmin");
jest.mock("../../prisma/generated/client");
jest.mock("axios");

const mockPrisma = {
  users: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  user_settings: {
    create: jest.fn(),
  },
  $transaction: jest.fn(),
};

(PrismaClient as jest.MockedClass<typeof PrismaClient>).mockImplementation(
  () => mockPrisma as any
);

describe("Authentication Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseJson: jest.Mock;
  let responseStatus: jest.Mock;

  beforeEach(() => {
    responseJson = jest.fn();
    responseStatus = jest.fn().mockReturnValue({ json: responseJson });

    mockRequest = {
      body: {},
      headers: {},
    };

    mockResponse = {
      json: responseJson,
      status: responseStatus,
    };

    // Clear all mocks
    jest.clearAllMocks();
  });

  describe("signUp", () => {
    it("should create a new user successfully", async () => {
      const userData = {
        email: "test@example.com",
        password: "password123",
        first_name: "Test",
        last_name: "User",
        role: "learner",
      };

      mockRequest.body = userData;

      const mockFirebaseUser = { uid: "firebase-uid-123" };
      const mockDbUser = {
        id: 1,
        firebase_uid: "firebase-uid-123",
        email: "test@example.com",
        first_name: "Test",
        last_name: "User",
        display_name: "Test User",
        role: "learner",
        is_active: true,
      };

      mockPrisma.users.findUnique.mockResolvedValue(null);
      (admin.auth().createUser as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockFirebaseUser);
      mockPrisma.$transaction.mockResolvedValue(mockDbUser);
      (admin.auth().createCustomToken as jest.Mock) = jest
        .fn()
        .mockResolvedValue("custom-token");

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(201);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "User created successfully",
          user: mockDbUser,
          customToken: "custom-token",
        })
      );
    });

    it("should reject signup with invalid email format", async () => {
      mockRequest.body = {
        email: "invalid-email",
        password: "password123",
      };

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid email format",
        })
      );
    });

    it("should reject signup with weak password", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "123",
      };

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Password must be at least 6 characters long",
        })
      );
    });

    it("should reject signup if user already exists", async () => {
      mockRequest.body = {
        email: "existing@example.com",
        password: "password123",
      };

      mockPrisma.users.findUnique.mockResolvedValue({ id: 1 });

      await signUp(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "User with this email already exists",
        })
      );
    });
  });

  describe("signIn", () => {
    beforeEach(() => {
      process.env.FIREBASE_API_KEY = "test-api-key";
    });

    it("should sign in user successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockFirebaseResponse = {
        data: {
          localId: "firebase-uid-123",
        },
      };

      const mockFirebaseUser = {
        uid: "firebase-uid-123",
        email: "test@example.com",
      };

      const mockDbUser = {
        id: 1,
        firebase_uid: "firebase-uid-123",
        email: "test@example.com",
        is_active: true,
      };

      (axios.post as jest.Mock).mockResolvedValue(mockFirebaseResponse);
      (admin.auth().getUser as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockFirebaseUser);
      mockPrisma.users.findUnique.mockResolvedValue(mockDbUser);
      mockPrisma.users.update.mockResolvedValue(mockDbUser);
      (admin.auth().createCustomToken as jest.Mock) = jest
        .fn()
        .mockResolvedValue("custom-token");

      await signIn(mockRequest as Request, mockResponse as Response);

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Sign in successful",
          user: mockDbUser,
          customToken: "custom-token",
        })
      );
    });

    it("should reject sign in with invalid credentials", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "wrongpassword",
      };

      const mockError = {
        response: {
          data: {
            error: {
              message: "INVALID_PASSWORD",
            },
          },
        },
      };

      (axios.post as jest.Mock).mockRejectedValue(mockError);

      await signIn(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid password",
        })
      );
    });

    it("should reject sign in if user account is deactivated", async () => {
      mockRequest.body = {
        email: "test@example.com",
        password: "password123",
      };

      const mockFirebaseResponse = {
        data: { localId: "firebase-uid-123" },
      };

      const mockFirebaseUser = {
        uid: "firebase-uid-123",
        email: "test@example.com",
      };

      const mockDbUser = {
        id: 1,
        firebase_uid: "firebase-uid-123",
        email: "test@example.com",
        is_active: false,
      };

      (axios.post as jest.Mock).mockResolvedValue(mockFirebaseResponse);
      (admin.auth().getUser as jest.Mock) = jest
        .fn()
        .mockResolvedValue(mockFirebaseUser);
      mockPrisma.users.findUnique.mockResolvedValue(mockDbUser);

      await signIn(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(403);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "User account is deactivated",
        })
      );
    });
  });

  describe("updateProfile", () => {
    it("should update user profile successfully", async () => {
      mockRequest.body = {
        first_name: "Updated",
        last_name: "Name",
        email: "newemail@example.com",
      };

      (mockRequest as any).user = {
        uid: "firebase-uid-123",
        email: "old@example.com",
      };

      const mockUpdatedUser = {
        id: 1,
        firebase_uid: "firebase-uid-123",
        first_name: "Updated",
        last_name: "Name",
        display_name: "Updated Name",
        email: "newemail@example.com",
      };

      mockPrisma.users.findFirst.mockResolvedValue(null);
      (admin.auth().updateUser as jest.Mock) = jest.fn().mockResolvedValue({});
      mockPrisma.users.update.mockResolvedValue(mockUpdatedUser);

      await updateProfile(mockRequest as Request, mockResponse as Response);

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Profile updated successfully",
          data: mockUpdatedUser,
        })
      );
    });

    it("should reject email update if email already exists", async () => {
      mockRequest.body = {
        email: "existing@example.com",
      };

      (mockRequest as any).user = {
        uid: "firebase-uid-123",
        email: "old@example.com",
      };

      mockPrisma.users.findFirst.mockResolvedValue({
        id: 2,
        firebase_uid: "different-uid",
        email: "existing@example.com",
      });

      await updateProfile(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(409);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Email already in use by another account",
        })
      );
    });

    it("should update display_name when first_name or last_name changes", async () => {
      mockRequest.body = {
        first_name: "New",
        last_name: "Name",
      };

      (mockRequest as any).user = {
        uid: "firebase-uid-123",
      };

      (admin.auth().updateUser as jest.Mock) = jest.fn().mockResolvedValue({});
      mockPrisma.users.update.mockResolvedValue({});

      await updateProfile(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.users.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            display_name: "New Name",
          }),
        })
      );
    });
  });

  describe("resetPassword", () => {
    beforeEach(() => {
      process.env.FIREBASE_API_KEY = "test-api-key";
    });

    it("should send password reset email successfully", async () => {
      mockRequest.body = {
        email: "test@example.com",
      };

      (axios.post as jest.Mock).mockResolvedValue({});

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("sendOobCode"),
        expect.objectContaining({
          requestType: "PASSWORD_RESET",
          email: "test@example.com",
        })
      );

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("password reset link has been sent"),
        })
      );
    });

    it("should reject invalid email format", async () => {
      mockRequest.body = {
        email: "invalid-email",
      };

      await resetPassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Invalid email format",
        })
      );
    });

    it("should not reveal if email exists (security)", async () => {
      mockRequest.body = {
        email: "nonexistent@example.com",
      };

      const mockError = {
        response: { data: { error: { message: "EMAIL_NOT_FOUND" } } },
      };

      (axios.post as jest.Mock).mockRejectedValue(mockError);

      await resetPassword(mockRequest as Request, mockResponse as Response);

      // Should still return success for security
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
        })
      );
    });
  });

  describe("changePassword", () => {
    it("should change password successfully", async () => {
      mockRequest.body = {
        new_password: "newpassword123",
      };

      (mockRequest as any).user = {
        uid: "firebase-uid-123",
      };

      (admin.auth().updateUser as jest.Mock) = jest.fn().mockResolvedValue({});
      (admin.auth().revokeRefreshTokens as jest.Mock) = jest
        .fn()
        .mockResolvedValue({});

      await changePassword(mockRequest as Request, mockResponse as Response);

      expect(admin.auth().updateUser).toHaveBeenCalledWith(
        "firebase-uid-123",
        expect.objectContaining({ password: "newpassword123" })
      );

      expect(admin.auth().revokeRefreshTokens).toHaveBeenCalledWith(
        "firebase-uid-123"
      );

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: expect.stringContaining("Password changed successfully"),
        })
      );
    });

    it("should reject weak password", async () => {
      mockRequest.body = {
        new_password: "123",
      };

      (mockRequest as any).user = {
        uid: "firebase-uid-123",
      };

      await changePassword(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(400);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: expect.stringContaining("at least 6 characters"),
        })
      );
    });
  });

  describe("deleteAccount", () => {
    it("should delete account successfully", async () => {
      (mockRequest as any).user = {
        uid: "firebase-uid-123",
      };

      mockPrisma.users.delete.mockResolvedValue({});
      (admin.auth().deleteUser as jest.Mock) = jest.fn().mockResolvedValue({});

      await deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(mockPrisma.users.delete).toHaveBeenCalledWith({
        where: { firebase_uid: "firebase-uid-123" },
      });

      expect(admin.auth().deleteUser).toHaveBeenCalledWith("firebase-uid-123");

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Account deleted successfully",
        })
      );
    });

    it("should handle database deletion error", async () => {
      (mockRequest as any).user = {
        uid: "firebase-uid-123",
      };

      const mockError = { code: "P2000" };
      mockPrisma.users.delete.mockRejectedValue(mockError);

      await deleteAccount(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(500);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Failed to delete user from database",
        })
      );
    });
  });

  describe("verifyEmail", () => {
    beforeEach(() => {
      process.env.FIREBASE_API_KEY = "test-api-key";
    });

    it("should send verification email successfully", async () => {
      (mockRequest as any).user = {
        uid: "firebase-uid-123",
        email: "test@example.com",
      };

      mockRequest.headers = {
        authorization: "Bearer test-id-token",
      };

      (axios.post as jest.Mock).mockResolvedValue({});

      await verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(axios.post).toHaveBeenCalledWith(
        expect.stringContaining("sendOobCode"),
        expect.objectContaining({
          requestType: "VERIFY_EMAIL",
          idToken: "test-id-token",
        })
      );

      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: true,
          message: "Verification email sent successfully",
        })
      );
    });

    it("should require authentication", async () => {
      (mockRequest as any).user = null;

      await verifyEmail(mockRequest as Request, mockResponse as Response);

      expect(responseStatus).toHaveBeenCalledWith(401);
      expect(responseJson).toHaveBeenCalledWith(
        expect.objectContaining({
          success: false,
          message: "Authentication required",
        })
      );
    });
  });
});
