// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";
import pool from "../db";

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

      // Fetch user from database to get role and other info
      const userQuery = `
        SELECT id, firebase_uid, email, role, first_name, last_name, display_name, is_active
        FROM users 
        WHERE firebase_uid = $1
      `;
      
      const userResult = await pool.query(userQuery, [decodedToken.uid]);
      
      if (userResult.rows.length === 0) {
        console.log('❌ [AUTH] User not found in database');
        res.status(401).json({
          success: false,
          message: "User not found in system"
        });
        return;
      }

      const dbUser = userResult.rows[0];
      
      if (!dbUser.is_active) {
        console.log('❌ [AUTH] User account is deactivated');
        res.status(401).json({
          success: false,
          message: "Account is deactivated"
        });
        return;
      }

      console.log('👤 [AUTH] User role:', dbUser.role);

      // Add complete user info to request
      (req as any).user = {
        id: dbUser.id,
        uid: decodedToken.uid,
        email: decodedToken.email,
        firebase_uid: decodedToken.uid,
        role: dbUser.role,
        first_name: dbUser.first_name,
        last_name: dbUser.last_name,
        display_name: dbUser.display_name || decodedToken.name,
        name: decodedToken.name || dbUser.display_name
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
