// controllers/poll.controller.ts
import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';

const prisma = new PrismaClient();

/**
 * Create a new poll
 * @route POST /api/polls
 * @access Private (Authenticated users)
 */
export const createPoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, options } = req.body;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Validate required fields
    if (!title || !title.trim()) {
      res.status(400).json({
        success: false,
        message: "Poll title is required"
      });
      return;
    }

    // Handle custom options or use default Yes/Maybe/No
    let pollChoices: Array<{ choice: string; vote_count: number }>;
    
    if (options && Array.isArray(options) && options.length > 0) {
      // Custom options provided - validate them
      if (options.length < 2) {
        res.status(400).json({
          success: false,
          message: "At least 2 poll options are required"
        });
        return;
      }
      
      if (options.length > 10) {
        res.status(400).json({
          success: false,
          message: "Maximum 10 poll options allowed"
        });
        return;
      }
      
      // Validate each option
      const validOptions = options
        .map((opt: string) => opt?.trim())
        .filter((opt: string) => opt && opt.length > 0);
      
      if (validOptions.length < 2) {
        res.status(400).json({
          success: false,
          message: "At least 2 valid poll options are required"
        });
        return;
      }
      
      // Check for duplicate options
      const uniqueOptions = [...new Set(validOptions)];
      if (uniqueOptions.length !== validOptions.length) {
        res.status(400).json({
          success: false,
          message: "Duplicate poll options are not allowed"
        });
        return;
      }
      
      pollChoices = validOptions.map((opt: string) => ({
        choice: opt,
        vote_count: 0
      }));
    } else {
      // Use default Yes/Maybe/No options
      pollChoices = [
        { choice: 'yes', vote_count: 0 },
        { choice: 'maybe', vote_count: 0 },
        { choice: 'no', vote_count: 0 }
      ];
    }

    // Create the poll with the choices
    const newPoll = await prisma.polls.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        created_by: userId,
        is_active: true,
        poll_choices: {
          create: pollChoices
        }
      },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            email: true,
            display_name: true,
          }
        },
        poll_choices: true,
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: newPoll,
      message: "Poll created successfully"
    });
  } catch (error: any) {
    console.error("Create poll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create poll",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Vote on a poll
 * @route POST /api/polls/:id/vote
 * @access Private (Authenticated users)
 */
export const voteOnPoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { choice } = req.body; // 'yes', 'maybe', or 'no'

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Validate choice
    // Validate choice
    if (!choice || typeof choice !== 'string' || !choice.trim()) {
      res.status(400).json({
        success: false,
        message: "Choice is required"
      });
      return;
    }

    const pollId = parseInt(id);

    // Check if poll exists and is active
    const poll = await prisma.polls.findUnique({
      where: { id: pollId },
      include: {
        poll_choices: true
      }
    });

    if (!poll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    if (!poll.is_active) {
      res.status(400).json({
        success: false,
        message: "This poll is closed and no longer accepting votes"
      });
      return;
    }

    // Validate that the choice exists in this poll
    const selectedChoice = poll.poll_choices.find(c => c.choice === choice.trim());

    if (!selectedChoice) {
      res.status(400).json({
        success: false,
        message: "Invalid choice for this poll",
        available_choices: poll.poll_choices.map(c => c.choice)
      });
      return;
    }

    // Check if user has already voted
    const existingVote = await prisma.poll_votes.findFirst({
      where: {
        poll_id: pollId,
        user_id: userId
      },
      include: {
        poll_choices: true
      }
    });

    // If user already voted, update their vote (change vote)
    if (existingVote) {
      // Check if voting for the same choice
      if (existingVote.poll_choices.choice === choice.trim()) {
        res.status(200).json({
          success: true,
          message: "You have already voted for this option",
          data: {
            previous_vote: existingVote.poll_choices.choice,
            voted_at: existingVote.voted_at
          }
        });
        return;
      }

      // Change vote: decrement old choice, increment new choice, update vote record
      const result = await prisma.$transaction(async (tx) => {
        // Decrement the old choice vote count
        await tx.poll_choices.update({
          where: { id: existingVote.choice_id },
          data: {
            vote_count: {
              decrement: 1
            }
          }
        });

        // Increment the new choice vote count
        await tx.poll_choices.update({
          where: { id: selectedChoice.id },
          data: {
            vote_count: {
              increment: 1
            }
          }
        });

        // Update the vote record
        const updatedVote = await tx.poll_votes.update({
          where: { id: existingVote.id },
          data: {
            choice_id: selectedChoice.id,
            voted_at: new Date()
          },
          include: {
            poll_choices: true,
            voter: {
              select: {
                id: true,
                display_name: true,
                first_name: true,
                last_name: true
              }
            }
          }
        });

        return updatedVote;
      });

      res.status(200).json({
        success: true,
        data: result,
        message: "Vote changed successfully",
        previous_vote: existingVote.poll_choices.choice
      });
      return;
    }

    // Create new vote and increment vote count in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the vote
      const vote = await tx.poll_votes.create({
        data: {
          poll_id: pollId,
          choice_id: selectedChoice.id,
          user_id: userId
        },
        include: {
          poll_choices: true,
          voter: {
            select: {
              id: true,
              display_name: true,
              first_name: true,
              last_name: true
            }
          }
        }
      });

      // Increment the vote count
      await tx.poll_choices.update({
        where: { id: selectedChoice.id },
        data: {
          vote_count: {
            increment: 1
          }
        }
      });

      return vote;
    });

    res.status(201).json({
      success: true,
      data: result,
      message: "Vote recorded successfully"
    });
  } catch (error: any) {
    console.error("Vote on poll error:", error);

    // Handle unique constraint violation (shouldn't happen with our check, but just in case)
    if (error.code === 'P2002') {
      res.status(400).json({
        success: false,
        message: "You have already voted on this poll"
      });
      return;
    }

    res.status(500).json({
      success: false,
      message: "Failed to record vote",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get poll results with voting statistics
 * @route GET /api/polls/:id/results
 * @access Public
 */
export const getPollResults = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pollId = parseInt(id);

    // Get user ID if authenticated (optional)
    const userId = (req as any).user?.userId;

    // Get poll with all related data
    const poll = await prisma.polls.findUnique({
      where: { id: pollId },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        },
        poll_choices: {
          include: {
            _count: {
              select: {
                poll_votes: true
              }
            }
          },
          orderBy: {
            choice: 'asc' // yes, maybe, no order
          }
        },
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    if (!poll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Calculate total votes
    const totalVotes = poll.poll_choices.reduce((sum, choice) => sum + choice.vote_count, 0);

    // Check if current user has voted (if authenticated)
    let userVote = null;
    if (userId) {
      const vote = await prisma.poll_votes.findFirst({
        where: {
          poll_id: pollId,
          user_id: userId
        },
        include: {
          poll_choices: true
        }
      });
      userVote = vote ? vote.poll_choices.choice : null;
    }

    // Format results with percentages
    const results = poll.poll_choices.map(choice => ({
      choice: choice.choice,
      vote_count: choice.vote_count,
      percentage: totalVotes > 0 ? Math.round((choice.vote_count / totalVotes) * 100 * 10) / 10 : 0
    }));

    res.status(200).json({
      success: true,
      data: {
        poll: {
          id: poll.id,
          title: poll.title,
          description: poll.description,
          is_active: poll.is_active,
          created_at: poll.created_at,
          updated_at: poll.updated_at,
          creator: poll.creator,
          comment_count: poll._count.poll_comments
        },
        results,
        total_votes: totalVotes,
        user_vote: userVote
      },
      message: "Poll results retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get poll results error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve poll results",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Add a comment to a poll
 * @route POST /api/polls/:id/comments
 * @access Private (Authenticated users)
 */
export const addPollComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    // Validate comment
    if (!comment || !comment.trim()) {
      res.status(400).json({
        success: false,
        message: "Comment text is required"
      });
      return;
    }

    if (comment.trim().length > 1000) {
      res.status(400).json({
        success: false,
        message: "Comment must be 1000 characters or less"
      });
      return;
    }

    const pollId = parseInt(id);

    // Check if poll exists
    const poll = await prisma.polls.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Create the comment
    const newComment = await prisma.poll_comments.create({
      data: {
        poll_id: pollId,
        user_id: userId,
        comment: comment.trim()
      },
      include: {
        commenter: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        }
      }
    });

    res.status(201).json({
      success: true,
      data: newComment,
      message: "Comment added successfully"
    });
  } catch (error: any) {
    console.error("Add poll comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to add comment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all comments for a poll
 * @route GET /api/polls/:id/comments
 * @access Public
 */
export const getPollComments = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { page = '1', limit = '20', sort_order = 'desc' } = req.query as Record<string, string>;

    const pollId = parseInt(id);
    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Check if poll exists
    const poll = await prisma.polls.findUnique({
      where: { id: pollId }
    });

    if (!poll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Get total count
    const totalCount = await prisma.poll_comments.count({
      where: { poll_id: pollId }
    });

    // Get comments with pagination
    const comments = await prisma.poll_comments.findMany({
      where: { poll_id: pollId },
      skip,
      take: limitNumber,
      orderBy: {
        created_at: sort_order === 'asc' ? 'asc' : 'desc'
      },
      include: {
        commenter: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: comments,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber)
      },
      message: "Comments retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get poll comments error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve comments",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get all polls with pagination and filters
 * @route GET /api/polls
 * @access Public
 */
export const getAllPolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      is_active,
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    // Get user ID if authenticated (optional)
    const userId = (req as any).user?.userId;

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause
    const where: any = {};
    if (is_active !== undefined) {
      where.is_active = is_active === 'true';
    }
    
    // Only show open polls for public endpoint (based on your schema, status default is "open")
    // If you want to show all public polls, remove this line
    where.status = 'open';

    // Build order by clause
    const orderBy: any = {};
    orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count
    const totalCount = await prisma.polls.count({ where });

    // Get polls
    const polls = await prisma.polls.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        },
        poll_choices: {
          orderBy: {
            choice: 'asc'
          }
        },
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    // If user is authenticated, check which polls they've voted on
    let userVotes: Record<number, string> = {};
    if (userId) {
      const votes = await prisma.poll_votes.findMany({
        where: {
          user_id: userId,
          poll_id: {
            in: polls.map(p => p.id)
          }
        },
        include: {
          poll_choices: true
        }
      });

      userVotes = votes.reduce((acc, vote) => {
        acc[vote.poll_id] = vote.poll_choices.choice;
        return acc;
      }, {} as Record<number, string>);
    }

    // Format response with voting statistics
    const formattedPolls = polls.map(poll => {
      const totalVotes = poll.poll_choices.reduce((sum, choice) => sum + choice.vote_count, 0);
      
      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        is_active: poll.is_active,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        creator: poll.creator,
        choices: poll.poll_choices.map(choice => ({
          choice: choice.choice,
          vote_count: choice.vote_count,
          percentage: totalVotes > 0 ? Math.round((choice.vote_count / totalVotes) * 100 * 10) / 10 : 0
        })),
        total_votes: totalVotes,
        comment_count: poll._count.poll_comments,
        user_vote: userVotes[poll.id] || null
      };
    });

    res.status(200).json({
      success: true,
      data: formattedPolls,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber)
      },
      message: "Polls retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get all polls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve polls",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get a single poll by ID
 * @route GET /api/polls/:id
 * @access Public
 */
export const getPollById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const pollId = parseInt(id);

    // Get user ID if authenticated (optional)
    const userId = (req as any).user?.userId;

    const poll = await prisma.polls.findUnique({
      where: { id: pollId },
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        },
        poll_choices: {
          orderBy: {
            choice: 'asc'
          }
        },
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    if (!poll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Calculate total votes
    const totalVotes = poll.poll_choices.reduce((sum, choice) => sum + choice.vote_count, 0);

    // Check if current user has voted (if authenticated)
    let userVote = null;
    if (userId) {
      const vote = await prisma.poll_votes.findFirst({
        where: {
          poll_id: pollId,
          user_id: userId
        },
        include: {
          poll_choices: true
        }
      });
      userVote = vote ? vote.poll_choices.choice : null;
    }

    // Format response
    const formattedPoll = {
      id: poll.id,
      title: poll.title,
      description: poll.description,
      is_active: poll.is_active,
      created_at: poll.created_at,
      updated_at: poll.updated_at,
      creator: poll.creator,
      choices: poll.poll_choices.map(choice => ({
        choice: choice.choice,
        vote_count: choice.vote_count,
        percentage: totalVotes > 0 ? Math.round((choice.vote_count / totalVotes) * 100 * 10) / 10 : 0
      })),
      total_votes: totalVotes,
      comment_count: poll._count.poll_comments,
      user_vote: userVote
    };

    res.status(200).json({
      success: true,
      data: formattedPoll,
      message: "Poll retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get poll by ID error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve poll",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Update a poll (creator only)
 * @route PUT /api/polls/:id
 * @access Private (Creator only)
 */
export const updatePoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, is_active } = req.body;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    const pollId = parseInt(id);

    // Check if poll exists
    const existingPoll = await prisma.polls.findUnique({
      where: { id: pollId }
    });

    if (!existingPoll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Check if user is the creator
    if (existingPoll.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: "You can only edit polls you created"
      });
      return;
    }

    // Build update data
    const updateData: any = {};
    if (title !== undefined && title.trim()) updateData.title = title.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    // Update the poll
    const updatedPoll = await prisma.polls.update({
      where: { id: pollId },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        },
        poll_choices: true,
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    res.status(200).json({
      success: true,
      data: updatedPoll,
      message: "Poll updated successfully"
    });
  } catch (error: any) {
    console.error("Update poll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update poll",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a poll (creator only)
 * @route DELETE /api/polls/:id
 * @access Private (Creator only)
 */
export const deletePoll = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    const pollId = parseInt(id);

    // Check if poll exists
    const existingPoll = await prisma.polls.findUnique({
      where: { id: pollId }
    });

    if (!existingPoll) {
      res.status(404).json({
        success: false,
        message: "Poll not found"
      });
      return;
    }

    // Check if user is the creator
    if (existingPoll.created_by !== userId) {
      res.status(403).json({
        success: false,
        message: "You can only delete polls you created"
      });
      return;
    }

    // Delete the poll (cascade will delete choices, votes, and comments)
    await prisma.polls.delete({
      where: { id: pollId }
    });

    res.status(200).json({
      success: true,
      message: "Poll deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete poll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete poll",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Delete a comment (commenter only)
 * @route DELETE /api/polls/:id/comments/:commentId
 * @access Private (Commenter only)
 */
export const deletePollComment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id, commentId } = req.params;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "User not authenticated"
      });
      return;
    }

    const pollId = parseInt(id);
    const commentIdNum = parseInt(commentId);

    // Check if comment exists
    const existingComment = await prisma.poll_comments.findUnique({
      where: { id: commentIdNum }
    });

    if (!existingComment) {
      res.status(404).json({
        success: false,
        message: "Comment not found"
      });
      return;
    }

    // Verify comment belongs to this poll
    if (existingComment.poll_id !== pollId) {
      res.status(400).json({
        success: false,
        message: "Comment does not belong to this poll"
      });
      return;
    }

    // Check if user is the commenter
    if (existingComment.user_id !== userId) {
      res.status(403).json({
        success: false,
        message: "You can only delete your own comments"
      });
      return;
    }

    // Delete the comment
    await prisma.poll_comments.delete({
      where: { id: commentIdNum }
    });

    res.status(200).json({
      success: true,
      message: "Comment deleted successfully"
    });
  } catch (error: any) {
    console.error("Delete poll comment error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Get polls created by the authenticated user
 * @route GET /api/polls/my-polls
 * @access Private (Authenticated users)
 */
export const getMyPolls = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      page = '1',
      limit = '10',
      sort_by = 'created_at',
      sort_order = 'desc'
    } = req.query as Record<string, string>;

    // Get user ID from the authenticated request
    const userId = (req as any).user?.userId;

    if (!userId) {
      res.status(401).json({
        success: false,
        message: "Authentication required"
      });
      return;
    }

    const pageNumber = parseInt(page, 10);
    const limitNumber = parseInt(limit, 10);
    const skip = (pageNumber - 1) * limitNumber;

    // Build where clause - get all polls created by user (pending, approved, rejected)
    const where: any = {
      created_by: userId
    };

    // Build order by clause
    const orderBy: any = {};
    orderBy[sort_by] = sort_order === 'asc' ? 'asc' : 'desc';

    // Get total count
    const totalCount = await prisma.polls.count({ where });

    // Get polls
    const polls = await prisma.polls.findMany({
      where,
      skip,
      take: limitNumber,
      orderBy,
      include: {
        creator: {
          select: {
            id: true,
            first_name: true,
            last_name: true,
            display_name: true
          }
        },
        poll_choices: {
          orderBy: {
            choice: 'asc'
          }
        },
        _count: {
          select: {
            poll_comments: true
          }
        }
      }
    });

    // Format response with voting statistics
    const formattedPolls = polls.map(poll => {
      const totalVotes = poll.poll_choices.reduce((sum, choice) => sum + choice.vote_count, 0);
      
      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        is_active: poll.is_active,
        status: poll.status,
        created_at: poll.created_at,
        updated_at: poll.updated_at,
        creator: poll.creator,
        choices: poll.poll_choices.map(choice => ({
          choice: choice.choice,
          vote_count: choice.vote_count,
          percentage: totalVotes > 0 ? Math.round((choice.vote_count / totalVotes) * 100 * 10) / 10 : 0
        })),
        total_votes: totalVotes,
        comment_count: poll._count.poll_comments,
        user_vote: null // User is the creator, so they don't vote
      };
    });

    res.status(200).json({
      success: true,
      data: formattedPolls,
      pagination: {
        total: totalCount,
        page: pageNumber,
        limit: limitNumber,
        totalPages: Math.ceil(totalCount / limitNumber)
      },
      message: "Your polls retrieved successfully"
    });
  } catch (error: any) {
    console.error("Get my polls error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to retrieve your polls",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Approve a poll (moderators/admins only)
 * @route PUT /api/polls/:id/approve
 * @access Private (Moderators/Admins only)
 */
export const approvePoll = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: "Poll approval feature requires database migration. Please run migration to add status columns to polls table."
    });
  } catch (error: any) {
    console.error("Approve poll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to approve poll",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

/**
 * Reject a poll (moderators/admins only)
 * @route PUT /api/polls/:id/reject
 * @access Private (Moderators/Admins only)
 */
export const rejectPoll = async (req: Request, res: Response): Promise<void> => {
  try {
    res.status(501).json({
      success: false,
      message: "Poll rejection feature requires database migration. Please run migration to add status columns to polls table."
    });
  } catch (error: any) {
    console.error("Reject poll error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete comment",
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
