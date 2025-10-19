import { Request, Response } from "express";
import * as FinanceService from "../services/finance.service";

/**
 * Get revenue overview statistics
 * @route GET /api/finance/overview
 */
export const getRevenueOverview = async (req: Request, res: Response) => {
  try {
    const data = await FinanceService.getRevenueOverview();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching revenue overview:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue overview",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get revenue trends over time
 * @route GET /api/finance/revenue-trends
 * @query timeRange - Time range (e.g., "30d", "90d", "1y") (default: "30d")
 * @query groupBy - Grouping period: day, week, or month (default: "day")
 */
export const getRevenueTrends = async (req: Request, res: Response) => {
  try {
    const { timeRange = "30d", groupBy = "day" } = req.query;

    const data = await FinanceService.getRevenueTrends(
      timeRange as string,
      groupBy as "day" | "week" | "month"
    );

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching revenue trends:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch revenue trends",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get payment method statistics
 * @route GET /api/finance/payment-methods
 */
export const getPaymentMethodStats = async (req: Request, res: Response) => {
  try {
    const data = await FinanceService.getPaymentMethodStats();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching payment method stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment method statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get top revenue-generating users
 * @route GET /api/finance/top-users
 * @query limit - Number of users to return (default: 10)
 */
export const getTopRevenueUsers = async (req: Request, res: Response) => {
  try {
    const { limit = "10" } = req.query;
    const data = await FinanceService.getTopRevenueUsers(parseInt(limit as string));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching top revenue users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch top revenue users",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get subscription analytics
 * @route GET /api/finance/subscriptions
 * @query timeRange - Time range (e.g., "30d", "90d") (default: "30d")
 */
export const getSubscriptionAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeRange = "30d" } = req.query;
    const data = await FinanceService.getSubscriptionAnalytics(timeRange as string);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching subscription analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch subscription analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get service booking analytics
 * @route GET /api/finance/service-bookings
 * @query timeRange - Time range (e.g., "30d", "90d") (default: "30d")
 */
export const getServiceBookingAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeRange = "30d" } = req.query;
    const data = await FinanceService.getServiceBookingAnalytics(timeRange as string);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching service booking analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch service booking analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get session enrollment analytics
 * @route GET /api/finance/session-enrollments
 * @query timeRange - Time range (e.g., "30d", "90d") (default: "30d")
 */
export const getSessionEnrollmentAnalytics = async (req: Request, res: Response) => {
  try {
    const { timeRange = "30d" } = req.query;
    const data = await FinanceService.getSessionEnrollmentAnalytics(timeRange as string);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching session enrollment analytics:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch session enrollment analytics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get MRR (Monthly Recurring Revenue) trends
 * @route GET /api/finance/mrr-trends
 * @query months - Number of months to look back (default: 12)
 */
export const getMRRTrends = async (req: Request, res: Response) => {
  try {
    const { months = "12" } = req.query;
    const data = await FinanceService.getMRRTrends(parseInt(months as string));

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching MRR trends:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch MRR trends",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get payment status distribution
 * @route GET /api/finance/payment-status
 */
export const getPaymentStatusDistribution = async (req: Request, res: Response) => {
  try {
    const data = await FinanceService.getPaymentStatusDistribution();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching payment status distribution:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status distribution",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get complete finance dashboard data
 * @route GET /api/finance/dashboard
 */
export const getFinanceDashboard = async (req: Request, res: Response) => {
  try {
    const data = await FinanceService.getFinanceDashboard();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Error fetching finance dashboard:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch finance dashboard",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
