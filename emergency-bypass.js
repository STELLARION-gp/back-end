// emergency-bypass.js - Pure JavaScript version to avoid TypeScript compilation issues
const emergencyBypass = (req, res, next) => {
  console.log('🚨 [EMERGENCY BYPASS JS] Skipping ALL authentication checks');
  console.log('📍 [DEBUG] Request path:', req.path);
  console.log('📍 [DEBUG] Request method:', req.method);
  
  // Mock user for ALL requests - REMOVE IN PRODUCTION!
  req.user = {
    uid: 'emergency-bypass-js',
    email: 'abeywickramairumi@gmail.com',
    user_id: 1
  };
  
  req.body = req.body || {};
  req.body.user = {
    id: 1,
    firebase_uid: 'emergency-bypass-js',
    email: 'abeywickramairumi@gmail.com',
    role: 'learner',
    subscription_plan: 'galaxy_explorer',
    is_active: true
  };

  // Mock chatbot usage for subscription check
  req.body.chatbotUsage = {
    questionsUsed: 0,
    questionsLimit: -1, // Unlimited
    plan: 'galaxy_explorer'
  };
  
  next();
};

module.exports = { emergencyBypass };
