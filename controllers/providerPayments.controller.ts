// controllers/providerPayments.controller.ts
import { Request, Response } from "express";
import * as ProviderPaymentsService from "../services/providerPayments.service";
import * as PDFGeneratorService from "../services/pdfGenerator.service";

/**
 * Get all provider payments with optional filters
 * @route GET /api/provider-payments
 * @query status - Filter by payment status (pending, processing, paid, failed)
 * @query provider_type - Filter by provider type (guide, influencer)
 * @query month - Filter by month (1-12)
 * @query year - Filter by year
 * @query search - Search by provider name, email, or transaction ID
 */
export const getProviderPayments = async (req: Request, res: Response) => {
  try {
    const { status, provider_type, month, year, search } = req.query;

    const filters: any = {};

    if (status) filters.status = status as string;
    if (provider_type) filters.provider_type = provider_type as 'guide' | 'influencer';
    if (month) filters.month = parseInt(month as string);
    if (year) filters.year = parseInt(year as string);
    if (search) filters.search = search as string;

    const payments = await ProviderPaymentsService.getProviderPayments(filters);

    res.json({
      success: true,
      data: payments,
      count: payments.length,
    });
  } catch (error) {
    console.error("Error fetching provider payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch provider payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get payment details by ID
 * @route GET /api/provider-payments/:id
 */
export const getPaymentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await ProviderPaymentsService.getPaymentById(parseInt(id));

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment details:", error);
    const statusCode = error instanceof Error && error.message === 'Payment not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to fetch payment details",
    });
  }
};

/**
 * Update payment status
 * @route PUT /api/provider-payments/:id/status
 * @body status - New payment status (pending, processing, paid, failed)
 * @body payment_method - Payment method (optional)
 * @body transaction_id - Transaction ID (optional)
 * @body notes - Additional notes (optional)
 */
export const updatePaymentStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, payment_method, transaction_id, notes } = req.body;

    if (!status) {
      return res.status(400).json({
        success: false,
        message: "Payment status is required",
      });
    }

    // Validate status
    const validStatuses = ['pending', 'processing', 'paid', 'failed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid payment status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    const payment = await ProviderPaymentsService.updatePaymentStatus(
      parseInt(id),
      status,
      {
        payment_method,
        transaction_id,
        notes,
      }
    );

    res.json({
      success: true,
      message: `Payment status updated to ${status}`,
      data: payment,
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update payment status",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Generate provider payments for a specific month/year
 * @route POST /api/provider-payments/generate
 * @body month - Month (1-12)
 * @body year - Year
 */
export const generateProviderPayments = async (req: Request, res: Response) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res.status(400).json({
        success: false,
        message: "Month and year are required",
      });
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12) {
      return res.status(400).json({
        success: false,
        message: "Month must be between 1 and 12",
      });
    }

    if (yearNum < 2020) {
      return res.status(400).json({
        success: false,
        message: "Invalid year",
      });
    }

    const result = await ProviderPaymentsService.generateProviderPayments(monthNum, yearNum);

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error generating provider payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate provider payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Export provider payments as CSV
 * @route GET /api/provider-payments/export
 * @query status - Filter by payment status
 * @query provider_type - Filter by provider type
 * @query month - Filter by month
 * @query year - Filter by year
 */
export const exportPayments = async (req: Request, res: Response) => {
  try {
    const { status, provider_type, month, year } = req.query;

    const filters: any = {};

    if (status) filters.status = status as string;
    if (provider_type) filters.provider_type = provider_type as 'guide' | 'influencer';
    if (month) filters.month = parseInt(month as string);
    if (year) filters.year = parseInt(year as string);

    const { headers, rows, payments } = await ProviderPaymentsService.exportPayments(filters);

    // Build CSV content
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => {
        // Escape commas and quotes in cell values
        const cellStr = String(cell);
        if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
          return `"${cellStr.replace(/"/g, '""')}"`;
        }
        return cellStr;
      }).join(','))
    ].join('\n');

    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="provider_payments_${Date.now()}.csv"`);
    res.send(csvContent);
  } catch (error) {
    console.error("Error exporting payments:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export payments",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Get payment statistics
 * @route GET /api/provider-payments/stats
 */
export const getPaymentStats = async (req: Request, res: Response) => {
  try {
    const stats = await ProviderPaymentsService.getPaymentStats();

    res.json({
      success: true,
      data: stats,
    });
  } catch (error) {
    console.error("Error fetching payment stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment statistics",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};

/**
 * Download a single payment document as PDF
 * @route GET /api/provider-payments/:id/download-pdf
 */
export const downloadPaymentPDF = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const payment = await ProviderPaymentsService.getPaymentById(parseInt(id));

    // Generate PDF
    const doc = PDFGeneratorService.generatePaymentPDF(payment);

    // Set response headers for PDF download
    const filename = `Payment_${payment.provider_name.replace(/\s+/g, '_')}_${payment.month}_${payment.year}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);
  } catch (error) {
    console.error("Error generating payment PDF:", error);
    const statusCode = error instanceof Error && error.message === 'Payment not found' ? 404 : 500;
    res.status(statusCode).json({
      success: false,
      message: error instanceof Error ? error.message : "Failed to generate payment PDF",
    });
  }
};

/**
 * Download multiple payments summary as PDF
 * @route GET /api/provider-payments/download-summary-pdf
 * @query status - Filter by payment status
 * @query provider_type - Filter by provider type
 * @query month - Filter by month
 * @query year - Filter by year
 */
export const downloadPaymentsSummaryPDF = async (req: Request, res: Response) => {
  try {
    const { status, provider_type, month, year, search } = req.query;

    const filters: any = {};

    if (status) filters.status = status as string;
    if (provider_type) filters.provider_type = provider_type as 'guide' | 'influencer';
    if (month) filters.month = parseInt(month as string);
    if (year) filters.year = parseInt(year as string);
    if (search) filters.search = search as string;

    const payments = await ProviderPaymentsService.getProviderPayments(filters);

    if (payments.length === 0) {
      return res.status(404).json({
        success: false,
        message: "No payments found with the specified filters",
      });
    }

    // Generate summary PDF
    const doc = PDFGeneratorService.generatePaymentsSummaryPDF(payments, filters);

    // Set response headers for PDF download
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `Payments_Summary_${timestamp}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    // Pipe PDF to response
    doc.pipe(res);
  } catch (error) {
    console.error("Error generating payments summary PDF:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate payments summary PDF",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
