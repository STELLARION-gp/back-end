// controllers/user.controller.ts
import { Request, Response } from "express";
import pool from "../db";
import { CreateUserRequest, DatabaseUser } from "../types";

export const createUserIfNotExists = async (req: Request, res: Response): Promise<void> => {
  // Handle both authenticated and test requests
  const { firebaseUser } = req.body as CreateUserRequest;

  if (!firebaseUser || !firebaseUser.uid || !firebaseUser.email) {
    res.status(400).json({ error: "Missing firebaseUser data (uid and email required)" });
    return;
  }

  const { uid, email } = firebaseUser;

  try {
    const existing = await pool.query<DatabaseUser>("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    if (existing.rows.length > 0) {
      res.json({ message: "User already exists", user: existing.rows[0] });
      return;
    }

    const result = await pool.query<DatabaseUser>(
      "INSERT INTO users (firebase_uid, email) VALUES ($1, $2) RETURNING *",
      [uid, email]
    );

    res.status(201).json({ message: "User created successfully", user: result.rows[0] });
  } catch (err) {
    console.error("Database error:", err);
    res.status(500).json({ error: "Database error" });
  }
};
