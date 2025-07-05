// controllers/chatbot.controller.ts
import { Request, Response } from "express";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";

// Initialize OpenAI client (only if API key is available)
let openai: OpenAI | null = null;

try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    });
  }
} catch (error) {
  console.warn('[CHATBOT] OpenAI client initialization failed:', error);
}

// System prompt for STELLARION space exploration assistant
const SYSTEM_PROMPT = `You are STELLARION, an expert space exploration assistant and educational companion. You specialize in:

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
export const chatCompletion = async (req: Request, res: Response): Promise<void> => {
  try {
    const { message, context, conversationId, userId }: ChatRequest = req.body;

    // Validate required fields
    if (!message || !context) {
      res.status(400).json({
        success: false,
        error: "Message and context are required",
        details: "Both 'message' and 'context' fields must be provided"
      } as ChatResponse);
      return;
    }

    // Validate context
    if (context !== "space_exploration_assistant") {
      res.status(400).json({
        success: false,
        error: "Invalid context",
        details: "Context must be 'space_exploration_assistant'"
      } as ChatResponse);
      return;
    }

    // Validate message length
    if (message.length > 1000) {
      res.status(400).json({
        success: false,
        error: "Message too long",
        details: "Message must be 1000 characters or less"
      } as ChatResponse);
      return;
    }

    // Check if OpenAI API key is configured
    if (!openai) {
      res.status(500).json({
        success: false,
        error: "AI service not configured",
        details: "OpenAI API key is not configured"
      } as ChatResponse);
      return;
    }

    // Generate response using OpenAI
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini", // Using gpt-4o-mini for cost efficiency
      messages: [
        {
          role: "system",
          content: SYSTEM_PROMPT
        },
        {
          role: "user",
          content: message
        }
      ],
      max_tokens: 700,
      temperature: 0.7,
      presence_penalty: 0.1,
      frequency_penalty: 0.1
    });

    const aiResponse = completion.choices[0]?.message?.content;

    if (!aiResponse) {
      res.status(500).json({
        success: false,
        error: "Failed to generate response",
        details: "AI service returned empty response"
      } as ChatResponse);
      return;
    }

    // Generate conversation ID if not provided
    const responseConversationId = conversationId || uuidv4();

    // Log the interaction (optional - for monitoring/analytics)
    console.log(`[CHATBOT] ${new Date().toISOString()} - User: ${userId || 'anonymous'} - Conversation: ${responseConversationId}`);

    // Return successful response
    res.json({
      success: true,
      response: aiResponse,
      conversationId: responseConversationId,
      timestamp: new Date().toISOString()
    } as ChatResponse);

  } catch (error: any) {
    console.error('[CHATBOT ERROR]', error);

    // Handle specific OpenAI errors
    if (error.status === 401) {
      res.status(500).json({
        success: false,
        error: "AI service authentication failed",
        details: "Invalid or expired API key"
      } as ChatResponse);
      return;
    }

    if (error.status === 429) {
      res.status(429).json({
        success: false,
        error: "Rate limit exceeded",
        details: "Too many requests to AI service. Please try again later."
      } as ChatResponse);
      return;
    }

    if (error.status === 400) {
      res.status(400).json({
        success: false,
        error: "Invalid request to AI service",
        details: error.message || "Request was malformed"
      } as ChatResponse);
      return;
    }

    // Generic error response
    res.status(500).json({
      success: false,
      error: "Failed to process message",
      details: process.env.NODE_ENV === 'development' ? error.message : "Internal server error"
    } as ChatResponse);
  }
};

// Health check endpoint
export const healthCheck = async (req: Request, res: Response): Promise<void> => {
  try {
    // Check if OpenAI API key is configured
    const isConfigured = !!process.env.OPENAI_API_KEY;

    // Test OpenAI connection (optional - uncomment if you want to test actual connectivity)
    /*
    if (isConfigured) {
      await openai.models.list();
    }
    */

    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      aiProvider: "openai",
      version: "1.0.0",
      configured: isConfigured
    });

  } catch (error: any) {
    console.error('[CHATBOT HEALTH CHECK ERROR]', error);

    res.status(503).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      aiProvider: "openai",
      version: "1.0.0",
      configured: !!process.env.OPENAI_API_KEY,
      error: process.env.NODE_ENV === 'development' ? error.message : "Service unavailable"
    });
  }
};

// Fallback response function (for when AI service is unavailable)
export const getFallbackResponse = (message: string): string => {
  const fallbackResponses = [
    "I'm STELLA, your space exploration assistant! I'm currently experiencing some technical difficulties, but I'm here to help with space-related questions.",
    "Hello! I'm STELLA, and I love discussing space exploration! While I'm having some connectivity issues right now, I'd be happy to chat about the cosmos.",
    "Greetings, fellow space enthusiast! I'm STELLA, and even though I'm having some technical challenges at the moment, I'm excited to explore the universe with you.",
    "Hi there! I'm STELLA, your friendly space exploration companion. I'm currently offline but will be back soon to discuss the wonders of space!",
    "Welcome! I'm STELLA, and I specialize in space exploration topics. I'm experiencing some technical issues right now, but I'll be back to help you explore the cosmos soon!"
  ];

  // Simple keyword-based responses
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes('mars')) {
    return "Mars is fascinating! It's often called the 'Red Planet' due to iron oxide on its surface. I'd love to tell you more about Mars missions and exploration, but I'm currently experiencing technical difficulties. Please try again in a moment!";
  }

  if (lowerMessage.includes('moon')) {
    return "The Moon is Earth's only natural satellite and has been a target of human exploration since the Apollo missions! I'm having some technical issues right now, but I'd be happy to discuss lunar exploration with you soon.";
  }

  if (lowerMessage.includes('spacex') || lowerMessage.includes('nasa')) {
    return "Space agencies like NASA and companies like SpaceX are doing incredible work in space exploration! I'm currently offline but would love to discuss their missions and achievements with you once I'm back online.";
  }

  // Return random fallback response
  return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
};
