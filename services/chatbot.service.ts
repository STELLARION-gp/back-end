// Chatbot Service - Handles session and message management
import { prisma } from "../lib/prisma";
import { v4 as uuidv4 } from "uuid";
import { Prisma } from "../prisma/generated/client";

// Type for session data from database
type SessionData = {
  id: string;
  user_id: number | null;
  firebase_uid: string;
  title: string | null;
  is_active: boolean | null;
  message_count: number | null;
  created_at: Date | null;
  updated_at: Date | null;
};

// Type for message data from database
type MessageData = {
  id: string;
  session_id: string | null;
  content: string;
  is_bot: boolean;
  firebase_uid: string | null;
  confidence: Prisma.Decimal | null;
  intent: string | null;
  entities: Prisma.JsonValue | null;
  created_at: Date | null;
};

export interface ChatbotSession {
  id: string;
  userId: number | null;
  firebaseUid: string;
  title: string | null;
  isActive: boolean | null;
  messageCount: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface ChatbotMessage {
  id: string;
  sessionId: string | null;
  content: string;
  isBot: boolean;
  firebaseUid: string | null;
  confidence: number | null;
  intent: string | null;
  entities: Record<string, unknown> | null;
  createdAt: Date | null;
}

export interface CreateSessionDTO {
  userId?: number;
  firebaseUid: string;
  title?: string;
}

export interface CreateMessageDTO {
  sessionId: string;
  content: string;
  isBot: boolean;
  firebaseUid: string;
  confidence?: number;
  intent?: string;
  entities?: Record<string, unknown>;
}

// Helper function to convert database session to ChatbotSession
function toSessionDTO(session: SessionData): ChatbotSession {
  return {
    id: session.id,
    userId: session.user_id,
    firebaseUid: session.firebase_uid,
    title: session.title,
    isActive: session.is_active,
    messageCount: session.message_count,
    createdAt: session.created_at,
    updatedAt: session.updated_at,
  };
}

// Helper function to convert database message to ChatbotMessage
function toMessageDTO(message: MessageData): ChatbotMessage {
  return {
    id: message.id,
    sessionId: message.session_id,
    content: message.content,
    isBot: message.is_bot,
    firebaseUid: message.firebase_uid,
    confidence: message.confidence ? Number(message.confidence) : null,
    intent: message.intent,
    entities: message.entities as Record<string, unknown> | null,
    createdAt: message.created_at,
  };
}

export class ChatbotService {
  /**
   * Create a new chatbot session for a user
   */
  static async createSession(data: CreateSessionDTO): Promise<ChatbotSession> {
    try {
      const session = await prisma.chatbot_sessions.create({
        data: {
          id: uuidv4(),
          user_id: data.userId,
          firebase_uid: data.firebaseUid,
          title: data.title || "New Chat",
          is_active: true,
          message_count: 0,
          created_at: new Date(),
          updated_at: new Date(),
        },
      });

      console.log(
        `✅ [CHATBOT] Created session ${session.id} for user ${data.firebaseUid}`
      );
      return toSessionDTO(session);
    } catch (error) {
      console.error("Error creating chatbot session:", error);
      throw new Error("Failed to create chatbot session");
    }
  }

  /**
   * Get or create active session for a user
   */
  static async getOrCreateActiveSession(
    firebaseUid: string,
    userId?: number
  ): Promise<ChatbotSession> {
    try {
      // Try to find an active session
      let session = await prisma.chatbot_sessions.findFirst({
        where: {
          firebase_uid: firebaseUid,
          is_active: true,
        },
        orderBy: {
          updated_at: "desc",
        },
      });

      // If no active session exists, create one
      if (!session) {
        return await this.createSession({
          firebaseUid,
          userId,
          title: "New Chat",
        });
      }

      return toSessionDTO(session);
    } catch (error) {
      console.error("Error getting or creating session:", error);
      throw new Error("Failed to get or create session");
    }
  }

  /**
   * Get all sessions for a user (only their own sessions)
   */
  static async getUserSessions(
    firebaseUid: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ChatbotSession[]> {
    try {
      const sessions = await prisma.chatbot_sessions.findMany({
        where: {
          firebase_uid: firebaseUid,
        },
        orderBy: {
          updated_at: "desc",
        },
        take: limit,
        skip: offset,
      });

      return sessions.map(toSessionDTO);
    } catch (error) {
      console.error("Error fetching user sessions:", error);
      throw new Error("Failed to fetch user sessions");
    }
  }

  /**
   * Get a specific session by ID (only if it belongs to the user)
   */
  static async getSessionById(
    sessionId: string,
    firebaseUid: string
  ): Promise<ChatbotSession | null> {
    try {
      const session = await prisma.chatbot_sessions.findFirst({
        where: {
          id: sessionId,
          firebase_uid: firebaseUid, // Ensure user can only access their own sessions
        },
      });

      return session ? toSessionDTO(session) : null;
    } catch (error) {
      console.error("Error fetching session:", error);
      throw new Error("Failed to fetch session");
    }
  }

  /**
   * Add a message to a session
   */
  static async addMessage(data: CreateMessageDTO): Promise<ChatbotMessage> {
    try {
      // Start a transaction to update message count atomically
      const result = await prisma.$transaction(async (tx) => {
        // Create the message
        const message = await tx.chatbot_messages.create({
          data: {
            id: uuidv4(),
            session_id: data.sessionId,
            content: data.content,
            is_bot: data.isBot,
            firebase_uid: data.firebaseUid,
            confidence: data.confidence,
            intent: data.intent,
            entities: data.entities as Prisma.InputJsonValue | null,
            created_at: new Date(),
          },
        });

        // Update session message count and timestamp
        await tx.chatbot_sessions.update({
          where: { id: data.sessionId },
          data: {
            message_count: {
              increment: 1,
            },
            updated_at: new Date(),
          },
        });

        return message;
      });

      console.log(`✅ [CHATBOT] Added message to session ${data.sessionId}`);
      return toMessageDTO(result);
    } catch (error) {
      console.error("Error adding message to session:", error);
      throw new Error("Failed to add message to session");
    }
  }

  /**
   * Get messages for a session (with pagination)
   * Only returns messages if the session belongs to the requesting user
   */
  static async getSessionMessages(
    sessionId: string,
    firebaseUid: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<ChatbotMessage[]> {
    try {
      // First verify the session belongs to the user
      const session = await prisma.chatbot_sessions.findFirst({
        where: {
          id: sessionId,
          firebase_uid: firebaseUid,
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // Fetch messages for the session
      const messages = await prisma.chatbot_messages.findMany({
        where: {
          session_id: sessionId,
        },
        orderBy: {
          created_at: "asc",
        },
        take: limit,
        skip: offset,
      });

      return messages.map(toMessageDTO);
    } catch (error) {
      console.error("Error fetching session messages:", error);
      throw new Error("Failed to fetch session messages");
    }
  }

  /**
   * Get message count for a session
   */
  static async getSessionMessageCount(sessionId: string): Promise<number> {
    try {
      const session = await prisma.chatbot_sessions.findUnique({
        where: { id: sessionId },
        select: { message_count: true },
      });

      return session?.message_count || 0;
    } catch (error) {
      console.error("Error getting session message count:", error);
      return 0;
    }
  }

  /**
   * Update session title
   */
  static async updateSessionTitle(
    sessionId: string,
    firebaseUid: string,
    title: string
  ): Promise<ChatbotSession> {
    try {
      const session = await prisma.chatbot_sessions.updateMany({
        where: {
          id: sessionId,
          firebase_uid: firebaseUid, // Ensure user can only update their own sessions
        },
        data: {
          title,
          updated_at: new Date(),
        },
      });

      if (session.count === 0) {
        throw new Error("Session not found or access denied");
      }

      const updatedSession = await prisma.chatbot_sessions.findUnique({
        where: { id: sessionId },
      });

      if (!updatedSession) {
        throw new Error("Failed to retrieve updated session");
      }

      return toSessionDTO(updatedSession);
    } catch (error) {
      console.error("Error updating session title:", error);
      throw new Error("Failed to update session title");
    }
  }

  /**
   * Deactivate a session
   */
  static async deactivateSession(
    sessionId: string,
    firebaseUid: string
  ): Promise<void> {
    try {
      await prisma.chatbot_sessions.updateMany({
        where: {
          id: sessionId,
          firebase_uid: firebaseUid,
        },
        data: {
          is_active: false,
          updated_at: new Date(),
        },
      });

      console.log(`✅ [CHATBOT] Deactivated session ${sessionId}`);
    } catch (error) {
      console.error("Error deactivating session:", error);
      throw new Error("Failed to deactivate session");
    }
  }

  /**
   * Delete a session and all its messages
   */
  static async deleteSession(
    sessionId: string,
    firebaseUid: string
  ): Promise<void> {
    try {
      // Verify ownership before deletion
      const session = await prisma.chatbot_sessions.findFirst({
        where: {
          id: sessionId,
          firebase_uid: firebaseUid,
        },
      });

      if (!session) {
        throw new Error("Session not found or access denied");
      }

      // Delete session (messages will cascade delete)
      await prisma.chatbot_sessions.delete({
        where: { id: sessionId },
      });

      console.log(`✅ [CHATBOT] Deleted session ${sessionId}`);
    } catch (error) {
      console.error("Error deleting session:", error);
      throw new Error("Failed to delete session");
    }
  }

  /**
   * Get total message count for user across all sessions
   */
  static async getUserTotalMessageCount(firebaseUid: string): Promise<number> {
    try {
      const result = await prisma.chatbot_messages.count({
        where: {
          firebase_uid: firebaseUid,
          is_bot: false, // Only count user messages, not bot responses
        },
      });

      return result;
    } catch (error) {
      console.error("Error getting user total message count:", error);
      return 0;
    }
  }

  /**
   * Clean up old inactive sessions (for maintenance)
   */
  static async cleanupOldSessions(daysOld: number = 30): Promise<number> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await prisma.chatbot_sessions.deleteMany({
        where: {
          is_active: false,
          updated_at: {
            lt: cutoffDate,
          },
        },
      });

      console.log(
        `✅ [CHATBOT] Cleaned up ${result.count} old inactive sessions`
      );
      return result.count;
    } catch (error) {
      console.error("Error cleaning up old sessions:", error);
      return 0;
    }
  }
}
