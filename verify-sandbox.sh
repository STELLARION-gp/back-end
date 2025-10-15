#!/bin/bash

echo "🔍 PayHere Sandbox Configuration Verifier"
echo "=========================================="
echo ""

# Check if backend is in sandbox mode
if grep -q "PAYHERE_SANDBOX=true" .env 2>/dev/null; then
    echo "✅ SANDBOX MODE: Enabled"
    echo "   Hash Format: MD5(merchant_id + order_id + amount + currency + merchant_id)"
    echo ""
else
    echo "⚠️  PRODUCTION MODE or SANDBOX not set"
    echo "   For testing, ensure .env has: PAYHERE_SANDBOX=true"
    echo ""
fi

# Check merchant ID
merchant_id=$(grep "^PAYHERE_MERCHANT_ID=" .env 2>/dev/null | cut -d '=' -f2)
if [ "$merchant_id" = "1231282" ]; then
    echo "✅ MERCHANT ID: $merchant_id (PayHere Sandbox)"
else
    echo "⚠️  MERCHANT ID: $merchant_id (Not standard sandbox ID)"
fi

echo ""
echo "📋 Test Hash Generation:"
echo "   Run: node test-sandbox-hash.js"
echo ""
echo "🚀 Start Backend:"
echo "   Run: npm run dev"
echo ""
echo "🧪 Test Payment:"
echo "   URL: http://localhost:5000/public/payhere-test-fixed.html"
echo "   Card: 4916 2175 0161 1292"
echo ""
echo "✨ Ready to test!"
