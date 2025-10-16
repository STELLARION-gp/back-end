import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import jwt from "jsonwebtoken";
import { prisma } from "../lib/prisma";

interface AuthenticatedSocket extends SocketIOServer {
  userId?: number;
  userEmail?: string;
  userName?: string;
}

interface SocketUser {
  userId: number;
  email: string;
  role: string;
}

// Get CORS origins from environment variable
const corsOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(",").map((origin) => origin.trim())
  : ["http://localhost:5173"];

export class SocketServer {
  private io: SocketIOServer;

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: corsOrigins,
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    this.setupMiddleware();
    this.setupEventHandlers();
  }

  private setupMiddleware() {
    this.io.use(async (socket: any, next) => {
      try {
        const token = socket.handshake.auth.token;

        if (!token) {
          return next(new Error("Authentication error: No token provided"));
        }

        const decoded = jwt.verify(
          token,
          process.env.JWT_SECRET!
        ) as SocketUser;

        // Get user details from database
        const user = await prisma.users.findUnique({
          where: { id: decoded.userId },
          select: {
            id: true,
            email: true,
            display_name: true,
            first_name: true,
            last_name: true,
            is_active: true,
          },
        });

        if (!user || !user.is_active) {
          return next(
            new Error("Authentication error: User not found or inactive")
          );
        }

        socket.userId = user.id;
        socket.userEmail = user.email;
        socket.userName =
          user.display_name ||
          `${user.first_name || ""} ${user.last_name || ""}`.trim() ||
          user.email.split("@")[0];

        next();
      } catch (err) {
        console.error("Socket authentication error:", err);
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  private setupEventHandlers() {
    this.io.on("connection", (socket: any) => {
      console.log(
        `🔌 User ${socket.userName} (${socket.userId}) connected: ${socket.id}`
      );

      // Auto-join user to their groups
      this.joinUserGroups(socket);

      // Handle joining a specific group
      socket.on("join-group", async (groupId: number) => {
        try {
          const group = await prisma.group_chats.findFirst({
            where: {
              id: groupId,
              is_active: true,
            },
            include: {
              members: true,
            },
          });

          if (!group) {
            socket.emit("error", { message: "Group not found or inactive" });
            return;
          }

          const isMember = group.members.some(
            (member) => member.user_id === socket.userId
          );
          if (!isMember) {
            socket.emit("error", {
              message: "Access denied. You are not a member of this group.",
            });
            return;
          }

          socket.join(`group-${groupId}`);

          // Notify others in the group
          socket.to(`group-${groupId}`).emit("user-joined", {
            userId: socket.userId,
            userName: socket.userName,
            message: `${socket.userName} joined the chat`,
            timestamp: new Date(),
          });

          console.log(`✅ ${socket.userName} joined group ${groupId}`);
        } catch (error) {
          console.error("Error joining group:", error);
          socket.emit("error", { message: "Failed to join group" });
        }
      });

      // Handle leaving a group
      socket.on("leave-group", async (groupId: number) => {
        try {
          socket.leave(`group-${groupId}`);

          // Notify others in the group
          socket.to(`group-${groupId}`).emit("user-left", {
            userId: socket.userId,
            userName: socket.userName,
            message: `${socket.userName} left the chat`,
            timestamp: new Date(),
          });

          console.log(`👋 ${socket.userName} left group ${groupId}`);
        } catch (error) {
          console.error("Error leaving group:", error);
        }
      });

      // Handle sending messages
      socket.on(
        "send-message",
        async (data: {
          groupId: number;
          message: string;
          messageType?: string;
          replyTo?: number;
        }) => {
          try {
            const { groupId, message, messageType = "text", replyTo } = data;

            // Validate input
            if (!groupId || !message?.trim()) {
              socket.emit("message-error", {
                error: "Group ID and message are required",
              });
              return;
            }

            if (message.length > 2000) {
              socket.emit("message-error", {
                error: "Message too long. Maximum 2000 characters.",
              });
              return;
            }

            // Verify user is member of group
            const membership = await prisma.group_members.findFirst({
              where: {
                group_id: groupId,
                user_id: socket.userId,
              },
              include: {
                group: {
                  select: {
                    is_active: true,
                  },
                },
              },
            });

            if (!membership || !membership.group.is_active) {
              socket.emit("message-error", {
                error: "Access denied or group inactive",
              });
              return;
            }

            if (membership.is_muted) {
              socket.emit("message-error", {
                error: "You are muted in this group",
              });
              return;
            }

            // Save message to database
            const newMessage = await prisma.chat_messages.create({
              data: {
                group_id: groupId,
                user_id: socket.userId,
                message_text: message.trim(),
                message_type: messageType,
                reply_to: replyTo || null,
              },
              include: {
                user: {
                  select: {
                    id: true,
                    display_name: true,
                    first_name: true,
                    last_name: true,
                    email: true,
                  },
                },
                reply_msg: {
                  select: {
                    id: true,
                    message_text: true,
                    user: {
                      select: {
                        id: true,
                        display_name: true,
                        first_name: true,
                        last_name: true,
                        email: true,
                      },
                    },
                    created_at: true,
                  },
                },
              },
            });

            // Update group's last activity
            await prisma.group_chats.update({
              where: { id: groupId },
              data: { updated_at: new Date() },
            });

            const messageData = {
              id: newMessage.id,
              group_id: groupId,
              message_text: newMessage.message_text,
              message_type: newMessage.message_type,
              is_edited: newMessage.is_edited,
              created_at: newMessage.created_at,
              updated_at: newMessage.updated_at,
              user: {
                id: newMessage.user!.id,
                name:
                  newMessage.user!.display_name ||
                  `${newMessage.user!.first_name || ""} ${
                    newMessage.user!.last_name || ""
                  }`.trim() ||
                  newMessage.user!.email.split("@")[0],
              },
              reply_to: newMessage.reply_msg
                ? {
                    id: newMessage.reply_msg.id,
                    message_text: newMessage.reply_msg.message_text,
                    created_at: newMessage.reply_msg.created_at,
                    user: newMessage.reply_msg.user
                      ? {
                          id: newMessage.reply_msg.user.id,
                          name:
                            newMessage.reply_msg.user.display_name ||
                            `${newMessage.reply_msg.user.first_name || ""} ${
                              newMessage.reply_msg.user.last_name || ""
                            }`.trim() ||
                            newMessage.reply_msg.user.email.split("@")[0],
                        }
                      : {
                          id: 0,
                          name: "System",
                        },
                  }
                : null,
              reactions: [],
              is_own_message: false, // Will be set to true for sender on client
            };

            // Broadcast to all users in the group
            this.io.to(`group-${groupId}`).emit("new-message", messageData);

            console.log(
              `💬 Message sent in group ${groupId} by ${socket.userName}`
            );
          } catch (error) {
            console.error("Error sending message:", error);
            socket.emit("message-error", { error: "Failed to send message" });
          }
        }
      );

      // Handle typing indicators
      socket.on("typing-start", (data: { groupId: number }) => {
        const { groupId } = data;
        if (groupId) {
          socket.to(`group-${groupId}`).emit("user-typing", {
            userId: socket.userId,
            userName: socket.userName,
            groupId,
          });
        }
      });

      socket.on("typing-stop", (data: { groupId: number }) => {
        const { groupId } = data;
        if (groupId) {
          socket.to(`group-${groupId}`).emit("user-stopped-typing", {
            userId: socket.userId,
            userName: socket.userName,
            groupId,
          });
        }
      });

      // Handle message reactions
      socket.on(
        "add-reaction",
        async (data: { messageId: number; reaction: string }) => {
          try {
            const { messageId, reaction } = data;

            if (!messageId || !reaction?.trim()) {
              socket.emit("reaction-error", {
                error: "Message ID and reaction are required",
              });
              return;
            }

            const message = await prisma.chat_messages.findUnique({
              where: { id: messageId },
              include: {
                group: {
                  include: {
                    members: true,
                  },
                },
              },
            });

            if (!message || message.is_deleted) {
              socket.emit("reaction-error", { error: "Message not found" });
              return;
            }

            // Check if user is member of the group
            const isMember = message.group.members.some(
              (m) => m.user_id === socket.userId
            );
            if (!isMember) {
              socket.emit("reaction-error", { error: "Access denied" });
              return;
            }

            // Add or update reaction
            const existingReaction = await prisma.message_reactions.findFirst({
              where: {
                message_id: messageId,
                user_id: socket.userId,
                reaction: reaction.trim(),
              },
            });

            if (existingReaction) {
              // Remove reaction if it already exists
              await prisma.message_reactions.delete({
                where: { id: existingReaction.id },
              });
            } else {
              // Add new reaction
              await prisma.message_reactions.create({
                data: {
                  message_id: messageId,
                  user_id: socket.userId,
                  reaction: reaction.trim(),
                },
              });
            }

            // Get updated reactions
            const updatedReactions = await prisma.message_reactions.findMany({
              where: { message_id: messageId },
              include: {
                user: {
                  select: {
                    id: true,
                    display_name: true,
                    first_name: true,
                    last_name: true,
                  },
                },
              },
            });

            const formattedReactions = updatedReactions.map((r) => ({
              id: r.id,
              reaction: r.reaction,
              created_at: r.created_at,
              user: {
                id: r.user.id,
                name:
                  r.user.display_name ||
                  `${r.user.first_name || ""} ${
                    r.user.last_name || ""
                  }`.trim() ||
                  "Unknown User",
              },
            }));

            // Broadcast reaction update to all users in the group
            this.io.to(`group-${message.group_id}`).emit("reaction-updated", {
              messageId,
              reactions: formattedReactions,
            });
          } catch (error) {
            console.error("Error handling reaction:", error);
            socket.emit("reaction-error", {
              error: "Failed to process reaction",
            });
          }
        }
      );

      // Handle message editing
      socket.on(
        "edit-message",
        async (data: { messageId: number; newMessage: string }) => {
          try {
            const { messageId, newMessage } = data;

            if (!newMessage?.trim()) {
              socket.emit("edit-error", { error: "Message cannot be empty" });
              return;
            }

            if (newMessage.length > 2000) {
              socket.emit("edit-error", {
                error: "Message too long. Maximum 2000 characters.",
              });
              return;
            }

            const message = await prisma.chat_messages.findUnique({
              where: { id: messageId },
              include: {
                group: {
                  include: {
                    members: true,
                  },
                },
              },
            });

            if (!message || message.is_deleted) {
              socket.emit("edit-error", { error: "Message not found" });
              return;
            }

            // Check if user owns the message
            if (message.user_id !== socket.userId) {
              socket.emit("edit-error", {
                error: "You can only edit your own messages",
              });
              return;
            }

            // Check if message is older than 24 hours (optional restriction)
            const messageAge = Date.now() - message.created_at.getTime();
            const maxEditTime = 24 * 60 * 60 * 1000; // 24 hours
            if (messageAge > maxEditTime) {
              socket.emit("edit-error", {
                error: "Cannot edit messages older than 24 hours",
              });
              return;
            }

            // Update message
            const updatedMessage = await prisma.chat_messages.update({
              where: { id: messageId },
              data: {
                message_text: newMessage.trim(),
                is_edited: true,
                updated_at: new Date(),
              },
            });

            // Broadcast edit to all users in the group
            this.io.to(`group-${message.group_id}`).emit("message-edited", {
              messageId,
              newMessage: updatedMessage.message_text,
              editedAt: updatedMessage.updated_at,
            });
          } catch (error) {
            console.error("Error editing message:", error);
            socket.emit("edit-error", { error: "Failed to edit message" });
          }
        }
      );

      // Handle message deletion
      socket.on("delete-message", async (data: { messageId: number }) => {
        try {
          const { messageId } = data;

          const message = await prisma.chat_messages.findUnique({
            where: { id: messageId },
            include: {
              group: {
                include: {
                  members: true,
                },
              },
            },
          });

          if (!message || message.is_deleted) {
            socket.emit("delete-error", { error: "Message not found" });
            return;
          }

          // Check if user owns the message or is admin/moderator
          const userMember = message.group.members.find(
            (m) => m.user_id === socket.userId
          );

          if (
            message.user_id !== socket.userId &&
            (!userMember || !["admin", "moderator"].includes(userMember.role))
          ) {
            socket.emit("delete-error", { error: "Access denied" });
            return;
          }

          // Soft delete the message
          await prisma.chat_messages.update({
            where: { id: messageId },
            data: { is_deleted: true },
          });

          // Broadcast deletion to all users in the group
          this.io.to(`group-${message.group_id}`).emit("message-deleted", {
            messageId,
          });
        } catch (error) {
          console.error("Error deleting message:", error);
          socket.emit("delete-error", { error: "Failed to delete message" });
        }
      });

      // Handle disconnect
      socket.on("disconnect", () => {
        console.log(
          `🔌 User ${socket.userName} (${socket.userId}) disconnected: ${socket.id}`
        );
      });
    });
  }

  private async joinUserGroups(socket: any) {
    try {
      const userGroups = await prisma.group_chats.findMany({
        where: {
          is_active: true,
          members: {
            some: { user_id: socket.userId },
          },
        },
        select: { id: true },
      });

      userGroups.forEach((group) => {
        socket.join(`group-${group.id}`);
      });

      console.log(
        `🏠 ${socket.userName} auto-joined ${userGroups.length} groups`
      );
    } catch (error) {
      console.error("Error joining user groups:", error);
    }
  }

  public getIO(): SocketIOServer {
    return this.io;
  }
}
