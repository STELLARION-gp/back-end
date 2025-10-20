// services/pdfGenerator.service.ts
import PDFDocument from 'pdfkit';
import { ProviderPayment } from './providerPayments.service';

/**
 * Generate a professional PDF document for provider payment details
 */
export const generatePaymentPDF = (payment: ProviderPayment): PDFKit.PDFDocument => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 40,
    info: {
      Title: `Payment Document - ${payment.provider_name}`,
      Author: 'Stellarion',
      Subject: `Payment for ${getMonthName(payment.month)} ${payment.year}`,
    },
  });

  // Helper function to format currency
  const formatCurrency = (amount: number): string => {
    return `LKR ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  // Helper function to format date
  const formatDate = (date: Date | null): string => {
    if (!date) return 'Not set';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  // Color scheme
  const colors = {
    primary: '#2C3E50',
    secondary: '#3498DB',
    success: '#27AE60',
    warning: '#F39C12',
    danger: '#E74C3C',
    text: '#34495E',
    lightGray: '#ECF0F1',
    darkGray: '#7F8C8D',
  };

  // Get status color
  const getStatusColor = (status: string): string => {
    switch (status.toLowerCase()) {
      case 'paid':
        return colors.success;
      case 'processing':
        return colors.warning;
      case 'pending':
        return colors.secondary;
      case 'failed':
        return colors.danger;
      default:
        return colors.text;
    }
  };

  let yPosition = 50;

  // ============================================
  // HEADER SECTION
  // ============================================
  doc
    .fillColor(colors.primary)
    .fontSize(28)
    .font('Helvetica-Bold')
    .text('Stellarion', 50, yPosition);

  yPosition += 30;

  doc
    .fontSize(10)
    .fillColor(colors.darkGray)
    .font('Helvetica')
    .text('Provider Payment Documentation', 50, yPosition);

  yPosition += 15;

  doc
    .fontSize(8)
    .text('Generated on: ' + new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }), 50, yPosition);

  // Horizontal line after header
  yPosition += 15;
  doc
    .strokeColor(colors.secondary)
    .lineWidth(2)
    .moveTo(50, yPosition)
    .lineTo(545, yPosition)
    .stroke();

  yPosition += 25;

  // ============================================
  // DOCUMENT TITLE
  // ============================================
  doc
    .fillColor(colors.primary)
    .fontSize(20)
    .font('Helvetica-Bold')
    .text('Payment Document', 50, yPosition);

  yPosition += 20;

  doc
    .fontSize(12)
    .fillColor(colors.text)
    .font('Helvetica')
    .text(`${getMonthName(payment.month)} ${payment.year}`, 50, yPosition);

  yPosition += 30;

  // ============================================
  // PROVIDER INFORMATION SECTION
  // ============================================
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Provider Information', 50, yPosition);

  yPosition += 20;

  // Provider info box
  const providerBoxTop = yPosition;
  const providerBoxHeight = 100;

  doc
    .rect(50, providerBoxTop, 495, providerBoxHeight)
    .fillAndStroke(colors.lightGray, colors.darkGray);

  yPosition = providerBoxTop + 15;

  // Provider details
  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Provider Name:', 70, yPosition)
    .font('Helvetica')
    .text(payment.provider_name, 200, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica-Bold')
    .text('Email:', 70, yPosition)
    .font('Helvetica')
    .text(payment.provider_email, 200, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica-Bold')
    .text('Provider ID:', 70, yPosition)
    .font('Helvetica')
    .text(`#${payment.provider_id}`, 200, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica-Bold')
    .text('Provider Type:', 70, yPosition)
    .font('Helvetica')
    .text(payment.provider_type.toUpperCase(), 200, yPosition);

  yPosition = providerBoxTop + providerBoxHeight + 25;

  // ============================================
  // PAYMENT STATUS SECTION
  // ============================================
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Payment Status', 50, yPosition);

  yPosition += 20;

  const statusBoxTop = yPosition;
  const statusBoxHeight = 80;

  doc
    .rect(50, statusBoxTop, 495, statusBoxHeight)
    .fillAndStroke(colors.lightGray, colors.darkGray);

  yPosition = statusBoxTop + 15;

  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Status:', 70, yPosition);

  doc
    .fontSize(12)
    .fillColor(getStatusColor(payment.payment_status))
    .font('Helvetica-Bold')
    .text(payment.payment_status.toUpperCase(), 200, yPosition);

  yPosition += 25;

  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Payment Method:', 70, yPosition)
    .font('Helvetica')
    .text(payment.payment_method || 'Not specified', 200, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica-Bold')
    .text('Transaction ID:', 70, yPosition)
    .font('Helvetica')
    .text(payment.transaction_id || 'N/A', 200, yPosition);

  yPosition = statusBoxTop + statusBoxHeight + 25;

  // ============================================
  // REVENUE BREAKDOWN SECTION
  // ============================================
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Revenue Breakdown', 50, yPosition);

  yPosition += 20;

  // Services Revenue Box
  const servicesBoxTop = yPosition;
  const servicesBoxHeight = 60;

  doc
    .rect(50, servicesBoxTop, 240, servicesBoxHeight)
    .fillAndStroke('#E8F5E9', '#4CAF50');

  yPosition = servicesBoxTop + 15;

  doc
    .fontSize(11)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Services Revenue', 70, yPosition);

  yPosition += 20;

  doc
    .fontSize(18)
    .fillColor(colors.success)
    .font('Helvetica-Bold')
    .text(formatCurrency(payment.services_revenue), 70, yPosition);

  doc
    .fontSize(9)
    .fillColor(colors.darkGray)
    .font('Helvetica')
    .text(`${payment.services_count} booking${payment.services_count !== 1 ? 's' : ''}`, 70, yPosition + 20);

  // Sessions Revenue Box
  yPosition = servicesBoxTop;

  doc
    .rect(305, servicesBoxTop, 240, servicesBoxHeight)
    .fillAndStroke('#E3F2FD', '#2196F3');

  yPosition = servicesBoxTop + 15;

  doc
    .fontSize(11)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Sessions Revenue', 325, yPosition);

  yPosition += 20;

  doc
    .fontSize(18)
    .fillColor(colors.secondary)
    .font('Helvetica-Bold')
    .text(formatCurrency(payment.sessions_revenue), 325, yPosition);

  doc
    .fontSize(9)
    .fillColor(colors.darkGray)
    .font('Helvetica')
    .text(`${payment.sessions_count} enrollment${payment.sessions_count !== 1 ? 's' : ''}`, 325, yPosition + 20);

  yPosition = servicesBoxTop + servicesBoxHeight + 25;

  // ============================================
  // FINANCIAL SUMMARY SECTION
  // ============================================
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Financial Summary', 50, yPosition);

  yPosition += 20;

  const summaryBoxTop = yPosition;
  const summaryBoxHeight = 120;

  doc
    .rect(50, summaryBoxTop, 495, summaryBoxHeight)
    .fillAndStroke('#FFF3E0', '#FF9800');

  yPosition = summaryBoxTop + 15;

  // Total Revenue
  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Total Revenue:', 70, yPosition);

  doc
    .fontSize(12)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text(formatCurrency(payment.total_revenue), 400, yPosition, { align: 'right' });

  yPosition += 25;

  // Platform Fee
  doc
    .fontSize(10)
    .font('Helvetica-Bold')
    .text('Platform Fee (10%):', 70, yPosition);

  doc
    .fontSize(12)
    .fillColor(colors.danger)
    .font('Helvetica')
    .text(`- ${formatCurrency(payment.platform_fee)}`, 400, yPosition, { align: 'right' });

  yPosition += 25;

  // Divider line
  doc
    .strokeColor(colors.warning)
    .lineWidth(1)
    .moveTo(70, yPosition)
    .lineTo(525, yPosition)
    .stroke();

  yPosition += 15;

  // Provider Earnings
  doc
    .fontSize(11)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Provider Earnings (90%):', 70, yPosition);

  doc
    .fontSize(16)
    .fillColor(colors.success)
    .font('Helvetica-Bold')
    .text(formatCurrency(payment.provider_earnings), 400, yPosition, { align: 'right' });

  yPosition = summaryBoxTop + summaryBoxHeight + 25;

  // ============================================
  // PAYMENT DATES SECTION
  // ============================================
  doc
    .fontSize(14)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Important Dates', 50, yPosition);

  yPosition += 20;

  const datesBoxTop = yPosition;
  const datesBoxHeight = 80;

  doc
    .rect(50, datesBoxTop, 495, datesBoxHeight)
    .fillAndStroke(colors.lightGray, colors.darkGray);

  yPosition = datesBoxTop + 15;

  doc
    .fontSize(10)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Payment Date:', 70, yPosition)
    .font('Helvetica')
    .text(formatDate(payment.payment_date), 200, yPosition);

  yPosition += 20;

  doc
    .font('Helvetica-Bold')
    .text('Record Created:', 70, yPosition)
    .font('Helvetica')
    .text(formatDate(payment.created_at), 200, yPosition);

  yPosition += 20;

//   doc
//     .font('Helvetica-Bold')
//     .text('Last Updated:', 70, yPosition)
//     .font('Helvetica')
//     .text(formatDate(payment.updated_at), 200, yPosition);

   yPosition = datesBoxTop + datesBoxHeight + 25;

  // ============================================
  // NOTES SECTION (if any)
  // ============================================
  if (payment.notes) {
    doc
      .fontSize(14)
      .font('Helvetica-Bold')
      .fillColor(colors.secondary)
      .text('Additional Notes', 50, yPosition);

    yPosition += 20;

    const notesBoxHeight = Math.min(100, payment.notes.length / 2 + 30);

    doc
      .rect(50, yPosition, 495, notesBoxHeight)
      .fillAndStroke('#FFF9C4', '#FBC02D');

    doc
      .fontSize(9)
      .fillColor(colors.text)
      .font('Helvetica')
      .text(payment.notes, 70, yPosition + 15, {
        width: 455,
        align: 'left',
      });

    yPosition += notesBoxHeight + 25;
  }

  // ============================================
  // FOOTER SECTION
  // ============================================
//    yPosition = 750; // Position footer at bottom of page

//   doc
//     .strokeColor(colors.darkGray)
//     .lineWidth(1)
//     .moveTo(50, yPosition)
//     .lineTo(545, yPosition)
//     .stroke();

//   yPosition += 10;

//   doc
//     .fontSize(8)
//     .fillColor(colors.darkGray)
//     .font('Helvetica')
//     .text('This is an auto-generated payment document from Stellariono', 50, yPosition, {
//       width: 495,
//       align: 'center',
//     });

//   yPosition += 12;

//   doc
//     .text('For any inquiries, please contact our support team', 50, yPosition, {
//       width: 495,
//       align: 'center',
//     });

//   yPosition += 12;

//   doc
//     .font('Helvetica-Bold')
//     .fillColor(colors.secondary)
//     .text('© 2025 Stellarion. All rights reserved.', 50, yPosition, {
//       width: 495,
//       align: 'center',
//     });

  // Finalize PDF
  doc.end();

  return doc;
};

/**
 * Generate a summary PDF for multiple payments
 */
export const generatePaymentsSummaryPDF = (
  payments: ProviderPayment[],
  filters: {
    status?: string;
    provider_type?: string;
    month?: number;
    year?: number;
  }
): PDFKit.PDFDocument => {
  const doc = new PDFDocument({
    size: 'A4',
    margin: 50,
    info: {
      Title: 'Provider Payments Summary',
      Author: 'Stelllarion',
      Subject: 'Payment Summary Report',
    },
  });

  const formatCurrency = (amount: number): string => {
    return `LKR ${amount.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const colors = {
    primary: '#2C3E50',
    secondary: '#3498DB',
    success: '#27AE60',
    warning: '#F39C12',
    text: '#34495E',
    lightGray: '#ECF0F1',
    darkGray: '#7F8C8D',
  };

  let yPosition = 50;

  // Header
  doc
    .fillColor(colors.primary)
    .fontSize(24)
    .font('Helvetica-Bold')
    .text('STELLARION', 50, yPosition);

  yPosition += 30;

  doc
    .fontSize(16)
    .fillColor(colors.secondary)
    .text('Provider Payments Summary', 50, yPosition);

  yPosition += 18;

  doc
    .fontSize(9)
    .fillColor(colors.darkGray)
    .font('Helvetica')
    .text('Generated on: ' + new Date().toLocaleString(), 50, yPosition);

  yPosition += 20;

  // Filters applied
  if (Object.keys(filters).length > 0) {
    doc
      .fontSize(10)
      .fillColor(colors.text)
      .font('Helvetica-Bold')
      .text('Filters Applied:', 50, yPosition);

    yPosition += 15;

    Object.entries(filters).forEach(([key, value]) => {
      if (value) {
        doc
          .fontSize(9)
          .font('Helvetica')
          .text(`• ${key}: ${value}`, 70, yPosition);
        yPosition += 12;
      }
    });

    yPosition += 10;
  }

  // Summary statistics
  const totalPayments = payments.length;
  const totalRevenue = payments.reduce((sum, p) => sum + Number(p.total_revenue), 0);
  const totalEarnings = payments.reduce((sum, p) => sum + Number(p.provider_earnings), 0);
  const totalFees = payments.reduce((sum, p) => sum + Number(p.platform_fee), 0);

  yPosition += 10;

  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Summary Statistics', 50, yPosition);

  yPosition += 20;

  // Summary boxes
  const boxWidth = 115;
  const boxHeight = 60;
  const boxSpacing = 10;

  // Total Payments
  doc
    .rect(50, yPosition, boxWidth, boxHeight)
    .fillAndStroke('#E3F2FD', colors.secondary);

  doc
    .fontSize(9)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Total Payments', 60, yPosition + 10);

  doc
    .fontSize(16)
    .fillColor(colors.secondary)
    .text(totalPayments.toString(), 60, yPosition + 30);

  // Total Revenue
  doc
    .rect(50 + boxWidth + boxSpacing, yPosition, boxWidth, boxHeight)
    .fillAndStroke('#FFF3E0', colors.warning);

  doc
    .fontSize(9)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Total Revenue', 60 + boxWidth + boxSpacing, yPosition + 10);

  doc
    .fontSize(12)
    .fillColor(colors.warning)
    .text(formatCurrency(totalRevenue), 60 + boxWidth + boxSpacing, yPosition + 30, {
      width: 95,
    });

  // Total Earnings
  doc
    .rect(50 + (boxWidth + boxSpacing) * 2, yPosition, boxWidth, boxHeight)
    .fillAndStroke('#E8F5E9', colors.success);

  doc
    .fontSize(9)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Total Earnings', 60 + (boxWidth + boxSpacing) * 2, yPosition + 10);

  doc
    .fontSize(12)
    .fillColor(colors.success)
    .text(formatCurrency(totalEarnings), 60 + (boxWidth + boxSpacing) * 2, yPosition + 30, {
      width: 95,
    });

  // Total Fees
  doc
    .rect(50 + (boxWidth + boxSpacing) * 3, yPosition, boxWidth, boxHeight)
    .fillAndStroke('#FFEBEE', '#E74C3C');

  doc
    .fontSize(9)
    .fillColor(colors.text)
    .font('Helvetica-Bold')
    .text('Platform Fees', 60 + (boxWidth + boxSpacing) * 3, yPosition + 10);

  doc
    .fontSize(12)
    .fillColor('#E74C3C')
    .text(formatCurrency(totalFees), 60 + (boxWidth + boxSpacing) * 3, yPosition + 30, {
      width: 95,
    });

  yPosition += boxHeight + 30;

  // Payments table
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor(colors.secondary)
    .text('Payment Records', 50, yPosition);

  yPosition += 20;

  // Table header
  const tableTop = yPosition;
  const rowHeight = 25;

  doc
    .rect(50, tableTop, 495, rowHeight)
    .fillAndStroke(colors.primary, colors.primary);

  doc
    .fontSize(8)
    .fillColor('#FFFFFF')
    .font('Helvetica-Bold')
    .text('Provider', 60, tableTop + 8, { width: 100 })
    .text('Period', 170, tableTop + 8, { width: 60 })
    .text('Type', 240, tableTop + 8, { width: 50 })
    .text('Revenue', 300, tableTop + 8, { width: 70 })
    .text('Earnings', 380, tableTop + 8, { width: 70 })
    .text('Status', 460, tableTop + 8, { width: 70 });

  yPosition = tableTop + rowHeight;

  // Table rows
  payments.slice(0, 20).forEach((payment, index) => {
    const bgColor = index % 2 === 0 ? '#FFFFFF' : colors.lightGray;

    doc
      .rect(50, yPosition, 495, rowHeight)
      .fillAndStroke(bgColor, colors.darkGray);

    doc
      .fontSize(7)
      .fillColor(colors.text)
      .font('Helvetica')
      .text(payment.provider_name.substring(0, 20), 60, yPosition + 8, { width: 100 })
      .text(`${getMonthName(payment.month).substring(0, 3)} ${payment.year}`, 170, yPosition + 8, { width: 60 })
      .text(payment.provider_type.substring(0, 6), 240, yPosition + 8, { width: 50 })
      .text(formatCurrency(Number(payment.total_revenue)).substring(0, 15), 300, yPosition + 8, { width: 70 })
      .text(formatCurrency(Number(payment.provider_earnings)).substring(0, 15), 380, yPosition + 8, { width: 70 })
      .text(payment.payment_status.substring(0, 8), 460, yPosition + 8, { width: 70 });

    yPosition += rowHeight;

    // Add new page if needed
    if (yPosition > 700 && index < payments.length - 1) {
      doc.addPage();
      yPosition = 50;
    }
  });

  if (payments.length > 20) {
    yPosition += 10;
    doc
      .fontSize(8)
      .fillColor(colors.darkGray)
      .font('Helvetica-Oblique')
      .text(`... and ${payments.length - 20} more payment(s)`, 50, yPosition);
  }

  // Footer
  doc
    .fontSize(7)
    .fillColor(colors.darkGray)
    .font('Helvetica')
    .text('© 2025 Stellarion. All rights reserved.', 50, 770, {
      width: 495,
      align: 'center',
    });

  doc.end();

  return doc;
};

/**
 * Helper function to get month name
 */
function getMonthName(month: number): string {
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return months[month - 1] || 'Unknown';
}
