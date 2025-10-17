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
 */
export const adminResources: ResourceWithOptions[] = [
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
      model: getModelByName("blogs", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: blogsResourceOptions,
  },
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
      model: getModelByName("astronomy_events", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: astronomyEventsResourceOptions,
  },
  // Add more resources as needed
  {
    resource: {
      model: getModelByName("blog_comments", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "Content Management",
        icon: "Comment",
      },
    },
  },
  {
    resource: {
      model: getModelByName("space_news", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "Content Management",
        icon: "News",
      },
    },
  },
  {
    resource: {
      model: getModelByName("chatbot_sessions", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "AI & Analytics",
        icon: "Chat",
      },
    },
  },
  {
    resource: {
      model: getModelByName("mentor_application", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "Applications",
        icon: "FileText",
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
        name: "Applications",
        icon: "FileText",
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
        name: "Applications",
        icon: "FileText",
      },
    },
  },
  {
    resource: {
      model: getModelByName("subscriptions", PrismaModule),
      client: prisma,
      clientModule: PrismaModule,
    },
    options: {
      navigation: {
        name: "Payments & Subscriptions",
        icon: "CreditCard",
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
        name: "Payments & Subscriptions",
        icon: "DollarSign",
      },
    },
  },
];
