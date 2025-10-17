// controllers/chatbot.controller.ts
import { Request, Response } from "express";
import { prisma } from "../lib/prisma";
import { ChatbotNotificationService } from "../services/chatbotNotification.service";
import { ChatbotService } from "../services/chatbot.service";

// Initialize Gemini API key
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (GEMINI_API_KEY) {
  console.log(
    "✅ [CHATBOT] Gemini API initialized - using gemini-2.5-flash via direct v1 API calls"
  );
} else {
  console.warn(
    "⚠️ [CHATBOT] GEMINI_API_KEY not found in environment variables"
  );
}

// Function to call Gemini REST API directly (bypasses SDK v1beta limitation)
async function callGeminiDirectly(
  message: string,
  systemPrompt: string
): Promise<string> {
  // Use gemini-2.5-flash (latest stable model available with this API key)
  // Other options: gemini-2.5-pro, gemini-2.0-flash, gemini-2.5-flash-lite
  const model = "gemini-2.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;

  const requestBody = {
    contents: [
      {
        role: "user",
        parts: [{ text: systemPrompt }, { text: `User Question: ${message}` }],
      },
    ],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024, // Increased from 700 to avoid truncation
      topK: 40,
      topP: 0.95,
    },
  };

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Gemini API error (${response.status}): ${errorText}`);
  }

  const data = await response.json();

  // Log the full response for debugging
  console.log(
    "[CHATBOT] Gemini API full response:",
    JSON.stringify(data, null, 2)
  );

  // Check for different possible response structures
  if (data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
    return data.candidates[0].content.parts[0].text;
  }

  // Handle MAX_TOKENS case - response was cut off, but might still have partial content
  if (data.candidates && data.candidates[0]?.finishReason === "MAX_TOKENS") {
    console.warn(
      "[CHATBOT] Response hit MAX_TOKENS limit, checking for partial content"
    );

    // Sometimes the content is in a different structure when MAX_TOKENS
    if (data.candidates[0].content?.parts?.[0]?.text) {
      return data.candidates[0].content.parts[0].text;
    }

    // If still no text, return a helpful message
    throw new Error("Response too long. Please ask a more specific question.");
  }

  // Check if there's an error in the response
  if (data.error) {
    throw new Error(
      `Gemini API error: ${data.error.message || JSON.stringify(data.error)}`
    );
  }

  // Check for safety blocking
  if (data.candidates && data.candidates[0]?.finishReason === "SAFETY") {
    throw new Error(
      "Response blocked due to safety concerns. Please rephrase your question."
    );
  }

  // Log what we got and throw detailed error
  console.error(
    "[CHATBOT] Unexpected Gemini response structure:",
    JSON.stringify(data, null, 2)
  );
  throw new Error(
    `Unable to generate response. Please try again with a different question.`
  );
}

// System prompt for STELLARION space exploration assistant
const SYSTEM_PROMPT = `You are STELLA, an expert space exploration assistant and educational companion. You specialize in:

- Space exploration missions and history
- Astronomy and astrophysics concepts
- Spacecraft technology and engineering
- Planetary science and exoplanets
- Space agencies (NASA, ESA, SpaceX, etc.)
- Current space news and developments
- Space career guidance and education

Guidelines:
- Provide accurate, scientifically sound information
- Make complex topics accessible and engaging
- Include relevant examples and analogies
- Encourage curiosity about space exploration
- Keep responses conversational but informative
- If uncertain about facts, acknowledge limitations
- Stay focused on space and astronomy topics
- Keep responses concise but comprehensive (aim for 200-500 words)`;

// Interface for chat request
interface ChatRequest {
  message: string;
  context: string;
  conversationId?: string;
  userId?: string;
  chatbotUsage?: {
    questionsUsed: number;
    questionsLimit: number;
    plan: string;
  };
}

// Interface for authenticated request
interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    email: string;
    user_id: number;
  };
}

// Interface for chat response
interface ChatResponse {
  success: boolean;
  response?: string;
  conversationId?: string;
  timestamp?: string;
  error?: string;
  details?: string;
}

// Chat completion endpoint
export const chatCompletion = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const { message, context, conversationId, userId }: ChatRequest = req.body;

    // Validate required fields
    if (!message || !context) {
      res.status(400).json({
        success: false,
        error: "Message and context are required",
        details: "Both 'message' and 'context' fields must be provided",
      } as ChatResponse);
      return;
    }

    // Validate context
    if (context !== "space_exploration_assistant") {
      res.status(400).json({
        success: false,
        error: "Invalid context",
        details: "Context must be 'space_exploration_assistant'",
      } as ChatResponse);
      return;
    }

    // Validate message length
    if (message.length > 1000) {
      res.status(400).json({
        success: false,
        error: "Message too long",
        details: "Message must be 1000 characters or less",
      } as ChatResponse);
      return;
    }

    // Get or create session for the user
    const firebaseUid = req.user?.uid || userId || "anonymous";
    const userIdNumber = req.user?.user_id;

    // Security: Ensure we have a valid firebase UID
    if (!firebaseUid || firebaseUid === "anonymous") {
      res.status(401).json({
        success: false,
        error: "Authentication required",
        details: "Valid Firebase UID is required for chatbot access",
      } as ChatResponse);
      return;
    }

    // Log for debugging user isolation
    console.log(
      `[CHATBOT] User ${firebaseUid} (ID: ${userIdNumber}) accessing chatbot`
    );

    let session;
    if (conversationId) {
      // Use existing session if conversationId is provided
      session = await ChatbotService.getSessionById(
        conversationId,
        firebaseUid
      );
      if (!session) {
        res.status(404).json({
          success: false,
          error: "Session not found",
          details:
            "The specified conversation session does not exist or does not belong to you",
        } as ChatResponse);
        return;
      }
      console.log(
        `[CHATBOT] Using existing session ${conversationId} for user ${firebaseUid}`
      );
    } else {
      // Get or create active session
      session = await ChatbotService.getOrCreateActiveSession(
        firebaseUid,
        userIdNumber
      );
      console.log(
        `[CHATBOT] ${
          session.createdAt === session.updatedAt
            ? "Created new"
            : "Using existing"
        } session ${session.id} for user ${firebaseUid}`
      );
    }

    // Store user message in the session
    await ChatbotService.addMessage({
      sessionId: session.id,
      content: message,
      isBot: false,
      firebaseUid: firebaseUid,
      intent: "user_query",
    });

    let aiResponse: string;

    // Try to use Gemini API directly (bypassing SDK v1beta limitation)
    if (GEMINI_API_KEY) {
      try {
        console.log("[CHATBOT] Calling Gemini API v1 directly...");
        aiResponse = await callGeminiDirectly(message, SYSTEM_PROMPT);
        console.log("[CHATBOT] Gemini API success!");
      } catch (geminiError: unknown) {
        console.warn(
          "[CHATBOT] Gemini API failed, using fallback:",
          geminiError instanceof Error
            ? geminiError.message
            : String(geminiError)
        );

        // If rate limit or quota exceeded, use fallback
        const errorMessage =
          geminiError instanceof Error ? geminiError.message : "";
        if (
          errorMessage?.includes("quota") ||
          errorMessage?.includes("RATE_LIMIT")
        ) {
          aiResponse = getFallbackResponse(message);
        } else {
          throw geminiError; // Re-throw other errors
        }
      }
    } else {
      // No API key configured, use fallback
      aiResponse = getFallbackResponse(message);
    }

    if (!aiResponse) {
      res.status(500).json({
        success: false,
        error: "Failed to generate response",
        details: "Could not generate a response",
      } as ChatResponse);
      return;
    }

    // Store bot response in the session
    await ChatbotService.addMessage({
      sessionId: session.id,
      content: aiResponse,
      isBot: true,
      firebaseUid: firebaseUid,
      intent: "bot_response",
    });

    // Increment chatbot usage for users with limited plans
    if (req.user?.user_id) {
      try {
        console.log(
          `[CHATBOT] Incrementing usage for user ${firebaseUid} (ID: ${req.user.user_id})`
        );

        const updatedUser = await prisma.users.update({
          where: { id: req.user.user_id },
          data: {
            chatbot_questions_used: {
              increment: 1,
            },
          },
          select: {
            firebase_uid: true,
            chatbot_questions_used: true,
            subscription_plan: true,
          },
        });

        console.log(
          `[CHATBOT] User ${firebaseUid} usage updated: ${updatedUser.chatbot_questions_used} (plan: ${updatedUser.subscription_plan})`
        );

        // Send notifications based on usage
        const usageAfter = updatedUser.chatbot_questions_used || 0;
        const firebaseUidForNotif = updatedUser.firebase_uid;

        // Only send notifications to starseeker users (with 3 prompt limit)
        if (updatedUser.subscription_plan === "starseeker") {
          // If they just used their 2nd prompt (1 remaining), warn them
          if (usageAfter === 2) {
            console.log(
              `[CHATBOT] Sending last prompt warning to user ${firebaseUid}`
            );
            ChatbotNotificationService.sendLastPromptWarning(
              firebaseUidForNotif
            );
          }
          // If they just used their 3rd prompt (limit reached), notify them
          else if (usageAfter === 3) {
            console.log(
              `[CHATBOT] Sending limit reached notification to user ${firebaseUid}`
            );
            ChatbotNotificationService.sendLimitReachedNotification(
              firebaseUidForNotif
            );
          }
        }
      } catch (dbError) {
        console.error(
          `[CHATBOT] Failed to increment chatbot usage for user ${firebaseUid}:`,
          dbError
        );
        // Don't fail the request for this
      }
    }

    // Get session message count
    const messageCount = await ChatbotService.getSessionMessageCount(
      session.id
    );

    // Log the interaction (optional - for monitoring/analytics)
    console.log(
      `[CHATBOT] ${new Date().toISOString()} - User: ${
        req.user?.user_id || userId || "anonymous"
      } - Session: ${session.id} - Messages: ${messageCount}`
    );

    // Return successful response
    res.json({
      success: true,
      response: aiResponse,
      conversationId: session.id,
      timestamp: new Date().toISOString(),
    } as ChatResponse);
  } catch (error: unknown) {
    console.error("[CHATBOT ERROR]", error);

    const errorMessage = error instanceof Error ? error.message : String(error);

    // Handle specific Gemini errors
    if (errorMessage.includes("authentication")) {
      res.status(500).json({
        success: false,
        error: "AI service authentication failed",
        details: "Invalid or expired API key",
      } as ChatResponse);
      return;
    }

    if (errorMessage.includes("quota") || errorMessage.includes("RATE_LIMIT")) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        details: "Too many requests to AI service. Please try again later.",
      } as ChatResponse);
      return;
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: "Failed to process message",
      details:
        process.env.NODE_ENV === "development"
          ? errorMessage
          : "Internal server error",
    } as ChatResponse);
  }
};

// Health check endpoint
export const healthCheck = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    // Check if Gemini API key is configured
    const isConfigured = !!process.env.GEMINI_API_KEY;

    res.json({
      status: "healthy",
      aiProvider: "gemini",
      timestamp: new Date().toISOString(),
      configured: isConfigured,
    });
  } catch (error: unknown) {
    console.error("[CHATBOT HEALTH CHECK ERROR]", error);

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      aiProvider: "gemini",
      configured: !!process.env.GEMINI_API_KEY,
      error:
        process.env.NODE_ENV === "development"
          ? error instanceof Error
            ? error.message
            : String(error)
          : "Service unavailable",
    });
  }
};

// Fallback response function (for when AI service is unavailable)
export const getFallbackResponse = (message: string): string => {
  const lowerMessage = message.toLowerCase();

  // Space-related responses
  if (lowerMessage.includes("mars") || lowerMessage.includes("red planet")) {
    return '🔴 Mars is the fourth planet from the Sun, often called the "Red Planet" due to its reddish appearance caused by iron oxide on its surface. It has the largest volcano in the solar system, Olympus Mons, standing about 21 km high! Mars also has two small moons, Phobos and Deimos. Evidence suggests it once had liquid water and a thicker atmosphere, making it a prime candidate for finding signs of past life.';
  }

  if (lowerMessage.includes("moon") || lowerMessage.includes("lunar")) {
    return "🌙 The Moon is Earth's only natural satellite and plays a crucial role in stabilizing our planet's axial tilt and creating ocean tides. It's about 384,400 km away and is slowly moving away from Earth at roughly 3.8 cm per year. The Moon always shows the same face to Earth due to tidal locking. Fun fact: The Moon has no atmosphere, which is why there's no wind or weather to erase the footprints left by Apollo astronauts!";
  }

  if (lowerMessage.includes("sun") || lowerMessage.includes("solar")) {
    return "☀️ The Sun is a massive ball of hot plasma at the center of our solar system, providing the energy that sustains life on Earth. It's about 4.6 billion years old and contains 99.86% of the solar system's mass. The Sun fuses about 600 million tons of hydrogen into helium every second, producing tremendous amounts of energy. It will continue shining for another 5 billion years before becoming a red giant.";
  }

  if (lowerMessage.includes("satellite") || lowerMessage.includes("orbit")) {
    return "🛰️ Satellites are objects that orbit around larger celestial bodies. Earth has thousands of artificial satellites serving various purposes: communication, GPS navigation, weather monitoring, Earth observation, and scientific research. They orbit at different altitudes - from Low Earth Orbit (LEO) at 160-2,000 km to Geostationary Orbit (GEO) at ~35,786 km. STELLARION helps enthusiasts track and learn about these fascinating space assets!";
  }

  if (lowerMessage.includes("black hole")) {
    return "🌌 Black holes are regions in space where gravity is so strong that nothing, not even light, can escape once it crosses the event horizon. They form when massive stars collapse at the end of their life cycle. The first image of a black hole was captured in 2019, showing the supermassive black hole at the center of galaxy M87. Black holes play a crucial role in galaxy formation and evolution!";
  }

  if (lowerMessage.includes("iss") || lowerMessage.includes("space station")) {
    return "🛰️ The International Space Station (ISS) is a habitable artificial satellite orbiting Earth at about 408 km altitude. It travels at approximately 28,000 km/h, completing an orbit every 90 minutes. The ISS serves as a microgravity research laboratory where astronauts conduct experiments in biology, physics, astronomy, and materials science. It's been continuously inhabited since November 2000!";
  }

  if (
    lowerMessage.includes("stellarion") ||
    lowerMessage.includes("platform")
  ) {
    return "🚀 STELLARION is your comprehensive space exploration platform! We provide satellite tracking, space mission management, educational resources, and a community for space enthusiasts. Whether you're interested in astronomy, want to track satellites, or learn about upcoming space missions, STELLARION brings the universe closer to you. How can I help you explore the cosmos today?";
  }

  if (
    lowerMessage.includes("hello") ||
    lowerMessage.includes("hi") ||
    lowerMessage.includes("hey")
  ) {
    return "👋 Hello there, space explorer! I'm STELLA, your space exploration assistant. I'm here to help you learn about planets, satellites, space missions, and the wonders of our universe. What cosmic topic would you like to explore?";
  }

  if (lowerMessage.includes("help") || lowerMessage.includes("what can you")) {
    return "🤖 I can help you with:\n\n• Planets, moons, and celestial bodies\n• Space missions and exploration history\n• Satellites and spacecraft technology\n• Astronomy concepts and phenomena\n• Space agencies and their missions\n• STELLARION platform features\n• General space science questions\n\nNote: I'm currently using my knowledge base. For more detailed AI-powered responses, please check back later when our AI service is available. What interests you most about space?";
  }

  // Default responses
  const defaultResponses = [
    "🌌 That's an interesting question! While I'm currently operating in knowledge-base mode, I can share that space exploration continues to reveal amazing discoveries. Could you ask me something specific about planets, satellites, or space missions? I have lots of information to share!",
    "✨ Great question! I specialize in space-related topics. Feel free to ask me about the solar system, satellites, space agencies, or astronomy. What aspect of space exploration interests you most?",
    "🔭 I'm your space exploration assistant! I can help with astronomy, satellite information, space missions, and cosmic phenomena. What would you like to learn about the universe today?",
  ];

  return defaultResponses[Math.floor(Math.random() * defaultResponses.length)];
};
