import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../utils/responses';

// Get messages for a mentor-mentee connection
export const getMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { connectionId } = req.params;
    const { page = 1, limit = 50, before_id } = req.query;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!connectionId || isNaN(parseInt(connectionId))) {
      errorResponse(res, 'Valid connection ID is required', 400);
      return;
    }

    const connectionIdNum = parseInt(connectionId);

    // Verify user is part of this connection
    const connection = await prisma.mentor_mentee_connections.findFirst({
      where: {
        connection_id: connectionIdNum,
        OR: [
          { mentor_id: userId },
          { mentee_id: userId }
        ]
      }
    });

    if (!connection) {
      errorResponse(res, 'Connection not found or access denied', 404);
      return;
    }

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);

    let whereClause: any = {
      connection_id: connectionIdNum,
      is_deleted: false
    };

    if (before_id) {
      whereClause.message_id = {
        lt: parseInt(before_id as string)
      };
    }

    const messages = await prisma.mentor_mentee_messages.findMany({
      where: whereClause,
      include: {
        sender: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_data: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limitNum
    });

    // Reverse to show oldest first
    const orderedMessages = messages.reverse();

    const totalMessages = await prisma.mentor_mentee_messages.count({
      where: {
        connection_id: connectionIdNum,
        is_deleted: false
      }
    });

    const hasMore = messages.length === limitNum;
    const nextCursor = hasMore ? messages[0]?.message_id : null;

    // Mark messages as read for the current user (other person's messages)
    await prisma.mentor_mentee_messages.updateMany({
      where: {
        connection_id: connectionIdNum,
        sender_id: { not: userId },
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    successResponse(res, 'Messages retrieved successfully', {
      messages: orderedMessages.map(message => {
        const profileData = message.sender?.profile_data as any;
        return {
          ...message,
          is_own_message: message.sender_id === userId,
          sender: {
            id: message.sender.id,
            name: message.sender.display_name || 
                  `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() || 
                  message.sender.email.split('@')[0],
            avatarUrl: profileData?.avatarUrl || profileData?.profilePicture || profileData?.avatar || null
          }
        };
      }),
      pagination: {
        total_messages: totalMessages,
        has_more: hasMore,
        next_cursor: nextCursor,
        current_page: pageNum
      }
    });

  } catch (error) {
    console.error('Error getting messages:', error);
    errorResponse(res, 'Failed to retrieve messages', 500);
  }
};

// Send a message
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { connectionId } = req.params;
    const { content, type = 'text' } = req.body;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!connectionId || isNaN(parseInt(connectionId))) {
      errorResponse(res, 'Valid connection ID is required', 400);
      return;
    }

    if (!content || content.trim().length === 0) {
      errorResponse(res, 'Message content is required', 400);
      return;
    }

    if (content.length > 2000) {
      errorResponse(res, 'Message content must be less than 2000 characters', 400);
      return;
    }

    const connectionIdNum = parseInt(connectionId);

    // Verify user is part of this connection
    const connection = await prisma.mentor_mentee_connections.findFirst({
      where: {
        connection_id: connectionIdNum,
        status: 'active',
        OR: [
          { mentor_id: userId },
          { mentee_id: userId }
        ]
      }
    });

    if (!connection) {
      errorResponse(res, 'Connection not found, inactive, or access denied', 404);
      return;
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file'];
    if (!validTypes.includes(type)) {
      errorResponse(res, 'Invalid message type', 400);
      return;
    }

    const message = await prisma.mentor_mentee_messages.create({
      data: {
        connection_id: connectionIdNum,
        sender_id: userId,
        message_text: content.trim(),
        message_type: type,
        is_edited: false,
        is_deleted: false
      },
      include: {
        sender: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            email: true,
            profile_data: true
          }
        }
      }
    });

    // Update connection's last_activity
    await prisma.mentor_mentee_connections.update({
      where: { connection_id: connectionIdNum },
      data: { last_activity: new Date() }
    });

    const profileData = message.sender.profile_data as any;

    successResponse(res, 'Message sent successfully', {
      message: {
        ...message,
        is_own_message: true,
        sender: {
          id: message.sender.id,
          name: message.sender.display_name || 
                `${message.sender.first_name || ''} ${message.sender.last_name || ''}`.trim() || 
                message.sender.email.split('@')[0],
          avatarUrl: profileData?.avatarUrl || profileData?.profilePicture || profileData?.avatar || null
        }
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    errorResponse(res, 'Failed to send message', 500);
  }
};

// Mark messages as read
export const markAsRead = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { connectionId } = req.params;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!connectionId || isNaN(parseInt(connectionId))) {
      errorResponse(res, 'Valid connection ID is required', 400);
      return;
    }

    const connectionIdNum = parseInt(connectionId);

    // Verify user is part of this connection
    const connection = await prisma.mentor_mentee_connections.findFirst({
      where: {
        connection_id: connectionIdNum,
        OR: [
          { mentor_id: userId },
          { mentee_id: userId }
        ]
      }
    });

    if (!connection) {
      errorResponse(res, 'Connection not found or access denied', 404);
      return;
    }

    // Mark unread messages from other person as read
    const result = await prisma.mentor_mentee_messages.updateMany({
      where: {
        connection_id: connectionIdNum,
        sender_id: { not: userId },
        is_read: false
      },
      data: {
        is_read: true,
        read_at: new Date()
      }
    });

    successResponse(res, 'Messages marked as read', {
      marked_count: result.count
    });

  } catch (error) {
    console.error('Error marking messages as read:', error);
    errorResponse(res, 'Failed to mark messages as read', 500);
  }
};

// Get unread message count
export const getUnreadCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { connectionId } = req.params;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!connectionId || isNaN(parseInt(connectionId))) {
      errorResponse(res, 'Valid connection ID is required', 400);
      return;
    }

    const connectionIdNum = parseInt(connectionId);

    // Verify user is part of this connection
    const connection = await prisma.mentor_mentee_connections.findFirst({
      where: {
        connection_id: connectionIdNum,
        OR: [
          { mentor_id: userId },
          { mentee_id: userId }
        ]
      }
    });

    if (!connection) {
      errorResponse(res, 'Connection not found or access denied', 404);
      return;
    }

    const unreadCount = await prisma.mentor_mentee_messages.count({
      where: {
        connection_id: connectionIdNum,
        sender_id: { not: userId },
        is_read: false,
        is_deleted: false
      }
    });

    successResponse(res, 'Unread count retrieved', {
      unread_count: unreadCount
    });

  } catch (error) {
    console.error('Error getting unread count:', error);
    errorResponse(res, 'Failed to get unread count', 500);
  }
};

// Edit a message
export const editMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { messageId } = req.params;
    const { content } = req.body;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!messageId || isNaN(parseInt(messageId))) {
      errorResponse(res, 'Valid message ID is required', 400);
      return;
    }

    if (!content || content.trim().length === 0) {
      errorResponse(res, 'Message content is required', 400);
      return;
    }

    if (content.length > 2000) {
      errorResponse(res, 'Message content must be less than 2000 characters', 400);
      return;
    }

    const messageIdNum = parseInt(messageId);

    const message = await prisma.mentor_mentee_messages.findUnique({
      where: { message_id: messageIdNum },
      include: { connection: true }
    });

    if (!message || message.is_deleted) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    // Check if user owns the message
    if (message.sender_id !== userId) {
      errorResponse(res, 'You can only edit your own messages', 403);
      return;
    }

    // Check if message is older than 24 hours
    const messageAge = Date.now() - message.created_at.getTime();
    const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours
    if (messageAge > maxEditTime) {
      errorResponse(res, 'Cannot edit messages older than 24 hours', 400);
      return;
    }

    const updatedMessage = await prisma.mentor_mentee_messages.update({
      where: { message_id: messageIdNum },
      data: {
        message_text: content.trim(),
        is_edited: true,
        updated_at: new Date()
      }
    });

    successResponse(res, 'Message edited successfully', {
      message: updatedMessage
    });

  } catch (error) {
    console.error('Error editing message:', error);
    errorResponse(res, 'Failed to edit message', 500);
  }
};

// Delete a message
export const deleteMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { messageId } = req.params;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
      return;
    }

    if (!messageId || isNaN(parseInt(messageId))) {
      errorResponse(res, 'Valid message ID is required', 400);
      return;
    }

    const messageIdNum = parseInt(messageId);

    const message = await prisma.mentor_mentee_messages.findUnique({
      where: { message_id: messageIdNum },
      include: { connection: true }
    });

    if (!message || message.is_deleted) {
      errorResponse(res, 'Message not found', 404);
      return;
    }

    // Check if user owns the message
    if (message.sender_id !== userId) {
      errorResponse(res, 'You can only delete your own messages', 403);
      return;
    }

    // Soft delete the message
    await prisma.mentor_mentee_messages.update({
      where: { message_id: messageIdNum },
      data: { is_deleted: true }
    });

    successResponse(res, 'Message deleted successfully', {
      message_id: messageIdNum
    });

  } catch (error) {
    console.error('Error deleting message:', error);
    errorResponse(res, 'Failed to delete message', 500);
  }
};
