import { Request, Response } from 'express';
import crypto from 'crypto';
import { PrismaClient } from '../prisma/generated/client';
import { PaymentStatus } from '../types';

const prisma = new PrismaClient();

// PayHere configuration
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const PAYHERE_CURRENCY = 'LKR';
const PAYHERE_SANDBOX = process.env.PAYHERE_SANDBOX;
const PAYHERE_RETURN_URL = process.env.PAYHERE_RETURN_URL || 'http://localhost:5173/payment/success';
const PAYHERE_CANCEL_URL = process.env.PAYHERE_CANCEL_URL || 'http://localhost:5173/payment/cancel';
const PAYHERE_NOTIFY_URL = process.env.PAYHERE_NOTIFY_URL || 'http://localhost:5000/api/payments/notify';

// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = async (firebase_uid: string): Promise<number | null> => {
    try {
        const user = await prisma.users.findFirst({
            where: { firebase_uid },
            select: { id: true }
        });
        return user ? user.id : null;
    } catch (error) {
        console.error('Error getting user ID from Firebase UID:', error);
        return null;
    }
};

const getActualMerchantSecret = (merchant_secret: string): string => {
    let actual_secret = merchant_secret.trim();
    try {
        // Try base64 decode, fallback to original if not valid base64
        const decoded = Buffer.from(actual_secret, 'base64').toString('utf8');
        // If decoding yields mostly printable characters, use it
        if (/^[\x20-\x7E]+$/.test(decoded) && decoded.length > 5) {
            return decoded;
        }
    } catch { }
    return actual_secret;
};

// Generate PayHere hash
const generatePayHereHash = (
    merchant_id: string,
    order_id: string,
    amount: string,
    currency: string,
    merchant_secret: string
): string => {
    // Trim and decode the merchant secret
    let actual_secret = merchant_secret.trim();

    try {
        // Try base64 decode, fallback to original if not valid base64
        const decoded = Buffer.from(actual_secret, 'base64').toString('utf8');
        // If decoding yields mostly printable characters, use it
        if (/^[\x20-\x7E]+$/.test(decoded) && decoded.length > 5) {
            actual_secret = decoded;
        }
    } catch (e) {
        console.warn('Error decoding merchant secret. Using as-is:', e);
    }

    // Generate hash
    const data = `${merchant_id}${order_id}${amount}${currency}`;
    return crypto.createHmac('md5', actual_secret).update(data).digest('hex');
};

// Initialize a payment for subscription
export const initializeSubscriptionPayment = async (req: Request, res: Response): Promise<void> => {
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

        const { payment_id } = req.body;

        if (!payment_id) {
            res.status(400).json({
                success: false,
                message: "Payment ID is required"
            });
            return;
        }

        // Get payment details
        const payment = await prisma.payments.findUnique({
            where: { id: parseInt(payment_id) }
        });

        if (!payment) {
            res.status(404).json({
                success: false,
                message: "Payment not found"
            });
            return;
        }

        if (payment.user_id !== userId) {
            res.status(403).json({
                success: false,
                message: "Access denied: Payment belongs to another user"
            });
            return;
        }

        // Get subscription details
        const subscription = await prisma.subscriptions.findUnique({
            where: { id: payment.subscription_id ?? undefined }
        });

        if (!subscription) {
            res.status(404).json({
                success: false,
                message: "Subscription not found"
            });
            return;
        }

        // Get user details
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: {
                first_name: true,
                last_name: true,
                email: true,
                display_name: true
            }
        });

        if (!user) {
            res.status(404).json({
                success: false,
                message: "User details not found"
            });
            return;
        }

        // Get plan details
        const plan = await prisma.subscription_plans.findUnique({
            where: { plan_type: subscription.plan_type }
        });

        if (!plan) {
            res.status(404).json({
                success: false,
                message: "Subscription plan not found"
            });
            return;
        }

        // Generate order ID
        const orderId = `SUB-${payment.id}-${Date.now()}`;

        // Update payment with order ID
        await prisma.payments.update({
            where: { id: payment.id },
            data: { gateway_order_id: orderId }
        });

        // Format amount to 2 decimal places
        const amount = payment.amount.toFixed(2);

        // Generate PayHere hash
        const hash = generatePayHereHash(
            PAYHERE_MERCHANT_ID || '',
            orderId,
            amount,
            PAYHERE_CURRENCY,
            PAYHERE_MERCHANT_SECRET || ''
        );

        // Prepare payment data for PayHere
        const paymentData = {
            sandbox: PAYHERE_SANDBOX === 'true',
            merchant_id: PAYHERE_MERCHANT_ID,
            order_id: orderId,
            amount,
            currency: PAYHERE_CURRENCY,
            hash: hash.toUpperCase(), // PayHere requires uppercase hash
            items: `${plan.name} Subscription`,
            first_name: user.first_name || user.display_name || 'User',
            last_name: user.last_name || '',
            email: user.email,
            phone: '',
            address: '',
            city: '',
            country: 'Sri Lanka',
            delivery_address: '',
            delivery_city: '',
            delivery_country: '',
            custom_1: payment.id.toString(),
            custom_2: subscription.id.toString(),
            return_url: PAYHERE_RETURN_URL,
            cancel_url: PAYHERE_CANCEL_URL,
            notify_url: PAYHERE_NOTIFY_URL,
        };

        res.json({
            success: true,
            message: "Payment initialization successful",
            data: paymentData
        });
    } catch (error) {
        console.error('Error initializing payment:', error);
        res.status(500).json({
            success: false,
            message: "Failed to initialize payment",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Handle PayHere payment notification (IPN)
export const handlePaymentNotification = async (req: Request, res: Response): Promise<void> => {
    try {
        console.log('Received payment notification:', req.body);

        // Extract payment details from notification
        const {
            merchant_id,
            order_id,
            payment_id: gateway_payment_id,
            payhere_amount,
            payhere_currency,
            status_code,
            md5sig,
            custom_1, // payment_id
            custom_2, // subscription_id
            status_message,
            method,
            card_holder_name,
            card_no,
            card_expiry
        } = req.body;

        // Verify hash
        const calculatedHash = generatePayHereHash(
            merchant_id,
            order_id,
            payhere_amount,
            payhere_currency,
            PAYHERE_MERCHANT_SECRET || ''
        );

        if (calculatedHash.toUpperCase() !== md5sig) {
            console.error('Hash verification failed for payment notification');
            res.status(400).json({
                success: false,
                message: "Hash verification failed"
            });
            return;
        }

        // Get payment status
        const paymentStatus: PaymentStatus = status_code === '2' ? 'completed' :
            status_code === '0' ? 'pending' : 'failed';

        // Get payment ID from custom_1
        const paymentId = parseInt(custom_1);
        const subscriptionId = parseInt(custom_2);

        // Update payment record with Prisma transaction
        await prisma.$transaction(async (tx) => {
            // Update payment
            const updatedPayment = await tx.payments.update({
                where: { id: paymentId },
                data: {
                    payment_status: paymentStatus,
                    gateway_transaction_id: gateway_payment_id,
                    payment_date: new Date(),
                    metadata: {
                        ...req.body,
                        verification: "Hash verified"
                    }
                }
            });

            // If payment is completed, update subscription
            if (paymentStatus === 'completed') {
                // Update subscription
                const subscription = await tx.subscriptions.update({
                    where: { id: subscriptionId },
                    data: {
                        status: 'active'
                    }
                });

                // Update user subscription status
                if (subscription.user_id) {
                    await tx.users.update({
                        where: { id: subscription.user_id },
                        data: {
                            subscription_status: 'active',
                            subscription_plan: subscription.plan_type
                        }
                    });
                }
            }
        });

        // Respond to PayHere
        res.status(200).send('OK');
    } catch (error) {
        console.error('Error handling payment notification:', error);
        // Still respond with 200 to PayHere to prevent retries
        res.status(200).send('Error occurred but received');
    }
};

// Handle payment success (redirect from PayHere)
export const handlePaymentSuccess = async (req: Request, res: Response): Promise<void> => {
    try {
        const { order_id } = req.query;

        // Find payment by order ID
        const payment = await prisma.payments.findFirst({
            where: {
                gateway_order_id: order_id as string
            },
            include: {
                subscriptions: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                }
            }
        });

        if (!payment) {
            res.status(404).json({
                success: false,
                message: "Payment not found"
            });
            return;
        }

        res.json({
            success: true,
            message: "Payment successful",
            data: {
                payment,
                subscription: payment.subscriptions,
                user: payment.users
            }
        });
    } catch (error) {
        console.error('Error handling payment success:', error);
        res.status(500).json({
            success: false,
            message: "Failed to handle payment success",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get payment details
export const getPaymentDetails = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
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

        // Get payment with related data
        const payment = await prisma.payments.findUnique({
            where: { id: parseInt(id) },
            include: {
                subscriptions: true
            }
        });

        if (!payment) {
            res.status(404).json({
                success: false,
                message: "Payment not found"
            });
            return;
        }

        // Check if user owns the payment or is admin
        const user = await prisma.users.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        const isAdmin = user?.role === 'admin';
        const isOwner = payment.user_id === userId;

        if (!isAdmin && !isOwner) {
            res.status(403).json({
                success: false,
                message: "Access denied: Payment belongs to another user"
            });
            return;
        }

        res.json({
            success: true,
            message: "Payment details retrieved",
            data: payment
        });
    } catch (error) {
        console.error('Error retrieving payment details:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve payment details",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Get user payment history
export const getPaymentHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const firebaseUser = (req as any).user;
        const { page = '1', limit = '10' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

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

        // Get payments with pagination
        const payments = await prisma.payments.findMany({
            where: {
                user_id: userId
            },
            orderBy: {
                created_at: 'desc'
            },
            skip,
            take: parseInt(limit as string),
            include: {
                subscriptions: true
            }
        });

        // Get total count
        const total = await prisma.payments.count({
            where: {
                user_id: userId
            }
        });

        res.json({
            success: true,
            message: "Payment history retrieved",
            data: {
                payments,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving payment history:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve payment history",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Admin: Get all payments
export const getAllPayments = async (req: Request, res: Response): Promise<void> => {
    try {
        const { status, page = '1', limit = '20' } = req.query;
        const skip = (parseInt(page as string) - 1) * parseInt(limit as string);

        // Build query condition
        const where: any = {};
        if (status) {
            where.payment_status = status;
        }

        // Get payments with pagination
        const payments = await prisma.payments.findMany({
            where,
            orderBy: {
                created_at: 'desc'
            },
            skip,
            take: parseInt(limit as string),
            include: {
                users: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true
                    }
                },
                subscriptions: true
            }
        });

        // Get total count
        const total = await prisma.payments.count({ where });

        res.json({
            success: true,
            message: "All payments retrieved",
            data: {
                payments,
                pagination: {
                    page: parseInt(page as string),
                    limit: parseInt(limit as string),
                    total,
                    pages: Math.ceil(total / parseInt(limit as string))
                }
            }
        });
    } catch (error) {
        console.error('Error retrieving all payments:', error);
        res.status(500).json({
            success: false,
            message: "Failed to retrieve all payments",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};

// Admin: Update payment status
export const updatePaymentStatus = async (req: Request, res: Response): Promise<void> => {
    try {
        const { id } = req.params;
        const { status, transaction_id, gateway } = req.body;

        // Get payment
        const payment = await prisma.payments.findUnique({
            where: { id: parseInt(id) }
        });

        if (!payment) {
            res.status(404).json({
                success: false,
                message: "Payment not found"
            });
            return;
        }

        // Update payment with transaction
        await prisma.$transaction(async (tx) => {
            // Update payment
            const updatedPayment = await tx.payments.update({
                where: { id: parseInt(id) },
                data: {
                    payment_status: status as PaymentStatus,
                    gateway_transaction_id: transaction_id || payment.gateway_transaction_id,
                    payment_gateway: gateway || payment.payment_gateway,
                    payment_date: status === 'completed' ? new Date() : payment.payment_date
                }
            });

            // If payment is for a subscription and status is completed
            if (payment.subscription_id && status === 'completed') {
                // Update subscription
                const subscription = await tx.subscriptions.update({
                    where: { id: payment.subscription_id },
                    data: {
                        status: 'active'
                    }
                });

                // Update user subscription status
                if (subscription.user_id) {
                    await tx.users.update({
                        where: { id: subscription.user_id },
                        data: {
                            subscription_status: 'active',
                            subscription_plan: subscription.plan_type
                        }
                    });
                }
            }
        });

        // Get updated payment with related data
        const updatedPayment = await prisma.payments.findUnique({
            where: { id: parseInt(id) },
            include: {
                subscriptions: true,
                users: {
                    select: {
                        id: true,
                        email: true,
                        first_name: true,
                        last_name: true,
                        display_name: true,
                        subscription_status: true,
                        subscription_plan: true
                    }
                }
            }
        });

        res.json({
            success: true,
            message: "Payment status updated successfully",
            data: updatedPayment
        });
    } catch (error) {
        console.error('Error updating payment status:', error);
        res.status(500).json({
            success: false,
            message: "Failed to update payment status",
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
