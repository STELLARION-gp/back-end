import { Request, Response } from "express";
import crypto from "crypto";
import { PrismaClient } from "../prisma/generated/client";
import { PaymentStatus } from "../types";

const prisma = new PrismaClient();

// PayHere configuration
const PAYHERE_MERCHANT_ID = process.env.PAYHERE_MERCHANT_ID;
const PAYHERE_MERCHANT_SECRET = process.env.PAYHERE_MERCHANT_SECRET;
const PAYHERE_CURRENCY = "LKR";
const PAYHERE_SANDBOX = process.env.PAYHERE_SANDBOX;
const PAYHERE_RETURN_URL =
  process.env.PAYHERE_RETURN_URL || "http://localhost:5173/payment/success";
const PAYHERE_CANCEL_URL =
  process.env.PAYHERE_CANCEL_URL || "http://localhost:5173/payment/cancel";
const PAYHERE_NOTIFY_URL =
  process.env.PAYHERE_NOTIFY_URL || "http://localhost:5000/api/payments/notify";

// Helper function to get user_id from Firebase UID
const getUserIdFromFirebaseUID = async (
  firebase_uid: string
): Promise<number | null> => {
  try {
    const user = await prisma.users.findUnique({
      where: { firebase_uid },
      select: { id: true },
    });
    return user ? user.id : null;
  } catch (error) {
    console.error("Error getting user ID from Firebase UID:", error);
    return null;
  }
};

const getActualMerchantSecret = (merchant_secret: string): string => {
  let actual_secret = merchant_secret.trim();
  try {
    // Try base64 decode, fallback to original if not valid base64
    const decoded = Buffer.from(actual_secret, "base64").toString("utf8");
    // If decoding yields mostly printable characters, use it
    if (/^[\x20-\x7E]+$/.test(decoded) && decoded.length > 5) {
      return decoded;
    }
  } catch {}
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

  // try {
  //     // Try base64 decode
  //     const decoded = Buffer.from(actual_secret, 'base64').toString('utf8');
  //     if (/^[\x20-\x7E]+$/.test(decoded) && decoded.length > 5) {
  //         actual_secret = decoded; // Use decoded value
  //     }
  // } catch (err) {
  //     console.warn('Merchant secret is not base64, using as-is');
  // }

  // PayHere hash format: merchant_id + order_id + amount + currency + decoded_secret (uppercase)
  const hash_string =
    merchant_id + order_id + amount + currency + actual_secret.toUpperCase();
  const hash = crypto
    .createHash("md5")
    .update(hash_string)
    .digest("hex")
    .toUpperCase();

  console.log("PayHere Hash Debug:");
  console.log("- merchant_id:", merchant_id);
  console.log("- order_id:", order_id);
  console.log("- amount:", amount);
  console.log("- currency:", currency);
  console.log("- actual_secret:", actual_secret);
  console.log("- hash_string:", hash_string);
  console.log("- generated_hash:", hash);

  return hash;
};

// Create payment order
export const createPaymentOrder = async (req: Request, res: Response) => {
  try {
    // Get Firebase user from the verified token (try both locations)
    const firebaseUser = (req as any).user;
    const { planId, amount, currency = "LKR" } = req.body;

    // Debug logging
    console.log("=== Payment Order Debug ===");
    console.log("Request body:", req.body);
    console.log("Firebase user from req:", (req as any).user);
    //console.log('Firebase user from body:', req.body.firebaseUser);
    console.log("planId:", planId);
    console.log("amount:", amount);
    console.log("currency:", currency);

    // Validate inputs with detailed error messages
    if (!firebaseUser?.uid) {
      return res.status(400).json({
        success: false,
        message: "Missing Firebase user authentication data",
        debug: {
          firebaseUserFromReq: !!(req as any).user,
          hasUid: !!firebaseUser?.uid,
        },
      });
    }

    if (!planId) {
      return res.status(400).json({
        success: false,
        message: "Missing planId in request body",
      });
    }

    if (!amount) {
      return res.status(400).json({
        success: false,
        message: "Missing amount in request body",
      });
    }

    // Convert Firebase UID to integer user_id
    const actualUserId = await getUserIdFromFirebaseUID(firebaseUser.uid);
    if (!actualUserId) {
      return res.status(404).json({
        success: false,
        message: "User not found in database",
      });
    }

    // Get user details
    const user = await prisma.users.findUnique({
      where: { id: actualUserId },
    });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Get subscription plan details by ID
    const plan = await prisma.subscription_plans.findUnique({
      where: { id: planId },
    });

    if (!plan) {
      return res.status(404).json({
        success: false,
        message: "Subscription plan not found",
      });
    }

    // Generate unique order ID
    const order_id = `STELLARION_${Date.now()}_${actualUserId}`;

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        user_id: actualUserId,
        amount: amount,
        currency: currency,
        payment_status: "pending",
        payment_gateway: "payhere",
        gateway_order_id: order_id,
        metadata: {
          plan_type: plan.plan_type,
          plan_name: plan.name,
          user_email: user.email,
          user_name: `${user.first_name} ${user.last_name}`,
        },
      },
    });

    const payment_id = payment.id;

    // Generate PayHere hash
    const formattedAmount = parseFloat(amount).toFixed(2);
    const hash = generatePayHereHash(
      PAYHERE_MERCHANT_ID,
      order_id,
      formattedAmount,
      currency,
      PAYHERE_MERCHANT_SECRET
    );

    // PayHere payment data (to be used by frontend PayHere JS library)
    const payhere_data = {
      sandbox: PAYHERE_SANDBOX === "true",
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: order_id,
      items: plan.name || "Subscription Plan",
      amount: formattedAmount, // Use the same formatted amount for hash consistency
      currency: currency,
      hash: hash,
      first_name: user.first_name || "Customer",
      last_name: user.last_name || "User",
      email: user.email,
      phone: (user.profile_data as any)?.phone || "0771234567",
      address: (user.profile_data as any)?.address || "No. 1, Main Street",
      city: (user.profile_data as any)?.city || "Colombo",
      country: (user.profile_data as any)?.country || "Sri Lanka",
      delivery_address:
        (user.profile_data as any)?.address || "No. 1, Main Street",
      delivery_city: (user.profile_data as any)?.city || "Colombo",
      delivery_country: (user.profile_data as any)?.country || "Sri Lanka",
      custom_1: `plan_id_${plan.id}`,
      custom_2: `user_id_${actualUserId}`,
    };

    console.log(payhere_data);

    res.json({
      success: true,
      data: {
        payment_id,
        order_id,
        payhere_data,
        plan_details: {
          id: plan.id,
          name: plan.name,
          type: plan.plan_type,
          price: plan.price_lkr,
        },
      },
    });
  } catch (error) {
    console.error("Error creating payment order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create payment order",
    });
  }
};

// PayHere notification handler
export const handlePayHereNotification = async (
  req: Request,
  res: Response
) => {
  try {
    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    // Verify the notification
    const local_md5sig = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          PAYHERE_MERCHANT_SECRET.toUpperCase()
      )
      .digest("hex")
      .toUpperCase();

    if (local_md5sig !== md5sig) {
      console.error("PayHere notification signature verification failed");
      return res.status(400).send("Invalid signature");
    }

    // Find the payment record
    const payment = await prisma.payments.findFirst({
      where: { gateway_order_id: order_id },
    });

    if (!payment) {
      console.error("Payment record not found for order:", order_id);
      return res.status(404).send("Payment not found");
    }
    let payment_status: PaymentStatus;

    // Update payment status based on PayHere status code
    switch (status_code) {
      case "2": // Success
        payment_status = "completed";
        break;
      case "0": // Pending
        payment_status = "pending";
        break;
      case "-1": // Cancelled
      case "-2": // Failed
      case "-3": // Chargedback
        payment_status = "failed";
        break;
      default:
        payment_status = "failed";
    }

    // Update payment record
    await prisma.payments.update({
      where: { id: payment.id },
      data: {
        payment_status: payment_status,
        gateway_transaction_id: payment_id,
        payment_date: new Date(),
        metadata: {
          ...((payment.metadata as object) || {}),
          payhere_status_code: status_code,
          payhere_amount: payhere_amount,
          payhere_currency: payhere_currency,
        },
        updated_at: new Date(),
      },
    });

    // If payment is successful, update user subscription
    if (payment_status === "completed") {
      const metadata = payment.metadata as any;
      const plan_type = metadata.plan_type;

      // Calculate subscription dates
      const startDate = new Date();
      let endDate = null;

      if (plan_type !== "starseeker") {
        endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
      }

      // Determine subscription level based on plan type
      let subscriptionLevel = 1; // Default for starseeker
      if (plan_type === "galaxy_explorer") {
        subscriptionLevel = 2;
      } else if (plan_type === "cosmic_voyager") {
        subscriptionLevel = 3;
      }

      // Update user subscription
      await prisma.users.update({
        where: { id: payment.user_id! },
        data: {
          subscription_plan: plan_type,
          subscription_status: "active",
          subscription_level: subscriptionLevel,
          subscription_start_date: startDate,
          subscription_end_date: endDate,
          chatbot_questions_used: 0,
          chatbot_questions_reset_date: new Date(),
          updated_at: new Date(),
        },
      });

      // Create subscription record
      const subscription = await prisma.subscriptions.create({
        data: {
          user_id: payment.user_id!,
          plan_type: plan_type as any,
          status: "active",
          start_date: startDate,
          end_date: endDate,
        },
      });

      // Link payment to subscription
      await prisma.payments.update({
        where: { id: payment.id },
        data: { subscription_id: subscription.id },
      });
    }

    res.status(200).send("OK");
  } catch (error) {
    console.error("Error handling PayHere notification:", error);
    res.status(500).send("Internal server error");
  }
};

// Get payment status
export const getPaymentStatus = async (req: Request, res: Response) => {
  try {
    const { payment_id } = req.params;

    const payment = await prisma.payments.findUnique({
      where: { id: parseInt(payment_id) },
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      });
    }

    res.json({
      success: true,
      data: payment,
    });
  } catch (error) {
    console.error("Error fetching payment status:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment status",
    });
  }
};

// Get user payment history
export const getUserPaymentHistory = async (req: Request, res: Response) => {
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
          message: "User not found",
        });
      }
      actualUserId = convertedId;
    } else {
      actualUserId = Number(user_id);
    }

    const payments = await prisma.payments.findMany({
      where: { user_id: actualUserId },
      include: {
        subscriptions: true,
      },
      orderBy: { created_at: "desc" },
    });

    // Get plan names separately for each subscription
    const formattedPayments = await Promise.all(
      payments.map(async (payment) => {
        let plan_name = null;
        if (payment.subscriptions?.plan_type) {
          const plan = await prisma.subscription_plans.findUnique({
            where: { plan_type: payment.subscriptions.plan_type },
            select: { name: true },
          });
          plan_name = plan?.name || null;
        }

        return {
          ...payment,
          plan_name,
        };
      })
    );

    res.json({
      success: true,
      data: formattedPayments,
    });
  } catch (error) {
    console.error("Error fetching payment history:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch payment history",
    });
  }
};
