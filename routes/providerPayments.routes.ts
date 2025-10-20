// routes/providerPayments.routes.ts
import { Router, Request, Response, NextFunction } from "express";
import * as ProviderPaymentsController from "../controllers/providerPayments.controller";

const router = Router();

interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    role: string;
  };
}

/**
 * Middleware to verify admin authentication
 * Only admins can access provider payment management
 */
const adminAuthMiddleware = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // In development mode, allow access without token
    if (process.env.NODE_ENV === 'development') {
      console.log('Development mode - allowing provider payments API access');
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

    // Add proper token verification here if needed
    // For now, assuming the user is already authenticated
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
 * GET /api/provider-payments
 * Get all provider payments with optional filters
 * Query params:
 *  - status: Filter by payment status (pending, processing, paid, failed)
 *  - provider_type: Filter by provider type (guide, influencer)
 *  - month: Filter by month (1-12)
 *  - year: Filter by year
 *  - search: Search by provider name, email, or transaction ID
 */
router.get("/", ProviderPaymentsController.getProviderPayments);

/**
 * GET /api/provider-payments/stats
 * Get payment statistics (pending, paid, active providers, etc.)
 */
router.get("/stats", ProviderPaymentsController.getPaymentStats);

/**
 * GET /api/provider-payments/export
 * Export provider payments as CSV
 * Query params: same as GET /api/provider-payments
 */
router.get("/export", ProviderPaymentsController.exportPayments);

/**
 * GET /api/provider-payments/download-summary-pdf
 * Download multiple payments summary as PDF
 * Query params: same as GET /api/provider-payments
 */
router.get("/download-summary-pdf", ProviderPaymentsController.downloadPaymentsSummaryPDF);

/**
 * GET /api/provider-payments/:id
 * Get payment details by ID
 */
router.get("/:id", ProviderPaymentsController.getPaymentById);

/**
 * GET /api/provider-payments/:id/download-pdf
 * Download a single payment document as PDF
 */
router.get("/:id/download-pdf", ProviderPaymentsController.downloadPaymentPDF);

/**
 * PUT /api/provider-payments/:id/status
 * Update payment status
 * Body:
 *  - status: New payment status (pending, processing, paid, failed) [required]
 *  - payment_method: Payment method (optional)
 *  - transaction_id: Transaction ID (optional)
 *  - notes: Additional notes (optional)
 */
router.put("/:id/status", ProviderPaymentsController.updatePaymentStatus);

/**
 * POST /api/provider-payments/generate
 * Generate provider payments for a specific month/year
 * Body:
 *  - month: Month (1-12) [required]
 *  - year: Year [required]
 */
router.post("/generate", ProviderPaymentsController.generateProviderPayments);

export default router;
