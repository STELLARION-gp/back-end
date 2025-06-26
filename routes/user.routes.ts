// routes/user.routes.ts
import express from "express";
import { createUserIfNotExists } from "../controllers/user.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = express.Router();
router.post("/register", verifyToken, createUserIfNotExists);
// Temporary test endpoint without authentication (remove in production)
router.post("/test-register", createUserIfNotExists);

export default router;
