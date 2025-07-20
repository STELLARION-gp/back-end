import { Request, Response } from 'express';
import db from '../db';
import { 
    SubscriptionPlan, 
    SubscriptionStatus, 
    PaymentStatus, 
    SubscriptionPlanDetails,
    Subscription,
    Payment 
} from '../types';

// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = async (firebase_uid: string): Promise<number | null> => {
    try {
        const result = await db.query('SELECT id FROM users WHERE firebase_uid = $1', [firebase_uid]);
        return result.rows.length > 0 ? result.rows[0].id : null;
    } catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
};

// Localized plan data
const planTranslations = {
    en: {
        starseeker: {
            name: 'StarSeeker Plan',
            description: 'For curious learners, students, or casual space lovers starting their astronomy journey.',
            features: [
                'Access to basic astronomy lessons',
                'Daily NASA photo feed',
                'Monthly celestial event calendar',
                'Access to discussion forums',
                'Limited access to AI chatbot (3 questions/day)'
            ]
        },
        galaxy_explorer: {
            name: 'Galaxy Explorer Plan',
            description: 'For hobbyists, school students, teachers, and astronomy enthusiasts looking for more depth.',
            features: [
                'Access to basic and intermediate astronomy lessons',
                'Daily NASA photo feed',
                'Monthly celestial event calendar',
                'Access to discussion forums',
                'Access to intermediate lessons & quizzes',
                'Unlimited AI chatbot questions',
                'RSVP to night camps & workshops'
            ]
        },
        cosmic_voyager: {
            name: 'Cosmic Voyager Plan',
            description: 'For advanced learners, educators, astro-nerds, and families wanting the full immersive experience.',
            features: [
                'Access to basic, intermediate, advanced astronomy lessons & certifications',
                'Daily NASA photo feed',
                'Monthly celestial event calendar',
                'Access to discussion forums',
                'Access to intermediate lessons & quizzes',
                'Unlimited AI chatbot questions',
                'RSVP to night camps & workshops',
                '1-on-1 tutor sessions',
                'Priority access to exclusive night camps',
                'Early access to new features',
                'Feature request priority'
            ]
        }
    },
    sin: {
        starseeker: {
            name: 'ස්ටාර්සීකර් සැලැස්ම',
            description: 'කුතුහලයෙන් ඉගෙන ගන්නන්, ශිෂ්‍යයන්, හෝ තම තාරකා විද්‍යා ගමන ආරම්භ කරන අකාශ ආදරකරුවන් සඳහා.',
            features: [
                'මූලික තාරකා විද්‍යා පාඩම් වලට ප්‍රවේශය',
                'දෛනික NASA ඡායාරූප සංග්‍රහය',
                'මාසික ආකාශ සිදුවීම් දින දර්ශනය',
                'සාකච්ඡා සභාගම් වලට ප්‍රවේශය',
                'AI චැට්බොට් වලට සීමිත ප්‍රවේශය (දිනකට ප්‍රශ්න 3)'
            ]
        },
        galaxy_explorer: {
            name: 'ගැලක්සි එක්ස්ප්ලෝරර් සැලැස්ම',
            description: 'විනෝදාංශකරුවන්, පාසල් සිසුන්, ගුරුවරුන්, සහ වැඩි ගැඹුරු සොයන තාරකා විද්‍යා ලෝලීන් සඳහා.',
            features: [
                'මූලික සහ මධ්‍යම තාරකා විද්‍යා පාඩම් වලට ප්‍රවේශය',
                'දෛනික NASA ඡායාරූප සංග්‍රහය',
                'මාසික ආකාශ සිදුවීම් දින දර්ශනය',
                'සාකච්ඡා සභාගම් වලට ප්‍රවේශය',
                'මධ්‍යම පාඩම් සහ ප්‍රශ්නාවලි වලට ප්‍රවේශය',
                'AI චැට්බොට් ප්‍රශ්න අසීමිතයි',
                'රාත්‍රී කඳවුරු සහ වැඩමුළු වලට RSVP'
            ]
        },
        cosmic_voyager: {
            name: 'කොස්මික් වොයේජර් සැලැස්ම',
            description: 'උසස් ඉගෙනුම්කරුවන්, අධ්‍යාපනවේදීන්, තාරකා විද්‍යා ප්‍රේමීන්, සහ සම්පූර්ණ විස්මිත අත්දැකීම් අවශ්‍ය පවුල් සඳහා.',
            features: [
                'මූලික, මධ්‍යම, උසස් තාරකා විද්‍යා පාඩම් සහ සහතික වලට ප්‍රවේශය',
                'දෛනික NASA ඡායාරූප සංග්‍රහය',
                'මාසික ආකාශ සිදුවීම් දින දර්ශනය',
                'සාකච්ඡා සභාගම් වලට ප්‍රවේශය',
                'මධ්‍යම පාඩම් සහ ප්‍රශ්නාවලි වලට ප්‍රවේශය',
                'AI චැට්බොට් ප්‍රශ්න අසීමිතයි',
                'රාත්‍රී කඳවුරු සහ වැඩමුළු වලට RSVP',
                '1-සිට-1 ගුරු සැසි',
                'සුවිශේෂී රාත්‍රී කඳවුරු වලට ප්‍රමුඛතා ප්‍රවේශය',
                'නව විශේෂාංග වලට මුල් ප්‍රවේශය',
                'විශේෂාංග ඉල්ලීම් ප්‍රමුඛතාව'
            ]
        }
    },
    ta: {
        starseeker: {
            name: 'ஸ்டார்சீக்கர் திட்டம்',
            description: 'ஆர்வமுள்ள கற்றவர்கள், மாணவர்கள், அல்லது தங்கள் வானியல் பயணத்தைத் தொடங்கும் விண்வெளி காதலர்களுக்கு.',
            features: [
                'அடிப்படை வானியல் பாடங்களுக்கான அணுகல்',
                'தினசரி NASA புகைப்பட ஊட்டம்',
                'மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி',
                'விவாத மன்றங்களுக்கான அணுகல்',
                'AI சாட்பாட்டுக்கு வரையறுக்கப்பட்ட அணுகல் (ஒரு நாளைக்கு 3 கேள்விகள்)'
            ]
        },
        galaxy_explorer: {
            name: 'கேலக்ஸி எக்ஸ்ப்ளோரர் திட்டம்',
            description: 'பொழுதுபோக்காளர்கள், பள்ளி மாணவர்கள், ஆசிரியர்கள், மற்றும் அதிக ஆழத்தைத் தேடும் வானியல் ஆர்வலர்களுக்கு.',
            features: [
                'அடிப்படை மற்றும் இடைநிலை வானியல் பாடங்களுக்கான அணுகல்',
                'தினசரி NASA புகைப்பட ஊட்டம்',
                'மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி',
                'விவாத மன்றங்களுக்கான அணுகல்',
                'இடைநிலை பாடங்கள் மற்றும் வினாடி வினாக்களுக்கான அணுகல்',
                'வரம்பற்ற AI சாட்பாட் கேள்விகள்',
                'இரவு முகாம்கள் மற்றும் பட்டறைகளுக்கு RSVP'
            ]
        },
        cosmic_voyager: {
            name: 'காஸ்மிக் வாயேஜர் திட்டம்',
            description: 'மேம்பட்ட கற்றுக்கொள்பவர்கள், கல்வியாளர்கள், வானியல் ஆர்வலர்கள், மற்றும் முழு அனுபவத்தை விரும்பும் குடும்பங்களுக்கு.',
            features: [
                'அடிப்படை, இடைநிலை, மேம்பட்ட வானியல் பாடங்கள் மற்றும் சான்றிதழ்களுக்கான அணுகல்',
                'தினசரி NASA புகைப்பட ஊட்டம்',
                'மாதாந்திர வானியல் நிகழ்வு நாட்காட்டி',
                'விவாத மன்றங்களுக்கான அணுகல்',
                'இடைநிலை பாடங்கள் மற்றும் வினாடி வினாக்களுக்கான அணுகல்',
                'வரம்பற்ற AI சாட்பாட் கேள்விகள்',
                'இரவு முகாம்கள் மற்றும் பட்டறைகளுக்கு RSVP',
                '1-க்கு-1 ஆசிரியர் அமர்வுகள்',
                'பிரத்யேக இரவு முகாம்களுக்கு முன்னுரிமை அணுகல்',
                'புதிய அம்சங்களுக்கு முன்கூட்டியே அணுகல்',
                'அம்சம் கோரிக்கை முன்னுரிமை'
            ]
        }
    }
};

// Get all subscription plans
export const getSubscriptionPlans = async (req: Request, res: Response) => {
    try {
        const { lang = 'en' } = req.query;
        const result = await db.query(
            'SELECT * FROM subscription_plans WHERE is_active = true ORDER BY price_lkr ASC'
        );
        
        // Add localized content if requested
        const plans = result.rows.map(plan => {
            const translations = planTranslations[lang as keyof typeof planTranslations];
            if (translations && translations[plan.plan_type as keyof typeof translations]) {
                const localizedPlan = translations[plan.plan_type as keyof typeof translations];
                return {
                    ...plan,
                    localized_name: localizedPlan.name,
                    localized_description: localizedPlan.description,
                    localized_features: localizedPlan.features
                };
            }
            return plan;
        });
        
        res.json({
            success: true,
            data: plans
        });
    } catch (error) {
        console.error('Error fetching subscription plans:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription plans'
        });
    }
};

// Get user's current subscription
export const getUserSubscription = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        
        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }
        
        const userResult = await db.query(
            `SELECT 
                u.subscription_plan, 
                u.subscription_status, 
                u.subscription_start_date, 
                u.subscription_end_date,
                u.auto_renew,
                u.chatbot_questions_used,
                u.chatbot_questions_reset_date,
                sp.name as plan_name,
                sp.description as plan_description,
                sp.price_lkr,
                sp.features,
                sp.chatbot_questions_limit
             FROM users u
             LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
             WHERE u.id = $1`,
            [actualUserId]
        );

        if (userResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = userResult.rows[0];
        
        // Check if chatbot questions need to be reset (daily reset)
        const today = new Date().toISOString().split('T')[0];
        if (user.chatbot_questions_reset_date !== today) {
            await db.query(
                'UPDATE users SET chatbot_questions_used = 0, chatbot_questions_reset_date = $1 WHERE id = $2',
                [today, actualUserId]
            );
            user.chatbot_questions_used = 0;
        }

        res.json({
            success: true,
            data: user
        });
    } catch (error) {
        console.error('Error fetching user subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch user subscription'
        });
    }
};

// Update user subscription plan
export const updateUserSubscription = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const { plan_type, auto_renew = false } = req.body;

        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }

        // Validate plan type
        const validPlans: SubscriptionPlan[] = ['starseeker', 'galaxy_explorer', 'cosmic_voyager'];
        if (!validPlans.includes(plan_type)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid subscription plan'
            });
        }

        // Check if user exists
        const userCheck = await db.query('SELECT id FROM users WHERE id = $1', [actualUserId]);
        if (userCheck.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        // Calculate subscription dates
        const startDate = new Date();
        let endDate = null;
        
        if (plan_type !== 'starseeker') {
            endDate = new Date();
            endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        }

        // Update user subscription
        await db.query(
            `UPDATE users 
             SET subscription_plan = $1, 
                 subscription_status = 'active',
                 subscription_start_date = $2,
                 subscription_end_date = $3,
                 auto_renew = $4,
                 chatbot_questions_used = 0,
                 chatbot_questions_reset_date = CURRENT_DATE,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $5`,
            [plan_type, startDate, endDate, auto_renew, actualUserId]
        );

        // Create subscription record
        await db.query(
            `INSERT INTO subscriptions (user_id, plan_type, status, start_date, end_date, auto_renew)
             VALUES ($1, $2, 'active', $3, $4, $5)`,
            [actualUserId, plan_type, startDate, endDate, auto_renew]
        );

        res.json({
            success: true,
            message: 'Subscription updated successfully'
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update subscription'
        });
    }
};

// Cancel user subscription
export const cancelSubscription = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;
        const { cancellation_reason } = req.body;

        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }

        // Update user to StarSeeker (free) plan
        await db.query(
            `UPDATE users 
             SET subscription_plan = 'starseeker',
                 subscription_status = 'cancelled',
                 auto_renew = false,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $1`,
            [actualUserId]
        );

        // Update current subscription record
        await db.query(
            `UPDATE subscriptions 
             SET status = 'cancelled',
                 cancelled_at = CURRENT_TIMESTAMP,
                 cancellation_reason = $2,
                 updated_at = CURRENT_TIMESTAMP
             WHERE user_id = $1 AND status = 'active'`,
            [actualUserId, cancellation_reason]
        );

        res.json({
            success: true,
            message: 'Subscription cancelled successfully'
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to cancel subscription'
        });
    }
};

// Check if user can use chatbot
export const checkChatbotAccess = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }

        const result = await db.query(
            `SELECT 
                u.subscription_plan,
                u.chatbot_questions_used,
                u.chatbot_questions_reset_date,
                sp.chatbot_questions_limit
             FROM users u
             LEFT JOIN subscription_plans sp ON u.subscription_plan = sp.plan_type
             WHERE u.id = $1`,
            [actualUserId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        const user = result.rows[0];
        const today = new Date().toISOString().split('T')[0];

        // Reset questions if new day
        if (user.chatbot_questions_reset_date !== today) {
            await db.query(
                'UPDATE users SET chatbot_questions_used = 0, chatbot_questions_reset_date = $1 WHERE id = $2',
                [today, actualUserId]
            );
            user.chatbot_questions_used = 0;
        }

        // Check access
        const canUse = user.chatbot_questions_limit === -1 || 
                      user.chatbot_questions_used < user.chatbot_questions_limit;

        res.json({
            success: true,
            data: {
                canUse,
                questionsUsed: user.chatbot_questions_used,
                questionsLimit: user.chatbot_questions_limit,
                plan: user.subscription_plan
            }
        });
    } catch (error) {
        console.error('Error checking chatbot access:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to check chatbot access'
        });
    }
};

// Increment chatbot usage
export const incrementChatbotUsage = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }

        await db.query(
            'UPDATE users SET chatbot_questions_used = chatbot_questions_used + 1 WHERE id = $1',
            [actualUserId]
        );

        res.json({
            success: true,
            message: 'Chatbot usage incremented'
        });
    } catch (error) {
        console.error('Error incrementing chatbot usage:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to increment chatbot usage'
        });
    }
};

// Get subscription history
export const getSubscriptionHistory = async (req: Request, res: Response) => {
    try {
        const { user_id } = req.params;

        // Convert Firebase UID to integer user_id if needed
        let actualUserId: number;
        if (isNaN(Number(user_id))) {
            // user_id is Firebase UID, convert to integer
            const convertedId = await getUserIdFromFirebaseUID(user_id);
            if (!convertedId) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found'
                });
            }
            actualUserId = convertedId;
        } else {
            actualUserId = Number(user_id);
        }

        const result = await db.query(
            `SELECT 
                s.*,
                sp.name as plan_name,
                sp.price_lkr
             FROM subscriptions s
             LEFT JOIN subscription_plans sp ON s.plan_type = sp.plan_type
             WHERE s.user_id = $1
             ORDER BY s.created_at DESC`,
            [actualUserId]
        );

        res.json({
            success: true,
            data: result.rows
        });
    } catch (error) {
        console.error('Error fetching subscription history:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch subscription history'
        });
    }
};
