// controllers/user.controller.ts
import { Request, Response } from "express";
import pool from "../db";

export const createUserIfNotExists = async (req: Request, res: Response) => {
  const { firebaseUser } = req.body;
  const { uid, email } = firebaseUser;

  try {
    const existing = await pool.query("SELECT * FROM users WHERE firebase_uid = $1", [uid]);
    if (existing.rows.length > 0) {
      return res.json({ message: "User already exists" });
    }

    const result = await pool.query(
      "INSERT INTO users (firebase_uid, email) VALUES ($1, $2) RETURNING *",
      [uid, email]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Database error" });
  }
};
