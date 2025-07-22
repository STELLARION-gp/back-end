// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    console.log('� [AUTH] Verifying Firebase token...');
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ [AUTH] No valid authorization header found');
      res.status(401).json({
        success: false,
        message: "No authorization token provided"
      });
      return;
    }

    const token = authHeader.split(' ')[1];
    console.log('� [AUTH] Token found, length:', token?.length);

    if (!token) {
      console.log('❌ [AUTH] Token is empty');
      res.status(401).json({
        success: false,
        message: "Invalid authorization token format"
      });
      return;
    }

    try {
      const decodedToken = await admin.auth().verifyIdToken(token);
      console.log('✅ [AUTH] Token verified successfully');
      console.log('👤 [AUTH] User:', decodedToken.email, 'UID:', decodedToken.uid);

      // Add user info to request
      (req as any).user = {
        uid: decodedToken.uid,
        email: decodedToken.email,
        firebase_uid: decodedToken.uid,
        name: decodedToken.name,
        display_name: decodedToken.name
      };

      next();
    } catch (tokenError) {
      console.error('❌ [AUTH] Token verification failed:', tokenError.message);
      res.status(401).json({
        success: false,
        message: "Invalid or expired token"
      });
      return;
    }

  } catch (error) {
    console.error('❌ [AUTH] Authentication middleware error:', error);
    res.status(500).json({
      success: false,
      message: "Authentication service error"
    });
    return;
  }
};
