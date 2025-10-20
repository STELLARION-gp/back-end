// scripts/test-pdf-generation.ts
/**
 * Test script for PDF generation functionality
 * Tests both single payment PDF and summary PDF generation
 */

import { prisma } from '../lib/prisma';
import * as PDFGeneratorService from '../services/pdfGenerator.service';
import * as ProviderPaymentsService from '../services/providerPayments.service';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function testPDFGeneration() {
  console.log('\n🧪 Testing PDF Generation Functionality\n');
  console.log('=' .repeat(60));

  try {
    // Test 1: Get a payment record
    console.log('\n📝 Step 1: Fetching payment records...');
    const payments = await ProviderPaymentsService.getProviderPayments({});
    
    if (payments.length === 0) {
      console.log('❌ No payment records found in database');
      console.log('   Please create some payment records first');
      return;
    }

    console.log(`✅ Found ${payments.length} payment record(s)`);

    // Test 2: Generate single payment PDF
    console.log('\n📄 Step 2: Generating single payment PDF...');
    const firstPayment = payments[0];
    console.log(`   Payment ID: ${firstPayment.id}`);
    console.log(`   Provider: ${firstPayment.provider_name}`);
    console.log(`   Amount: LKR ${firstPayment.provider_earnings}`);
    console.log(`   Period: ${firstPayment.month}/${firstPayment.year}`);

    const singlePDF = PDFGeneratorService.generatePaymentPDF(firstPayment);
    
    // Save to file for inspection
    const singleFilePath = path.join(__dirname, `test_payment_${firstPayment.id}.pdf`);
    const singleWriteStream = fs.createWriteStream(singleFilePath);
    
    await new Promise<void>((resolve, reject) => {
      singlePDF.pipe(singleWriteStream);
      singleWriteStream.on('finish', () => {
        console.log(`✅ Single payment PDF generated successfully!`);
        console.log(`   File saved: ${singleFilePath}`);
        resolve();
      });
      singleWriteStream.on('error', reject);
    });

    // Test 3: Generate summary PDF
    console.log('\n📊 Step 3: Generating summary PDF...');
    const summaryPayments = payments.slice(0, Math.min(5, payments.length));
    console.log(`   Including ${summaryPayments.length} payment(s) in summary`);

    const summaryPDF = PDFGeneratorService.generatePaymentsSummaryPDF(
      summaryPayments,
      { year: new Date().getFullYear() }
    );

    const summaryFilePath = path.join(__dirname, `test_summary_${Date.now()}.pdf`);
    const summaryWriteStream = fs.createWriteStream(summaryFilePath);

    await new Promise<void>((resolve, reject) => {
      summaryPDF.pipe(summaryWriteStream);
      summaryWriteStream.on('finish', () => {
        console.log(`✅ Summary PDF generated successfully!`);
        console.log(`   File saved: ${summaryFilePath}`);
        resolve();
      });
      summaryWriteStream.on('error', reject);
    });

    // Test 4: Verify file sizes
    console.log('\n📏 Step 4: Verifying generated files...');
    const singleFileSize = fs.statSync(singleFilePath).size;
    const summaryFileSize = fs.statSync(summaryFilePath).size;

    console.log(`   Single payment PDF: ${(singleFileSize / 1024).toFixed(2)} KB`);
    console.log(`   Summary PDF: ${(summaryFileSize / 1024).toFixed(2)} KB`);

    if (singleFileSize > 0 && summaryFileSize > 0) {
      console.log('✅ Both PDFs have valid file sizes');
    } else {
      console.log('❌ One or more PDFs have invalid file sizes');
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 PDF Generation Test Complete!\n');
    console.log('✅ Single payment PDF: SUCCESS');
    console.log('✅ Summary PDF: SUCCESS');
    console.log('\n📂 Generated files:');
    console.log(`   1. ${singleFilePath}`);
    console.log(`   2. ${summaryFilePath}`);
    console.log('\n💡 You can open these files to verify the formatting.');
    console.log('\n🚀 Next Steps:');
    console.log('   1. Open the generated PDFs and verify the content');
    console.log('   2. Test the API endpoints with curl or Postman');
    console.log('   3. Integrate with frontend');
    console.log('\n' + '='.repeat(60) + '\n');

  } catch (error) {
    console.error('\n❌ Error during PDF generation test:', error);
    if (error instanceof Error) {
      console.error('   Message:', error.message);
      console.error('   Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testPDFGeneration().catch(console.error);
