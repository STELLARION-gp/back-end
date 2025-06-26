// middleware/verifyToken.ts
import { Request, Response, NextFunction } from "express";
import admin from "../firebaseAdmin";

export const verifyToken = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) {
    res.status(401).send("Unauthorized");
    return;
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(token);
    req.body.firebaseUser = decodedToken;
    next();
  } catch (error) {
    res.status(401).send("Invalid token");
  }
};
