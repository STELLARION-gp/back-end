import express from 'express';
import {
  getGroups,
  getUserGroups,
  createGroup,
  joinGroup,
  leaveGroup,
  getGroupDetails,
  getGroupMessages,
  sendMessage
} from '../controllers/chat.controller';
import { verifyToken } from '../middleware/verifyToken';

const router = express.Router();

// All chat routes require authentication
router.use(verifyToken);

// Group management routes
/**
 * @openapi
 * /api/chat/groups:
 *   get:
 *     tags: [Chat]
 *     summary: List groups (public + my private)
 *     responses:
 *       200:
 *         description: Groups
 */
router.get('/groups', getGroups);                    // Get all public groups + user's private groups
/**
 * @openapi
 * /api/chat/user/groups:
 *   get:
 *     tags: [Chat]
 *     summary: List my groups
 *     responses:
 *       200:
 *         description: My groups
 */
router.get('/user/groups', getUserGroups);           // Get user's joined groups
/**
 * @openapi
 * /api/chat/groups:
 *   post:
 *     tags: [Chat]
 *     summary: Create group
 *     responses:
 *       201:
 *         description: Created
 */
router.post('/groups', createGroup);                 // Create new group
/**
 * @openapi
 * /api/chat/groups/{groupId}:
 *   get:
 *     tags: [Chat]
 *     summary: Get group details
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Group
 */
router.get('/groups/:groupId', getGroupDetails);     // Get group details
/**
 * @openapi
 * /api/chat/groups/{groupId}/join:
 *   post:
 *     tags: [Chat]
 *     summary: Join a group
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Joined
 */
router.post('/groups/:groupId/join', joinGroup);     // Join a group
/**
 * @openapi
 * /api/chat/groups/{groupId}/leave:
 *   post:
 *     tags: [Chat]
 *     summary: Leave a group
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Left
 */
router.post('/groups/:groupId/leave', leaveGroup);   // Leave a group

// Message routes
/**
 * @openapi
 * /api/chat/groups/{groupId}/messages:
 *   get:
 *     tags: [Chat]
 *     summary: List group messages
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Messages
 */
router.get('/groups/:groupId/messages', getGroupMessages); // Get group messages
/**
 * @openapi
 * /api/chat/groups/{groupId}/messages:
 *   post:
 *     tags: [Chat]
 *     summary: Send message to group
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *             required: [content]
 *     responses:
 *       201:
 *         description: Sent
 */
router.post('/groups/:groupId/messages', sendMessage);     // Send message

export default router;
