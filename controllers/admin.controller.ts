// controllers/admin.controller.ts
import { Request, Response } from "express";
import * as adminService from "../services/admin.service";

/**
 * Get dashboard statistics
 * @route GET /api/admin/stats
 * @access Private (Admin only)
 */
export const getStats = async (_req: Request, res: Response): Promise<void> => {
  try {
    const stats = await adminService.getGeneralStats();
    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Stats error:", error);
    res.status(500).json({ error: "Failed to fetch statistics" });
  }
};

/**
 * Get user counts by role
 * @route GET /api/admin/users-by-role
 * @access Private (Admin only)
 */
export const getUsersByRole = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await adminService.getUsersByRole();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Users by role error:", error);
    res.status(500).json({ error: "Failed to fetch users by role" });
  }
};

/**
 * Get recent system activity
 * @route GET /api/admin/recent-activity
 * @access Private (Admin only)
 */
export const getRecentActivity = async (
  _req: Request,
  res: Response
): Promise<void> => {
  try {
    const data = await adminService.getRecentActivity();
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Recent activity error:", error);
    res.status(500).json({ error: "Failed to fetch recent activity" });
  }
};

/**
 * Get recent sessions
 * @route GET /api/admin/recent-sessions
 * @access Private (Admin only)
 */
export const getRecentSessions = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const sessions = await adminService.getRecentSessions(limit);

    res.json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    console.error("Recent sessions error:", error);
    res.status(500).json({ error: "Failed to fetch recent sessions" });
  }
};

/**
 * Get top guide services
 * @route GET /api/admin/top-guides
 * @access Private (Admin only)
 */
export const getTopGuides = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const limit = parseInt(req.query.limit as string) || 5;
    const guides = await adminService.getTopGuideServices(limit);

    res.json({
      success: true,
      data: guides,
    });
  } catch (error) {
    console.error("Top guides error:", error);
    res.status(500).json({ error: "Failed to fetch top guides" });
  }
};

/**
 * Get comprehensive platform overview
 * @route GET /api/admin/platform-overview
 * @access Private (Admin only)
 */
export const getPlatformOverview = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const timeRange = (req.query.timeRange as string) || "30d";
    const data = await adminService.getPlatformOverview(timeRange);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("Platform overview error:", error);
    res.status(500).json({ error: "Failed to fetch platform overview" });
  }
};

/**
 * Toggle user active status
 * @route POST /api/admin/users/:id/toggle-status
 * @access Private (Admin only)
 */
export const toggleUserStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const userId = parseInt(req.params.id);
    const result = await adminService.toggleUserStatus(userId);

    res.json({
      success: true,
      data: result.user,
      message: result.message,
    });
  } catch (error) {
    console.error("Toggle status error:", error);
    if (error instanceof Error && error.message === "User not found") {
      res.status(404).json({ error: "User not found" });
    } else {
      res.status(500).json({ error: "Failed to update user status" });
    }
  }
};
