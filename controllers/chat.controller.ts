import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { successResponse, errorResponse } from '../utils/responses';

// Get all public groups or user's groups
export const getGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { page = 1, limit = 20, search = '', type = 'all' } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {
      is_active: true,
    };

    // Add search functionality
    if (search) {
      whereClause.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { description: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    // Filter by type
    if (type === 'public') {
      whereClause.type = 'public';
    } else if (type === 'joined' && userId) {
      whereClause.members = {
        some: {
          user_id: userId
        }
      };
    }

    const groups = await prisma.group_chats.findMany({
      where: whereClause,
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      },
      orderBy: {
        updated_at: 'desc'
      },
      skip,
      take: limitNum
    });

    const totalGroups = await prisma.group_chats.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalGroups / limitNum);

    // Check if user is member of each group
    const groupsWithMembership = groups.map(group => {
      const isMember = group.members.some(member => member.user_id === userId);
      return {
        ...group,
        is_member: isMember,
        member_count: group._count.members,
        message_count: group._count.messages
      };
    });

    successResponse(res, 'Groups retrieved successfully', {
      groups: groupsWithMembership,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_groups: totalGroups,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error getting groups:', error);
    errorResponse(res, 'Failed to retrieve groups', 500);
  }
};

// Get user's joined groups
export const getUserGroups = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    const { page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const userGroups = await prisma.group_members.findMany({
      where: {
        user_id: userId,
        group: {
          is_active: true
        }
      },
      include: {
        group: {
          include: {
            creator: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true
              }
            },
            _count: {
              select: {
                members: true,
                messages: true
              }
            }
          }
        }
      },
      orderBy: {
        joined_at: 'desc'
      },
      skip,
      take: limitNum
    });

    const totalUserGroups = await prisma.group_members.count({
      where: {
        user_id: userId,
        group: {
          is_active: true
        }
      }
    });

    const totalPages = Math.ceil(totalUserGroups / limitNum);

    const groups = userGroups.map(membership => ({
      ...membership.group,
      membership_role: membership.role,
      joined_at: membership.joined_at,
      member_count: membership.group._count.members,
      message_count: membership.group._count.messages
    }));

    successResponse(res, 'User groups retrieved successfully', {
      groups,
      pagination: {
        current_page: pageNum,
        total_pages: totalPages,
        total_groups: totalUserGroups,
        has_next: pageNum < totalPages,
        has_prev: pageNum > 1
      }
    });

  } catch (error) {
    console.error('Error getting user groups:', error);
    errorResponse(res, 'Failed to retrieve user groups', 500);
  }
};

// Create a new group
export const createGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    const { name, description, max_members = 100, is_public = true } = req.body;

    if (!name || name.trim().length === 0) {
      errorResponse(res, 'Group name is required', 400);
    }

    if (name.length > 100) {
      errorResponse(res, 'Group name must be less than 100 characters', 400);
    }

    if (description && description.length > 500) {
      errorResponse(res, 'Description must be less than 500 characters', 400);
    }

    if (max_members < 2 || max_members > 1000) {
      errorResponse(res, 'Max members must be between 2 and 1000', 400);
    }

    const group = await prisma.group_chats.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        created_by: userId,
        max_members,
        type: is_public ? 'public' : 'private',
        is_active: true
      },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        }
      }
    });

    // Add creator as admin member
    await prisma.group_members.create({
      data: {
        group_id: group.id,
        user_id: userId,
        role: 'admin'
      }
    });

    successResponse(res, 'Group created successfully', {
      group: {
        ...group,
        member_count: 1,
        message_count: 0,
        is_member: true,
        membership_role: 'ADMIN'
      }
    });

  } catch (error) {
    console.error('Error creating group:', error);
    errorResponse(res, 'Failed to create group', 500);
  }
};

// Join a group
export const joinGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { groupId } = req.params;
    const groupIdNum = parseInt(groupId);
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    if (!groupId || isNaN(groupIdNum)) {
      errorResponse(res, 'Valid group ID is required', 400);
    }

    // Check if group exists and is active
    const group = await prisma.group_chats.findFirst({
      where: {
        id: groupIdNum,
        is_active: true
      },
      include: {
        _count: {
          select: {
            members: true
          }
        }
      }
    });

    if (!group) {
      errorResponse(res, 'Group not found or is inactive', 404);
    }

    // Check if group is at capacity
    if (group._count.members >= group.max_members) {
      errorResponse(res, 'Group is at maximum capacity', 400);
    }

    // Check if user is already a member
    const existingMembership = await prisma.group_members.findFirst({
      where: {
        group_id: groupIdNum,
        user_id: userId
      }
    });

    if (existingMembership) {
      errorResponse(res, 'You are already a member of this group', 400);
    } else {
      // Create new membership
      await prisma.group_members.create({
        data: {
          group_id: groupIdNum,
          user_id: userId,
          role: 'member'
        }
      });
    }

    successResponse(res, 'Successfully joined the group', {
      group_id: groupIdNum,
      message: 'Welcome to the group!'
    });

  } catch (error) {
    console.error('Error joining group:', error);
    errorResponse(res, 'Failed to join group', 500);
  }
};

// Leave a group
export const leaveGroup = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { groupId } = req.params;
    const groupIdNum = parseInt(groupId);
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    if (!groupId || isNaN(groupIdNum)) {
      errorResponse(res, 'Valid group ID is required', 400);
    }

    // Check if user is a member
    const membership = await prisma.group_members.findFirst({
      where: {
        group_id: groupIdNum,
        user_id: userId
      },
      include: {
        group: true
      }
    });

    if (!membership) {
      errorResponse(res, 'You are not a member of this group', 400);
    }

    // Delete membership
    await prisma.group_members.delete({
      where: { id: membership.id }
    });

    successResponse(res, 'Successfully left the group', {
      group_id: groupIdNum,
      message: 'You have left the group'
    });

  } catch (error) {
    console.error('Error leaving group:', error);
    errorResponse(res, 'Failed to leave group', 500);
  }
};

// Get group details
export const getGroupDetails = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { groupId } = req.params;
    const groupIdNum = parseInt(groupId);
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    if (!groupId || isNaN(groupIdNum)) {
      errorResponse(res, 'Valid group ID is required', 400);
    }

    const group = await prisma.group_chats.findFirst({
      where: {
        id: groupIdNum,
        is_active: true
      },
      include: {
        creator: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true
          }
        },
        members: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true,
                role: true
              }
            }
          },
          orderBy: [
            { role: 'desc' },
            { joined_at: 'asc' }
          ]
        },
        _count: {
          select: {
            members: true,
            messages: true
          }
        }
      }
    });

    if (!group) {
      errorResponse(res, 'Group not found or is inactive', 404);
    }

    // Check if user is a member
    const userMembership = group.members.find(member => member.user_id === userId);
    
    if (group.type === 'private' && !userMembership) {
      errorResponse(res, 'Access denied to private group', 403);
    }

    const groupDetails = {
      ...group,
      member_count: group._count.members,
      message_count: group._count.messages,
      is_member: Boolean(userMembership),
      user_role: userMembership?.role || null,
      members: group.members.map(member => ({
        id: member.user.id,
        display_name: member.user.display_name,
        first_name: member.user.first_name,
        last_name: member.user.last_name,
        role: member.role,
        joined_at: member.joined_at,
        user_role: member.user.role
      }))
    };

    successResponse(res, 'Group details retrieved successfully', {
      group: groupDetails
    });

  } catch (error) {
    console.error('Error getting group details:', error);
    errorResponse(res, 'Failed to retrieve group details', 500);
  }
};

// Get group messages
export const getGroupMessages = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { groupId } = req.params;
    const groupIdNum = parseInt(groupId);
    const { page = 1, limit = 50, before_id } = req.query;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    if (!groupId || isNaN(groupIdNum)) {
      errorResponse(res, 'Valid group ID is required', 400);
    }

    // Check if user is a member of the group
    const membership = await prisma.group_members.findFirst({
      where: {
        group_id: groupIdNum,
        user_id: userId
      }
    });

    if (!membership) {
      errorResponse(res, 'Access denied: You are not a member of this group', 403);
    }

    const pageNum = parseInt(page as string);
    const limitNum = Math.min(parseInt(limit as string), 100);
    const skip = (pageNum - 1) * limitNum;

    let whereClause: any = {
      group_id: groupIdNum,
      is_deleted: false
    };

    if (before_id) {
      whereClause.id = {
        lt: parseInt(before_id as string)
      };
    }

    const messages = await prisma.chat_messages.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            role: true
          }
        },
        reply_msg: {
          select: {
            id: true,
            message_text: true,
            user: {
              select: {
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        },
        reactions: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        },
        _count: {
          select: {
            reactions: true
          }
        }
      },
      orderBy: {
        created_at: 'desc'
      },
      take: limitNum
    });

    const orderedMessages = messages.reverse();

    const totalMessages = await prisma.chat_messages.count({
      where: {
        group_id: groupIdNum,
        is_deleted: false
      }
    });

    const hasMore = messages.length === limitNum;
    const nextCursor = hasMore ? messages[0]?.id : null;

    successResponse(res, 'Messages retrieved successfully', {
      messages: orderedMessages.map(message => ({
        ...message,
        reaction_count: message._count.reactions,
        reactions: message.reactions.map(reaction => ({
          id: reaction.id,
          type: reaction.reaction,
          user: reaction.user,
          created_at: reaction.created_at
        }))
      })),
      pagination: {
        total_messages: totalMessages,
        has_more: hasMore,
        next_cursor: nextCursor,
        current_page: pageNum
      }
    });

  } catch (error) {
    console.error('Error getting group messages:', error);
    errorResponse(res, 'Failed to retrieve messages', 500);
  }
};

// Send a message to group
export const sendMessage = async (req: Request, res: Response): Promise<void> => {
  try {
    const user = (req as any).user;
    const userId = user?.userId;
    const { groupId } = req.params;
    const groupIdNum = parseInt(groupId);
    const { content, type = 'text', media_url, reply_to_id } = req.body;
    
    if (!userId) {
      errorResponse(res, 'Authentication required', 401);
    }

    if (!groupId || isNaN(groupIdNum)) {
      errorResponse(res, 'Valid group ID is required', 400);
    }

    if (!content || content.trim().length === 0) {
      errorResponse(res, 'Message content is required', 400);
    }

    if (content.length > 2000) {
      errorResponse(res, 'Message content must be less than 2000 characters', 400);
    }

    // Validate message type
    const validTypes = ['text', 'image', 'file', 'system'];
    if (!validTypes.includes(type)) {
      errorResponse(res, 'Invalid message type', 400);
    }

    // Check if user is a member of the group
    const membership = await prisma.group_members.findFirst({
      where: {
        group_id: groupIdNum,
        user_id: userId
      }
    });

    if (!membership) {
      errorResponse(res, 'Access denied: You are not a member of this group', 403);
    }

    const message = await prisma.chat_messages.create({
      data: {
        group_id: groupIdNum,
        user_id: userId,
        message_text: content.trim(),
        message_type: type,
        reply_to: reply_to_id ? parseInt(reply_to_id) : null,
        is_edited: false,
        is_deleted: false
      },
      include: {
        user: {
          select: {
            id: true,
            display_name: true,
            first_name: true,
            last_name: true,
            role: true
          }
        },
        reply_msg: {
          select: {
            id: true,
            message_text: true,
            user: {
              select: {
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        }
      }
    });

    // Update group's updated_at timestamp
    await prisma.group_chats.update({
      where: { id: groupIdNum },
      data: { updated_at: new Date() }
    });

    successResponse(res, 'Message sent successfully', {
      message: {
        ...message,
        reaction_count: 0,
        reactions: []
      }
    });

  } catch (error) {
    console.error('Error sending message:', error);
    errorResponse(res, 'Failed to send message', 500);
  }
};
