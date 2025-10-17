import { ResourceWithOptions } from "adminjs";
import { getModelByName } from "@adminjs/prisma";
import { usersResourceOptions } from "./resources/users.resource";
import { blogsResourceOptions } from "./resources/blogs.resource";
import { quizzesResourceOptions } from "./resources/quizzes.resource";
import { astronomyEventsResourceOptions } from "./resources/astronomyEvents.resource";
import { PrismaClient } from "../prisma/generated/client";
import * as PrismaModule from "../prisma/generated/client/index.js";

// Initialize Prisma Client for resources
const prisma = new PrismaClient();

/**
 * Define all resources that will be managed through AdminJS
 * Using getModelByName with custom Prisma client path and clientModule
 *
 * Navigation Categories:
 * - 👥 User Management
 * - 📝 Content Management
 * - 🎓 Education & Quizzes
 * - 🌌 Space & Events
 * - 🤖 AI & Chatbot
 * - 📋 Applications & Requests
 * - 💳 Payments & Subscriptions
 * - 🏕️ Night Camps
 * - 🌟 Stargazing & Tours
 * - 💬 Community & Discussions
 * - 🗳️ Polls & Voting
 * - 📊 Analytics & Engagement
 */
export const adminResources: ResourceWithOptions[] = [
  // ==================== 👥 USER MANAGEMENT ====================
  {
    resource: {
      model: getModelByName("users", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: usersResourceOptions,
  },
  {
    resource: {
      model: getModelByName("user_settings", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "👥 User Management",
        icon: "User",
      },
      properties: {
        user_id: {
          isVisible: { list: true, show: true, edit: false, filter: true },
        },
      },
    },
  },
  {
    resource: {
      model: getModelByName("role_upgrade_requests", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "👥 User Management",
        icon: "Award",
      },
    },
  },

  // ==================== 📝 CONTENT MANAGEMENT ====================
  {
    resource: {
      model: getModelByName("blogs", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: blogsResourceOptions,
  },
  {
    resource: {
      model: getModelByName("blog_comments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "MessageSquare",
      },
    },
  },
  {
    resource: {
      model: getModelByName("blog_likes", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "Heart",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("blog_ratings", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "Star",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("blog_views", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "Eye",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("blog_categories", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "Tag",
      },
    },
  },
  {
    resource: {
      model: getModelByName("media_uploads", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📝 Content Management",
        icon: "Image",
      },
    },
  },

  // ==================== 🎓 EDUCATION & QUIZZES ====================
  {
    resource: {
      model: getModelByName("Quizzes", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: quizzesResourceOptions,
  },
  {
    resource: {
      model: getModelByName("QuizQuestion", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🎓 Education & Quizzes",
        icon: "HelpCircle",
      },
    },
  },
  {
    resource: {
      model: getModelByName("QuizParticipants", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🎓 Education & Quizzes",
        icon: "Users",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("sessions", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🎓 Education & Quizzes",
        icon: "Book",
      },
    },
  },
  {
    resource: {
      model: getModelByName("session_enrollments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🎓 Education & Quizzes",
        icon: "BookOpen",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 🌌 SPACE & EVENTS ====================
  {
    resource: {
      model: getModelByName("astronomy_events", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: astronomyEventsResourceOptions,
  },
  {
    resource: {
      model: getModelByName("space_news", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌌 Space & Events",
        icon: "Globe",
      },
    },
  },
  {
    resource: {
      model: getModelByName("space_news_comments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌌 Space & Events",
        icon: "MessageCircle",
      },
    },
  },
  {
    resource: {
      model: getModelByName("space_news_likes", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌌 Space & Events",
        icon: "ThumbsUp",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("events", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌌 Space & Events",
        icon: "Calendar",
      },
    },
  },
  {
    resource: {
      model: getModelByName("event_reminders", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌌 Space & Events",
        icon: "Bell",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 🤖 AI & CHATBOT ====================
  // Read-only - system-generated analytics data
  {
    resource: {
      model: getModelByName("chatbot_usage", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🤖 AI & Chatbot",
        icon: "Activity",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("chatbot_feedback", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🤖 AI & Chatbot",
        icon: "ThumbsUp",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 📋 APPLICATIONS & REQUESTS ====================
  // Read-only - user-submitted applications for review
  {
    resource: {
      model: getModelByName("mentor_application", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📋 Applications & Requests",
        icon: "FileText",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("influencer_application", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📋 Applications & Requests",
        icon: "FileText",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("guide_application", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "📋 Applications & Requests",
        icon: "FileText",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 💳 PAYMENTS & SUBSCRIPTIONS ====================
  // Read-only resources - admins can only view payment records
  {
    resource: {
      model: getModelByName("subscriptions", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "💳 Payments & Subscriptions",
        icon: "CreditCard",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("subscription_plans", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "💳 Payments & Subscriptions",
        icon: "Package",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("payments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "💳 Payments & Subscriptions",
        icon: "DollarSign",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 🏕️ NIGHT CAMPS ====================
  {
    resource: {
      model: getModelByName("night_camps", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "Compass",
      },
    },
  },
  {
    resource: {
      model: getModelByName("night_camp_registrations", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "UserCheck",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("night_camp_volunteering", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "Heart",
      },
    },
  },
  {
    resource: {
      model: getModelByName(
        "night_camp_volunteering_applications",
        PrismaModule
      ),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "UserPlus",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("night_camps_activities", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "Activity",
      },
    },
  },
  {
    resource: {
      model: getModelByName("night_camps_equipment", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🏕️ Night Camps",
        icon: "Tool",
      },
    },
  },

  // ==================== 🌟 STARGAZING & TOURS ====================
  {
    resource: {
      model: getModelByName("stargazing_spots", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "MapPin",
      },
    },
  },
  {
    resource: {
      model: getModelByName("stargazing_spot_reviews", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Star",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("services", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Briefcase",
      },
    },
  },
  {
    resource: {
      model: getModelByName("service_bookings", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Calendar",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("service_availability", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Clock",
      },
    },
  },
  {
    resource: {
      model: getModelByName("service_reviews", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "MessageSquare",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("service_media", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Image",
      },
    },
  },
  {
    resource: {
      model: getModelByName("tour_media", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🌟 Stargazing & Tours",
        icon: "Camera",
      },
    },
  },

  // ==================== 💬 COMMUNITY & DISCUSSIONS ====================
  {
    resource: {
      model: getModelByName("space_discussions", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "💬 Community & Discussions",
        icon: "MessageCircle",
      },
    },
  },
  {
    resource: {
      model: getModelByName("group_members", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "💬 Community & Discussions",
        icon: "UserPlus",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },

  // ==================== 🗳️ POLLS & VOTING ====================
  {
    resource: {
      model: getModelByName("polls", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🗳️ Polls & Voting",
        icon: "BarChart2",
      },
    },
  },
  {
    resource: {
      model: getModelByName("poll_choices", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🗳️ Polls & Voting",
        icon: "CheckSquare",
      },
    },
  },
  {
    resource: {
      model: getModelByName("poll_votes", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🗳️ Polls & Voting",
        icon: "Check",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
  {
    resource: {
      model: getModelByName("poll_comments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "🗳️ Polls & Voting",
        icon: "MessageSquare",
      },
      actions: {
        new: { isVisible: false, isAccessible: false },
        edit: { isVisible: false, isAccessible: false },
        delete: { isVisible: false, isAccessible: false },
        bulkDelete: { isVisible: false, isAccessible: false },
        list: { isVisible: true, isAccessible: true },
        show: { isVisible: true, isAccessible: true },
      },
    },
  },
];
