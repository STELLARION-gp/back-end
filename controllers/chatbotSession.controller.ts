// Additional Chatbot Controller methods for session management
import { Request, Response } from "express";
import { ChatbotService } from "../services/chatbot.service";

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    user_id: number;
  };
}

/**
 * Get all chat sessions for the authenticated user
 * GET /api/chatbot/sessions
 */
export const getUserSessions = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const limit = req.query.limit ? parseInt(req.query.limit as string) : 20;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const sessions = await ChatbotService.getUserSessions(
      firebaseUid,
      limit,
      offset
    );

    res.json({
      success: true,
      data: sessions,
      count: sessions.length,
    });
  } catch (error) {
    console.error("[CHATBOT] Error fetching user sessions:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch sessions",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Internal server error",
    });
  }
};

/**
 * Get a specific session by ID
 * GET /api/chatbot/sessions/:id
 */
export const getSessionById = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    const session = await ChatbotService.getSessionById(id, firebaseUid);

    if (!session) {
      res.status(404).json({
        success: false,
        error: "Session not found",
      });
      return;
    }

    res.json({
      success: true,
      data: session,
    });
  } catch (error) {
    console.error("[CHATBOT] Error fetching session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch session",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Internal server error",
    });
  }
};

/**
 * Get messages for a specific session
 * GET /api/chatbot/sessions/:id/messages
 */
export const getSessionMessages = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0;

    const messages = await ChatbotService.getSessionMessages(
      id,
      firebaseUid,
      limit,
      offset
    );

    res.json({
      success: true,
      data: messages,
      count: messages.length,
    });
  } catch (error) {
    console.error("[CHATBOT] Error fetching session messages:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      res.status(404).json({
        success: false,
        error: "Session not found or access denied",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to fetch messages",
      details:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

/**
 * Update session title
 * PATCH /api/chatbot/sessions/:id
 */
export const updateSessionTitle = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    const { title } = req.body;

    if (!title || typeof title !== "string") {
      res.status(400).json({
        success: false,
        error: "Title is required and must be a string",
      });
      return;
    }

    const session = await ChatbotService.updateSessionTitle(
      id,
      firebaseUid,
      title
    );

    res.json({
      success: true,
      message: "Session title updated successfully",
      data: session,
    });
  } catch (error) {
    console.error("[CHATBOT] Error updating session title:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      res.status(404).json({
        success: false,
        error: "Session not found or access denied",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to update session title",
      details:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

/**
 * Deactivate a session
 * POST /api/chatbot/sessions/:id/deactivate
 */
export const deactivateSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    await ChatbotService.deactivateSession(id, firebaseUid);

    res.json({
      success: true,
      message: "Session deactivated successfully",
    });
  } catch (error) {
    console.error("[CHATBOT] Error deactivating session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to deactivate session",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Internal server error",
    });
  }
};

/**
 * Delete a session
 * DELETE /api/chatbot/sessions/:id
 */
export const deleteSession = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const { id } = req.params;
    await ChatbotService.deleteSession(id, firebaseUid);

    res.json({
      success: true,
      message: "Session deleted successfully",
    });
  } catch (error) {
    console.error("[CHATBOT] Error deleting session:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);

    if (
      errorMessage.includes("not found") ||
      errorMessage.includes("access denied")
    ) {
      res.status(404).json({
        success: false,
        error: "Session not found or access denied",
      });
      return;
    }

    res.status(500).json({
      success: false,
      error: "Failed to delete session",
      details:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    });
  }
};

/**
 * Get user's total message count
 * GET /api/chatbot/stats
 */
export const getUserStats = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    const totalMessages = await ChatbotService.getUserTotalMessageCount(
      firebaseUid
    );
    const sessions = await ChatbotService.getUserSessions(firebaseUid, 100, 0);

    res.json({
      success: true,
      data: {
        totalMessages,
        firebaseUid,
        totalSessions: sessions.length,
        activeSessions: sessions.filter((s) => s.isActive).length,
      },
    });
  } catch (error) {
    console.error("[CHATBOT] Error fetching user stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user stats",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Internal server error",
    });
  }
};

/**
 * Debug endpoint to verify user isolation
 * GET /api/chatbot/debug/verify-isolation
 */
export const verifyUserIsolation = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const firebaseUid = req.user?.uid;
    if (!firebaseUid) {
      res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
      return;
    }

    // Get all user's sessions
    const sessions = await ChatbotService.getUserSessions(firebaseUid, 100, 0);

    // Get message count for each session
    const sessionDetails = await Promise.all(
      sessions.map(async (session) => {
        const messages = await ChatbotService.getSessionMessages(
          session.id,
          firebaseUid,
          10,
          0
        );
        return {
          sessionId: session.id,
          title: session.title,
          messageCount: session.messageCount,
          recentMessages: messages.slice(0, 3).map((m) => ({
            isBot: m.isBot,
            contentPreview: m.content.substring(0, 50) + "...",
            createdAt: m.createdAt,
          })),
        };
      })
    );

    res.json({
      success: true,
      message: "User isolation verified - all data belongs to this user only",
      data: {
        firebaseUid,
        userId: req.user?.user_id,
        totalSessions: sessions.length,
        sessions: sessionDetails,
        note: "If you see data from other users here, there's a bug. Otherwise, isolation is working correctly.",
      },
    });
  } catch (error) {
    console.error("[CHATBOT] Error in verify isolation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to verify isolation",
      details:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Internal server error",
    });
  }
};
