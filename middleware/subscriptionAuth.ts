import { Request, Response, NextFunction } from 'express';
import db from '../db';
import { SubscriptionPlan } from '../types';

// Interface for the custom request with user info
interface AuthenticatedRequest extends Request {
    user?: {
        uid: string;
        email: string;
        user_id: number;
    };
}

// Features that require paid subscription
const PAID_FEATURES = {
    intermediate_lessons: ['galaxy_explorer', 'cosmic_voyager'],
    advanced_lessons: ['cosmic_voyager'],
    unlimited_chatbot: ['galaxy_explorer', 'cosmic_voyager'],
    tutor_sessions: ['cosmic_voyager'],
    night_camps: ['galaxy_explorer', 'cosmic_voyager'],
    priority_access: ['cosmic_voyager'],
    early_access: ['cosmic_voyager'],
    feature_requests: ['cosmic_voyager']
};

// Middleware to check if user has access to a specific feature
export const requireSubscription = (feature: keyof typeof PAID_FEATURES) => {
    return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        try {
            if (!req.user?.user_id) {
                return res.status(401).json({
                    success: false,
                    message: 'Authentication required'
                });
            }

            const user_id = req.user.user_id;

            // Get user's subscription details
            const result = await db.query(
                `SELECT 
                    subscription_plan, 
                    subscription_status, 
                    subscription_end_date
                 FROM users 
                 WHERE id = $1`,
                [user_id]
            );

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }

            const user = result.rows[0];
            const requiredPlans = PAID_FEATURES[feature];

            // Check if user's plan includes the required feature
            if (!requiredPlans.includes(user.subscription_plan)) {
                return res.status(403).json({
                    success: false,
                    message: 'This feature requires a paid subscription',
                    feature,
                    currentPlan: user.subscription_plan,
                    requiredPlans,
                    upgradeUrl: '/subscription/plans'
                });
            }

            // Check if subscription is active (for paid plans)
            if (user.subscription_plan !== 'starseeker') {
                if (user.subscription_status !== 'active') {
                    return res.status(403).json({
                        success: false,
                        message: 'Your subscription is not active',
                        currentPlan: user.subscription_plan,
                        status: user.subscription_status,
                        upgradeUrl: '/subscription/plans'
                    });
                }

                // Check if subscription has expired
                if (user.subscription_end_date && new Date(user.subscription_end_date) < new Date()) {
                    return res.status(403).json({
                        success: false,
                        message: 'Your subscription has expired',
                        currentPlan: user.subscription_plan,
                        expiredDate: user.subscription_end_date,
                        upgradeUrl: '/subscription/plans'
                    });
                }
            }

            next();
        } catch (error) {
            console.error('Error checking subscription access:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to verify subscription access'
            });
        }
    };
};

// Middleware to check chatbot access and usage
export const checkChatbotAccess = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // EMERGENCY BYPASS for subscription check
    console.log('🚨 [EMERGENCY BYPASS] Skipping subscription check');
    next();
    return;
    
    // Original subscription check code (commented out for emergency bypass)
    /*
    try {
        // TEMPORARY: Allow bypass for development testing
        if (process.env.NODE_ENV === 'development' && req.headers['x-test-bypass'] === 'true') {
            console.log('🧪 [DEV] Bypassing chatbot access check for test');
            
            // Mock chatbot usage for test
            req.body.chatbotUsage = {
                questionsUsed: 0,
                questionsLimit: -1, // Unlimited for test
                plan: 'galaxy_explorer'
            };
            
            next();
            return;
        }

        if (!req.user?.user_id) {
            res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
            return;
        }

        const user_id = req.user.user_id;

        // Get user's chatbot usage
        const result = await db.query(
            `SELECT 
                u.subscription_plan,
                u.chatbot_questions_used,
                u.chatbot_questions_reset_date,
                sp.chatbot_questions_limit
             FROM users u
             LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
             WHERE u.id = $1`,
            [user_id]
        );

        if (result.rows.length === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found'
            });
            return;
        }

        const user = result.rows[0];
        const today = new Date().toISOString().split('T')[0];

        // Reset questions if new day
        if (user.chatbot_questions_reset_date !== today) {
            await db.query(
                'UPDATE users SET chatbot_questions_used = 0, chatbot_questions_reset_date = $1 WHERE id = $2',
                [today, user_id]
            );
            user.chatbot_questions_used = 0;
        }

        // Check if user has reached their limit
        if (user.chatbot_questions_limit !== -1 && user.chatbot_questions_used >= user.chatbot_questions_limit) {
            res.status(403).json({
                success: false,
                message: 'Daily chatbot question limit reached',
                questionsUsed: user.chatbot_questions_used,
                questionsLimit: user.chatbot_questions_limit,
                plan: user.subscription_plan,
                upgradeUrl: '/subscription/plans'
            });
            return;
        }

        // Add usage info to request for use in the controller
        req.body.chatbotUsage = {
            questionsUsed: user.chatbot_questions_used,
            questionsLimit: user.chatbot_questions_limit,
            plan: user.subscription_plan
        };

        next();
    } catch (error) {
        console.error('Error checking chatbot access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to verify chatbot access'
        });
    }
};

// Middleware to get subscription info and add to request
export const addSubscriptionInfo = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.user?.user_id) {
            return next(); // Skip if no user, let other middleware handle auth
        }

        const user_id = req.user.user_id;

        const result = await db.query(
            `SELECT 
                u.subscription_plan,
                u.subscription_status,
                u.subscription_start_date,
                u.subscription_end_date,
                sp.name as plan_name,
                sp.features
             FROM users u
             LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
             WHERE u.id = $1`,
            [user_id]
        );

        if (result.rows.length > 0) {
            req.body.subscriptionInfo = result.rows[0];
        }

        next();
    } catch (error) {
        console.error('Error adding subscription info:', error);
        next(); // Continue anyway, subscription info is optional
    }
    */ // End of commented out code
};
