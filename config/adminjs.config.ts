/**
 * AdminJS Configuration
 * Custom branding, dashboard, and resource settings
 * Note: Prisma adapter is registered in index.ts before this file is imported
 */
export const adminJsConfig = {
  // Root path for admin panel
  rootPath: "/admin",

  // Assets CDN - Important for reverse proxy setup!
  // This tells AdminJS to load its static assets from the correct path
  assetsCDN: process.env.ADMIN_ASSETS_CDN || undefined,

  // Branding
  branding: {
    companyName: "STELLARION Admin",
    logo: false as const,
    withMadeWithLove: false,
    favicon: "https://cdn-icons-png.flaticon.com/512/3242/3242257.png",
    theme: {
      colors: {
        primary100: "#1a1a2e",
        primary80: "#16213e",
        primary60: "#0f3460",
        primary40: "#533483",
        primary20: "#e94560",
        accent: "#e94560",
        love: "#e94560",
        bg: "#f8f9fa",
        filterBg: "#ffffff",
        hoverBg: "#f1f3f5",
      },
    },
  },

  // Locale
  locale: {
    language: "en",
    translations: {
      en: {
        resources: {
          users: {
            name: "User",
            properties: {
              id: "User ID",
              email: "Email Address",
              username: "Username",
              role: "User Role",
              created_at: "Registration Date",
              is_active: "Account Status",
            },
          },
        },
        dashboard: {
          welcome: "Welcome to STELLARION Admin Dashboard! 🚀",
          info: "Complete platform analytics and management",
        },
      },
    },
  },
};
