#!/bin/bash

# STELLARION Profile API Test Script
# This script tests the basic functionality of the new profile APIs

BASE_URL="http://localhost:5000"
echo "🚀 Testing STELLARION Profile APIs at $BASE_URL"
echo "================================================"

# Test 1: Health Check
echo "🔍 Test 1: Health Check"
curl -s "$BASE_URL/health" | jq '.'
echo ""
echo ""

# Test 2: Test User Registration (no auth required)
echo "🔍 Test 2: Test User Registration"
curl -s -X POST "$BASE_URL/api/user/test-register" \
  -H "Content-Type: application/json" \
  -d '{
    "firebaseUser": {
      "uid": "test-profile-user-456",
      "email": "profiletest@stellarion.com"
    }
  }' | jq '.'
echo ""
echo ""

# Note: The following tests require a valid Firebase JWT token
echo "📝 Note: Tests 3+ require a valid Firebase JWT token"
echo "     Set FIREBASE_TOKEN environment variable to test authenticated endpoints"
echo "     Example: export FIREBASE_TOKEN='your_firebase_jwt_token_here'"
echo ""

if [ ! -z "$FIREBASE_TOKEN" ]; then
  echo "🔍 Test 3: Get User Profile (with auth)"
  curl -s -H "Authorization: Bearer $FIREBASE_TOKEN" \
    "$BASE_URL/api/user/profile" | jq '.'
  echo ""
  echo ""

  echo "🔍 Test 4: Update User Profile (with auth)"
  curl -s -X PUT "$BASE_URL/api/user/profile" \
    -H "Authorization: Bearer $FIREBASE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "first_name": "Test",
      "last_name": "User",
      "display_name": "TestAstronomer",
      "profile_data": {
        "bio": "Test user for API validation",
        "astronomy_experience": "beginner",
        "telescope_owned": false
      }
    }' | jq '.'
  echo ""
  echo ""

  echo "🔍 Test 5: Get User Settings (with auth)"
  curl -s -H "Authorization: Bearer $FIREBASE_TOKEN" \
    "$BASE_URL/api/user/settings" | jq '.'
  echo ""
  echo ""

  echo "🔍 Test 6: Update User Settings (with auth)"
  curl -s -X PUT "$BASE_URL/api/user/settings" \
    -H "Authorization: Bearer $FIREBASE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "language": "en",
      "theme": "dark",
      "profile_visibility": "public"
    }' | jq '.'
  echo ""
  echo ""

  echo "🔍 Test 7: Request Role Upgrade (with auth)"
  curl -s -X POST "$BASE_URL/api/user/role-upgrade" \
    -H "Authorization: Bearer $FIREBASE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{
      "requested_role": "mentor",
      "reason": "Test role upgrade request",
      "supporting_evidence": ["Test evidence"]
    }' | jq '.'
  echo ""
  echo ""

  echo "🔍 Test 8: Get Role Upgrade Status (with auth)"
  curl -s -H "Authorization: Bearer $FIREBASE_TOKEN" \
    "$BASE_URL/api/user/role-upgrade/status" | jq '.'
  echo ""
  echo ""
else
  echo "⚠️  Skipping authenticated tests - FIREBASE_TOKEN not set"
fi

echo "✅ API Testing Complete!"
echo ""
echo "📚 For complete API documentation, see:"
echo "   - profile_api.md"
echo "   - PROFILE_IMPLEMENTATION.md"
echo "   - test-profile-apis.postman_collection.json"
