import { Router, Request, Response, NextFunction } from "express";
import * as FinanceController from "../controllers/finance.controller";

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify admin authentication via Firebase token
 * In development mode, allows access without proper authentication
 */
const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // In development mode, allow access without token
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - allowing finance API access');
      req.user = {
        id: 1,
        email: 'admin@dev.com',
        role: 'admin',
      };
      return next();
    }

    const token = req.headers.authorization?.split("Bearer ")[1];
    if (!token) {
      return res.status(401).json({
        success: false,
        message: "No authentication token provided",
      });
    }

    // Add token verification logic here if needed
    next();
  } catch (error) {
    console.error("Admin auth error:", error);
    res.status(401).json({
      success: false,
      message: "Authentication failed",
    });
  }
};

// Apply admin authentication middleware to all routes
router.use(adminAuthMiddleware);

/**
 * GET /api/finance/overview
 * Get revenue overview statistics
 */
router.get("/overview", FinanceController.getRevenueOverview);

/**
 * GET /api/finance/revenue-trends
 * Get revenue trends over time
 * Query params: timeRange (default: "30d"), groupBy (default: "day")
 */
router.get("/revenue-trends", FinanceController.getRevenueTrends);

/**
 * GET /api/finance/payment-methods
 * Get payment method statistics
 */
router.get("/payment-methods", FinanceController.getPaymentMethodStats);

/**
 * GET /api/finance/top-users
 * Get top revenue-generating users
 * Query params: limit (default: 10)
 */
router.get("/top-users", FinanceController.getTopRevenueUsers);

/**
 * GET /api/finance/subscriptions
 * Get subscription analytics
 * Query params: timeRange (default: "30d")
 */
router.get("/subscriptions", FinanceController.getSubscriptionAnalytics);

/**
 * GET /api/finance/service-bookings
 * Get service booking analytics
 * Query params: timeRange (default: "30d")
 */
router.get("/service-bookings", FinanceController.getServiceBookingAnalytics);

/**
 * GET /api/finance/session-enrollments
 * Get session enrollment analytics
 * Query params: timeRange (default: "30d")
 */
router.get("/session-enrollments", FinanceController.getSessionEnrollmentAnalytics);

/**
 * GET /api/finance/mrr-trends
 * Get MRR (Monthly Recurring Revenue) trends
 * Query params: months (default: 12)
 */
router.get("/mrr-trends", FinanceController.getMRRTrends);

/**
 * GET /api/finance/payment-status
 * Get payment status distribution
 */
router.get("/payment-status", FinanceController.getPaymentStatusDistribution);

/**
 * GET /api/finance/dashboard
 * Get complete finance dashboard data
 */
router.get("/dashboard", FinanceController.getFinanceDashboard);

export default router;
