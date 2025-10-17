// docs/swagger.ts
import swaggerJsdoc from 'swagger-jsdoc';

const openapiDefinition: swaggerJsdoc.Options['definition'] = {
  openapi: '3.0.3',
  info: {
    title: 'STELLARION Backend API',
    version: '1.0.0',
    description: 'API documentation for the STELLARION backend',
  },
  tags: [
    { name: 'System', description: 'System and infrastructure endpoints' },
    { name: 'RecommendedContents', description: 'Mentor recommended contents (YouTube/PDF)' },
    { name: 'Auth', description: 'Authentication and account management' },
    { name: 'Users', description: 'User directory and admin operations' },
    { name: 'Profile', description: 'User profile, settings, role upgrade' },
    { name: 'Blogs', description: 'Blogs, comments, likes and ratings' },
    { name: 'SpaceNews', description: 'Space news, categories, comments' },
    { name: 'SpaceDiscussions', description: 'Community space discussions and comments' },
    { name: 'Sessions', description: 'Learning sessions and enrollments' },
    { name: 'Polls', description: 'Polls, votes and comments' },
    { name: 'NightCamps', description: 'Night camp events and volunteering' },
    { name: 'Subscriptions', description: 'Subscriptions, chatbot access and usage' },
    { name: 'Payments', description: 'Payment orders, status and webhooks' },
    { name: 'AstronomyEvents', description: 'Astronomy events and reminders' },
    { name: 'Chat', description: 'Chat groups and messaging' },
    { name: 'Upload', description: 'Generic file upload' },
    { name: 'Media', description: 'User media uploads' },
    { name: 'TourMedia', description: 'Tour uploads and management' },
    { name: 'Events', description: 'Event listings and moderation' },
    { name: 'NASA', description: 'NASA opportunities and projects' },
    { name: 'StargazingSpots', description: 'Spots and reviews' },
    { name: 'Chatbot', description: 'Chatbot sessions and chat completion' },
    { name: 'Diagnostic', description: 'Diagnostics and development utilities' },
    { name: 'Applications', description: 'Mentor/Influencer/Guide applications' },
  ],
  servers: [
    { url: 'http://localhost:5000', description: 'Local' },
    // { url: 'https://api.yourdomain.com', description: 'Production' },
  ],
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        description: 'Use a Firebase ID token as the bearer token.',
      },
    },
    schemas: {
      // Reusable schemas go here. Example:
      ApiResponse: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          data: {},
          error: { type: 'string' },
        },
      },
      Health: {
        type: 'object',
        properties: {
          status: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          version: { type: 'string' },
        },
        required: ['status', 'timestamp', 'version'],
      },
      RecommendedContent: {
        type: 'object',
        properties: {
          id: { type: 'integer' },
          mentor_id: { type: 'integer' },
          title: { type: 'string' },
          description: { type: 'string', nullable: true },
          source_type: { type: 'string', enum: ['youtube', 'pdf'] },
          url: { type: 'string', format: 'uri' },
          metadata: { type: 'object', additionalProperties: true },
          created_at: { type: 'string', format: 'date-time' },
          updated_at: { type: 'string', format: 'date-time' },
        },
        required: ['id', 'mentor_id', 'title', 'source_type', 'url', 'created_at', 'updated_at'],
      },
      RecommendedContentResponse: {
        allOf: [
          { $ref: '#/components/schemas/ApiResponse' },
          {
            type: 'object',
            properties: {
              data: { $ref: '#/components/schemas/RecommendedContent' },
            },
          },
        ],
      },
      CreateYouTubeRequest: {
        type: 'object',
        properties: {
          title: { type: 'string' },
          description: { type: 'string' },
          url: { type: 'string', format: 'uri' },
        },
        required: ['title', 'url'],
      },
    },
  },
  security: [{ bearerAuth: [] }], // apply bearer by default; remove if not desired globally
};

export const swaggerSpec = swaggerJsdoc({
  definition: openapiDefinition,
  apis: [
    // Scan all your route/controller files that include @openapi JSDoc blocks:
    './routes/**/*.ts',
    './controllers/**/*.ts',
    './index.ts',
  ],
});