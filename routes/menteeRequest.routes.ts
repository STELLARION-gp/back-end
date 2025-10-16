import { Router } from "express";
import { MenteeRequestController } from "../controllers/menteeRequest.controller";
import { verifyToken } from "../middleware/verifyToken";

const router = Router();

// All endpoints require authentication
router.get("/", verifyToken, MenteeRequestController.list);
router.get("/:id", verifyToken, MenteeRequestController.getById);
router.post("/:id/accept", verifyToken, MenteeRequestController.accept);
router.delete("/:id", verifyToken, MenteeRequestController.remove);

export default router;
