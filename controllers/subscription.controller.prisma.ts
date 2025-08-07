import { Request, Response } from 'express';
import { PrismaClient } from '../prisma/generated/client';
import {
    SubscriptionPlan,
    SubscriptionStatus,
    PaymentStatus,
    SubscriptionPlanDetails,
    Subscription,
    Payment
} from '../types';

const prisma = new PrismaClient();

// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = async (firebase_uid: string): Promise<number | null> => {
    try {
        const user = await prisma.users.findFirst({
            where: {
                firebase_uid
            },
            select: {
                id: true
            }
        });
        return user ? user.id : null;
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
            description: 'For passionate astronomers, advanced students, teachers and professionals who want complete access.',
            features: [
                'Access to ALL astronomy lessons (basic to advanced)',
                'Daily NASA photo feed',
                'Monthly celestial event calendar',
                'Access to discussion forums',
                'All lessons & quizzes including advanced content',
                'Unlimited AI chatbot questions',
                'Early access to night camps & workshops',
                'Invitation to private astronomy events',
                'Monthly online session with astronomy expert'
            ]
        }
    }
};

// Get all subscription plans
export const getSubscriptionPlans = async (req: Request, res: Response): Promise<void> => {
    try {
        const plans = await prisma.subscription_plans.findMany({
            where: {
                is_active: true
            }
        });

        // Add localized names and descriptions
        const lang = (req.query.lang as string) || 'en';
        const localizedPlans = plans.map(plan => {
            const planType = plan.plan_type;
            const translations = planTranslations[lang as keyof typeof planTranslations] || planTranslations.en;
            const planDetails = translations[planType as keyof typeof translations] || {} as any;

            return {
                ...plan,
                name: planDetails.name || plan.name,
                description: planDetails.description || plan.description,
                features: planDetails.features || (plan.features as string[])
            };
        });

        res.json({
            success: true,
            message: "Subscription plans retrieved successfully",
            data: localizedPlans
        });
    } catch (error) {
        console.error('Error retrieving subscription plans:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve subscription plans",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get subscription plan by type
export const getSubscriptionPlanByType = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type } = req.params;

        const plan = await prisma.subscription_plans.findUnique({
            where: {
                plan_type: type as SubscriptionPlan
            }
        });

        if (!plan) {
            res.status(404).json({
                success: false,
                message: "Subscription plan not found"
            });
            return;
        }

        // Add localized names and descriptions
        const lang = (req.query.lang as string) || 'en';
        const translations = planTranslations[lang as keyof typeof planTranslations] || planTranslations.en;
        const planDetails = translations[type as keyof typeof translations] || {} as any;

        const localizedPlan = {
            ...plan,
            name: planDetails.name || plan.name,
            description: planDetails.description || plan.description,
            features: planDetails.features || (plan.features as string[])
        };

        res.json({
            success: true,
            message: "Subscription plan retrieved successfully",
            data: localizedPlan
        });
    } catch (error) {
        console.error('Error retrieving subscription plan:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve subscription plan",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get user's current subscription
export const getCurrentSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUID(firebaseUser.uid);

        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Get the latest active subscription
        const subscription = await prisma.subscriptions.findFirst({
            where: {
                user_id: userId,
                status: { in: ['active', 'pending'] }
            },
            orderBy: {
                created_at: 'desc'
            },
            include: {
                payments: {
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 1
                }
            }
        });

        if (!subscription) {
            // Get user's current subscription info from users table
            const user = await prisma.users.findUnique({
                where: { id: userId },
                select: {
                    subscription_plan: true,
                    subscription_status: true,
                    subscription_start_date: true,
                    subscription_end_date: true,
                    auto_renew: true
                }
            });

            // Get plan details
            const plan = await prisma.subscription_plans.findUnique({
                where: { plan_type: user?.subscription_plan || 'starseeker' }
            });

            const subscriptionData = {
                id: null,
                user_id: userId,
                plan_type: user?.subscription_plan || 'starseeker',
                status: user?.subscription_status || 'active',
                start_date: user?.subscription_start_date || new Date(),
                end_date: user?.subscription_end_date,
                auto_renew: user?.auto_renew || false,
                plan_details: plan || null,
                latest_payment: null
            };

            res.json({
                success: true,
                message: "Current subscription retrieved",
                data: subscriptionData
            });
            return;
        }

        // Get plan details
        const plan = await prisma.subscription_plans.findUnique({
            where: { plan_type: subscription.plan_type }
        });

        const subscriptionData = {
            ...subscription,
            plan_details: plan,
            latest_payment: subscription.payments.length > 0 ? subscription.payments[0] : null
        };

        res.json({
            success: true,
            message: "Current subscription retrieved",
            data: subscriptionData
        });
    } catch (error) {
        console.error('Error retrieving current subscription:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve current subscription",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get subscription history
export const getSubscriptionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUID(firebaseUser.uid);

        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Get all subscriptions
        const subscriptions = await prisma.subscriptions.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                created_at: 'desc'
            },
            include: {
                payments: true
            }
        });

        // Get plan details for each subscription
        const subscriptionsWithPlans = await Promise.all(subscriptions.map(async (sub) => {
            const plan = await prisma.subscription_plans.findUnique({
                where: { plan_type: sub.plan_type }
            });

            return {
                ...sub,
                plan_details: plan
            };
        }));

        res.json({
            success: true,
            message: "Subscription history retrieved",
            data: subscriptionsWithPlans
        });
    } catch (error) {
        console.error('Error retrieving subscription history:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve subscription history",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Create a new subscription
export const createSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUID(firebaseUser.uid);

        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        const { plan_type, auto_renew = false, duration_months = 1 } = req.body;

        // Check if plan exists
        const plan = await prisma.subscription_plans.findUnique({
            where: { plan_type: plan_type as SubscriptionPlan }
        });

        if (!plan) {
            res.status(404).json({
                success: false,
                message: "Subscription plan not found"
            });
            return;
        }

        // Calculate end date
        const startDate = new Date();
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + duration_months);

        // Create subscription with Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            // Create subscription
            const subscription = await tx.subscriptions.create({
                data: {
                    user_id: userId,
                    plan_type: plan_type as SubscriptionPlan,
                    status: 'pending' as SubscriptionStatus,
                    start_date: startDate,
                    end_date: endDate,
                    auto_renew
                }
            });

            // Create payment record
            const payment = await tx.payments.create({
                data: {
                    user_id: userId,
                    subscription_id: subscription.id,
                    amount: plan.price_lkr,
                    currency: 'LKR',
                    payment_status: 'pending' as PaymentStatus,
                    payment_method: 'payhere',
                    payment_gateway: 'payhere',
                    metadata: {}
                }
            });

            // Update user table with subscription info
            const user = await tx.users.update({
                where: { id: userId },
                data: {
                    subscription_plan: plan_type as SubscriptionPlan,
                    subscription_status: 'pending',
                    subscription_start_date: startDate,
                    subscription_end_date: endDate,
                    auto_renew
                }
            });

            return { subscription, payment, user };
        });

        res.json({
            success: true,
            message: "Subscription created successfully",
            data: {
                subscription: result.subscription,
                payment: result.payment,
                plan
            }
        });
    } catch (error) {
        console.error('Error creating subscription:', error);
        res.status(500).json({
            success: false,
            message: "Failed to create subscription",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Cancel a subscription
export const cancelSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const firebaseUser = (req as any).user;
        const { cancellation_reason } = req.body;

        if (!firebaseUser) {
            res.status(401).json({
                success: false,
                message: "Authentication required"
            });
            return;
        }

        const userId = await getUserIdFromFirebaseUID(firebaseUser.uid);

        if (!userId) {
            res.status(404).json({
                success: false,
                message: "User not found"
            });
            return;
        }

        // Check if subscription exists and belongs to user
        const subscription = await prisma.subscriptions.findFirst({
            where: {
                id: parseInt(id),
                user_id: userId
            }
        });

        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "Subscription not found or doesn't belong to authenticated user"
            });
            return;
        }

        // Update subscription with Prisma transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update subscription
            const updatedSubscription = await tx.subscriptions.update({
                where: { id: parseInt(id) },
                data: {
                    status: 'cancelled' as SubscriptionStatus,
                    auto_renew: false,
                    cancelled_at: new Date(),
                    cancellation_reason: cancellation_reason || 'User cancelled'
                }
            });

            // Update user table
            const user = await tx.users.update({
                where: { id: userId },
                data: {
                    subscription_status: 'cancelled',
                    auto_renew: false
                }
            });

            return { subscription: updatedSubscription, user };
        });

        res.json({
            success: true,
            message: "Subscription cancelled successfully",
            data: result.subscription
        });
    } catch (error) {
        console.error('Error cancelling subscription:', error);
        res.status(500).json({
            success: false,
            message: "Failed to cancel subscription",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Admin: Get all subscriptions with user details
export const getAllSubscriptions = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        // Build query condition
        const where: any = {};
        if (status) {
            where.status = status;
        }

        // Get subscriptions with pagination
        const subscriptions = await prisma.subscriptions.findMany({
            where,
            skip,
            take: parseInt(limit as string),
            orderBy: {
                created_at: 'desc'
            },
            include: {
                users: {
                    select: {
                        id: true,
                        firebase_uid: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                },
                payments: {
                    orderBy: {
                        created_at: 'desc'
                    },
                    take: 1
                }
            }
        });

        // Get total count
        const total = await prisma.subscriptions.count({ where });

        res.json({
            success: true,
            message: "All subscriptions retrieved",
            data: {
                subscriptions,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving all subscriptions:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve all subscriptions",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Admin: Update a subscription
export const updateSubscription = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, end_date, auto_renew } = req.body;

        const subscription = await prisma.subscriptions.findUnique({
            where: { id: parseInt(id) },
            include: { users: true }
        });

        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "Subscription not found"
            });
            return;
        }

        // Update with transaction
        const result = await prisma.$transaction(async (tx) => {
            // Update subscription
            const updatedSubscription = await tx.subscriptions.update({
                where: { id: parseInt(id) },
                data: {
                    status: status as SubscriptionStatus,
                    end_date: end_date ? new Date(end_date) : undefined,
                    auto_renew: auto_renew !== undefined ? auto_renew : undefined
                }
            });

            // Update user table if needed
            if (subscription.user_id) {
                await tx.users.update({
                    where: { id: subscription.user_id },
                    data: {
                        subscription_status: status as SubscriptionStatus,
                        subscription_end_date: end_date ? new Date(end_date) : undefined,
                        auto_renew: auto_renew !== undefined ? auto_renew : undefined
                    }
                });
            }

            return updatedSubscription;
        });

        res.json({
            success: true,
            message: "Subscription updated successfully",
            data: result
        });
    } catch (error) {
        console.error('Error updating subscription:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update subscription",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
