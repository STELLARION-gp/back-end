import express from 'express';
import { verifyToken } from '../middleware/verifyToken';
import {
  getMessages,
  sendMessage,
  markAsRead,
  getUnreadCount,
  editMessage,
  deleteMessage
} from '../controllers/mentorMenteeChat.controller';

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Get messages for a connection
router.get('/:connectionId/messages', getMessages);

// Send a message
router.post('/:connectionId/messages', sendMessage);

// Mark messages as read
router.put('/:connectionId/mark-read', markAsRead);

// Get unread count
router.get('/:connectionId/unread-count', getUnreadCount);

// Edit a message
router.put('/messages/:messageId', editMessage);

// Delete a message
router.delete('/messages/:messageId', deleteMessage);

export default router;
