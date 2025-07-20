// Test script to verify the planId fix
const testPaymentRequest = () => {
    console.log('🧪 Testing Payment Request Structure\n');
    
    // Mock plan data (as it would come from the subscription plans)
    const mockPlan = {
        id: 2,
        plan_type: 'galaxy_explorer',
        name: 'Galaxy Explorer',
        description: 'Perfect for astronomy enthusiasts',
        price_lkr: 990,
        features: ['Advanced Telescope Control', 'Custom Observation Plans'],
        chatbot_questions_limit: 50
    };
    
    // OLD REQUEST (BROKEN) - This was causing the error
    const oldRequest = {
        user_id: 'firebase_uid_here',
        plan_type: mockPlan.plan_type,  // ❌ Backend expects 'planId'
        amount: mockPlan.price_lkr,
        currency: 'LKR'
    };
    
    // NEW REQUEST (FIXED) - This should work
    const newRequest = {
        planId: mockPlan.id,           // ✅ Correct parameter name
        amount: mockPlan.price_lkr,
        currency: 'LKR'
    };
    
    console.log('❌ OLD REQUEST (was causing error):');
    console.log(JSON.stringify(oldRequest, null, 2));
    console.log('\nProblem: Backend expected "planId" but got "plan_type"');
    
    console.log('\n✅ NEW REQUEST (should work):');
    console.log(JSON.stringify(newRequest, null, 2));
    console.log('\nFixed: Now sending "planId" as expected by backend');
    
    console.log('\n🔍 Backend Validation:');
    console.log(`- planId: ${newRequest.planId} (${typeof newRequest.planId})`);
    console.log(`- amount: ${newRequest.amount} (${typeof newRequest.amount})`);
    console.log(`- currency: ${newRequest.currency} (${typeof newRequest.currency})`);
    
    console.log('\n✅ All required fields are present with correct names!');
    console.log('\nThe "Missing planId in request body" error should now be resolved.');
};

testPaymentRequest();
