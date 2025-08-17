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
router.get('/groups', getGroups);                    // Get all public groups + user's private groups
router.get('/user/groups', getUserGroups);           // Get user's joined groups
router.post('/groups', createGroup);                 // Create new group
router.get('/groups/:groupId', getGroupDetails);     // Get group details
router.post('/groups/:groupId/join', joinGroup);     // Join a group
router.post('/groups/:groupId/leave', leaveGroup);   // Leave a group

// Message routes
router.get('/groups/:groupId/messages', getGroupMessages); // Get group messages
router.post('/groups/:groupId/messages', sendMessage);     // Send message

export default router;
