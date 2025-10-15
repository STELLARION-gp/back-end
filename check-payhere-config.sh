#!/bin/bash

# PayHere Configuration Checker
echo "🔍 STELLARION PayHere Configuration Checker"
echo "============================================"
echo ""

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "❌ .env file not found!"
    echo "Please create a .env file based on .env.example"
    exit 1
fi

echo "✅ .env file found"
echo ""

# Check required PayHere variables
echo "📋 Checking PayHere Configuration:"
echo ""

check_var() {
    var_name=$1
    var_value=$(grep "^$var_name=" .env | cut -d '=' -f2)
    
    if [ -z "$var_value" ]; then
        echo "❌ $var_name: NOT SET"
        return 1
    else
        # Mask sensitive values
        if [[ $var_name == *"SECRET"* ]]; then
            masked_value="${var_value:0:10}..."
            echo "✅ $var_name: $masked_value"
        else
            echo "✅ $var_name: $var_value"
        fi
        return 0
    fi
}

# Check all required variables
missing=0

check_var "PAYHERE_MERCHANT_ID" || ((missing++))
check_var "PAYHERE_MERCHANT_SECRET" || ((missing++))
check_var "PAYHERE_SANDBOX" || ((missing++))
check_var "PAYHERE_RETURN_URL" || ((missing++))
check_var "PAYHERE_CANCEL_URL" || ((missing++))
check_var "PAYHERE_NOTIFY_URL" || ((missing++))

echo ""

if [ $missing -gt 0 ]; then
    echo "❌ $missing required variable(s) missing!"
    echo ""
    echo "Add the following to your .env file:"
    echo "PAYHERE_NOTIFY_URL=http://localhost:5000/api/payments/notify"
    exit 1
fi

echo "✅ All PayHere configuration variables are set!"
echo ""

# Decode and verify merchant secret
echo "🔐 Verifying Merchant Secret:"
merchant_secret=$(grep "^PAYHERE_MERCHANT_SECRET=" .env | cut -d '=' -f2)

# Try to decode from Base64
decoded=$(echo "$merchant_secret" | base64 -d 2>/dev/null)
if [ $? -eq 0 ] && [ ! -z "$decoded" ]; then
    echo "✅ Merchant secret is Base64 encoded"
    echo "   Decoded value: ${decoded:0:20}... (first 20 chars)"
else
    echo "⚠️  Merchant secret is not Base64 encoded (or decoding failed)"
    echo "   Will use as-is"
fi

echo ""

# Check if backend is running
echo "🌐 Checking Backend Server:"
if curl -s http://localhost:5000/health > /dev/null 2>&1; then
    echo "✅ Backend is running on http://localhost:5000"
    
    # Try to get health status
    health=$(curl -s http://localhost:5000/health)
    echo "   Status: $health"
else
    echo "❌ Backend is not running on http://localhost:5000"
    echo "   Start it with: npm run dev"
fi

echo ""

# Check PayHere endpoints
echo "🔌 Checking Payment Endpoints:"
echo "   Create Order: POST http://localhost:5000/api/payments/create-order (Protected)"
echo "   Notification: POST http://localhost:5000/api/payments/notify (Public)"
echo "   Alt Notify:   POST http://localhost:5000/api/payments/payhere/notify (Public)"

echo ""

# Provide testing instructions
echo "📝 Testing Instructions:"
echo ""
echo "1. Start backend: npm run dev"
echo "2. Open test page: http://localhost:5000/public/payhere-test-fixed.html"
echo "3. Use test card: 4916 2175 0161 1292 (Success)"
echo "4. Check backend logs for detailed payment flow"
echo ""
echo "For local testing with PayHere notifications:"
echo "   1. Install ngrok: brew install ngrok"
echo "   2. Run: ngrok http 5000"
echo "   3. Update PAYHERE_NOTIFY_URL with ngrok URL"
echo "   4. Restart backend"
echo ""
echo "✨ Configuration check complete!"
