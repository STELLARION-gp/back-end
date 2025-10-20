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

// Helper function to decode merchant secret from Base64
const getActualMerchantSecret = (merchant_secret: string): string => {
  let actual_secret = merchant_secret.trim();
  try {
    // PayHere merchant secrets are typically Base64 encoded
    const decoded = Buffer.from(actual_secret, "base64").toString("utf8");
    // If decoding yields valid characters, use it
    if (decoded && decoded.length > 0) {
      console.log("Merchant secret decoded from Base64");
      return decoded;
    }
  } catch (error) {
    console.log("Merchant secret is not Base64 encoded, using as-is");
  }
  return actual_secret;
};

// Generate PayHere hash for payment request
const generatePayHereHash = (
  merchant_id: string,
  order_id: string,
  amount: string,
  currency: string,
  merchant_secret: string,
  is_sandbox: boolean = false
): string => {
  // OFFICIAL PAYHERE FORMAT (Same for both Sandbox and Production):
  // Step 1: MD5(merchant_secret)
  // Step 2: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))

  // IMPORTANT: PayHere expects the merchant secret EXACTLY as provided in dashboard
  // Do NOT decode Base64 - use it as-is!
  const actual_secret = merchant_secret.trim();

  // Step 1: MD5(merchant_secret)
  const secret_hash = crypto
    .createHash("md5")
    .update(actual_secret)
    .digest("hex")
    .toUpperCase();

  // Step 2: MD5(merchant_id + order_id + amount + currency + MD5(merchant_secret))
  const hash_string = merchant_id + order_id + amount + currency + secret_hash;
  const hash = crypto
    .createHash("md5")
    .update(hash_string)
    .digest("hex")
    .toUpperCase();

  console.log(
    `=== PayHere ${
      is_sandbox ? "SANDBOX" : "PRODUCTION"
    } Hash Generation (Official Format) ===`
  );
  console.log("merchant_id:", merchant_id);
  console.log("order_id:", order_id);
  console.log("amount:", amount);
  console.log("currency:", currency);
  console.log("merchant_secret:", actual_secret);
  console.log("Step 1 - MD5(merchant_secret):", secret_hash);
  console.log("Step 2 - hash_string:", hash_string);
  console.log("Step 3 - generated_hash:", hash);
  console.log("=".repeat(60));

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

    // Check if sandbox mode
    const isSandbox = PAYHERE_SANDBOX === "true";

    // Generate PayHere hash
    const formattedAmount = parseFloat(amount).toFixed(2);
    const hash = generatePayHereHash(
      PAYHERE_MERCHANT_ID,
      order_id,
      formattedAmount,
      currency,
      PAYHERE_MERCHANT_SECRET,
      isSandbox // Pass sandbox flag
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
    console.log("=== PayHere Notification Received ===");
    console.log("Headers:", req.headers);
    console.log("Body:", req.body);
    console.log("====================================");

    const {
      merchant_id,
      order_id,
      payment_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig,
    } = req.body;

    // Validate required fields
    if (
      !merchant_id ||
      !order_id ||
      !payhere_amount ||
      !payhere_currency ||
      !status_code ||
      !md5sig
    ) {
      console.error("Missing required fields in PayHere notification");
      return res.status(400).send("Missing required fields");
    }

    // Check if sandbox mode
    const isSandbox = PAYHERE_SANDBOX === "true";

    // Generate PayHere signature for verification
    // OFFICIAL PAYHERE FORMAT (Same for both Sandbox and Production)
    // Use merchant secret EXACTLY as provided (Base64) - do NOT decode
    const actual_secret = PAYHERE_MERCHANT_SECRET.trim();

    // Step 1: MD5(merchant_secret)
    const secret_hash = crypto
      .createHash("md5")
      .update(actual_secret)
      .digest("hex")
      .toUpperCase();

    // Step 2: MD5(merchant_id + order_id + payhere_amount + payhere_currency + status_code + MD5(merchant_secret))
    const hash_string =
      merchant_id +
      order_id +
      payhere_amount +
      payhere_currency +
      status_code +
      secret_hash;
    const local_md5sig = crypto
      .createHash("md5")
      .update(hash_string)
      .digest("hex")
      .toUpperCase();

    console.log(
      `=== PayHere ${
        isSandbox ? "SANDBOX" : "PRODUCTION"
      } Signature Verification (Official Format) ===`
    );
    console.log("merchant_id:", merchant_id);
    console.log("order_id:", order_id);
    console.log("payhere_amount:", payhere_amount);
    console.log("payhere_currency:", payhere_currency);
    console.log("status_code:", status_code);
    console.log("merchant_secret:", actual_secret);
    console.log("Step 1 - MD5(merchant_secret):", secret_hash);
    console.log("Step 2 - hash_string:", hash_string);
    console.log("Calculated MD5:", local_md5sig);
    console.log("Received MD5:", md5sig);
    console.log("Match:", local_md5sig === md5sig);
    console.log("=".repeat(60));
    console.log("Match:", local_md5sig === md5sig);
    console.log("=================================================");

    if (local_md5sig !== md5sig) {
      console.error("PayHere notification signature verification failed");
      console.error("Expected:", local_md5sig);
      console.error("Received:", md5sig);
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
    // Reference: https://support.payhere.lk/api-&-mobile-sdk/payment-notification
    switch (status_code) {
      case "2": // Success
        payment_status = "completed";
        console.log("Payment completed successfully");
        break;
      case "0": // Pending
        payment_status = "pending";
        console.log("Payment is pending");
        break;
      case "-1": // Cancelled
        payment_status = "failed";
        console.log("Payment was cancelled");
        break;
      case "-2": // Failed
        payment_status = "failed";
        console.log("Payment failed");
        break;
      case "-3": // Chargedback
        payment_status = "failed";
        console.log("Payment was charged back");
        break;
      default:
        payment_status = "failed";
        console.log("Unknown status code:", status_code);
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
          notification_received_at: new Date().toISOString(),
        },
        updated_at: new Date(),
      },
    });

    console.log("Payment record updated:", payment.id);

    // If payment is successful, update user subscription or booking
    if (payment_status === "completed") {
      const metadata = payment.metadata as any;

      // Check if this is a booking payment or subscription payment
      if (metadata.booking_id) {
        // This is a booking payment
        console.log("Processing successful booking payment for booking:", metadata.booking_id);

        // Update booking status
        await prisma.service_bookings.update({
          where: { id: metadata.booking_id },
          data: {
            payment_status: "completed",
            booking_status: "confirmed",
            updated_at: new Date(),
          },
        });

        console.log("Booking payment confirmed for booking:", metadata.booking_id);
      } else if (metadata.plan_type) {
        // This is a subscription payment
        const plan_type = metadata.plan_type;

        console.log("Processing successful payment for plan:", plan_type);

        // Calculate subscription dates
        const startDate = new Date();
        let endDate = null;

        if (plan_type !== "starseeker") {
          endDate = new Date();
          endDate.setMonth(endDate.getMonth() + 1); // 1 month subscription
        }

        // Update user subscription
        await prisma.users.update({
          where: { id: payment.user_id! },
          data: {
            subscription_plan: plan_type,
            subscription_status: "active",
            subscription_start_date: startDate,
            subscription_end_date: endDate,
            chatbot_questions_used: 0,
            chatbot_questions_reset_date: new Date(),
            updated_at: new Date(),
          },
        });

        console.log("User subscription updated for user:", payment.user_id);

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

        console.log("Subscription record created:", subscription.id);

        // Link payment to subscription
        await prisma.payments.update({
          where: { id: payment.id },
          data: { subscription_id: subscription.id },
        });

        console.log("Payment linked to subscription");
      }
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

// Create booking payment order
export const createBookingPaymentOrder = async (req: Request, res: Response) => {
  try {
    const firebaseUser = (req as any).user;
    const { bookingId, payer } = req.body;

    console.log("=== Booking Payment Order Debug ===");
    console.log("Request body:", req.body);
    console.log("Firebase user:", firebaseUser);
    console.log("bookingId:", bookingId);

    if (!firebaseUser?.uid) {
      return res.status(400).json({
        success: false,
        message: "Missing Firebase user authentication data",
      });
    }

    if (!bookingId) {
      return res.status(400).json({
        success: false,
        message: "Missing bookingId in request body",
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

    // Get booking details
    const booking = await prisma.service_bookings.findUnique({
      where: { id: bookingId },
      include: {
        services: true,
      },
    });

    if (!booking) {
      return res.status(404).json({
        success: false,
        message: "Booking not found",
      });
    }

    if (booking.user_id !== actualUserId) {
      return res.status(403).json({
        success: false,
        message: "Unauthorized to pay for this booking",
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

    // Generate unique order ID
    const order_id = `BOOKING_${Date.now()}_${actualUserId}_${bookingId}`;

    // Create payment record
    const payment = await prisma.payments.create({
      data: {
        user_id: actualUserId,
        amount: booking.total_amount,
        currency: "LKR",
        payment_status: "pending",
        payment_gateway: "payhere",
        gateway_order_id: order_id,
        metadata: {
          booking_id: bookingId,
          service_id: booking.service_id,
          service_title: booking.services?.title || "Service Booking",
          user_email: user.email,
          user_name: `${user.first_name} ${user.last_name}`,
          participants: booking.participants_count,
        },
      },
    });

    const payment_id = payment.id;

    // Check if sandbox mode
    const isSandbox = PAYHERE_SANDBOX === "true";

    // Generate PayHere hash
    const formattedAmount = parseFloat(booking.total_amount.toString()).toFixed(2);
    const hash = generatePayHereHash(
      PAYHERE_MERCHANT_ID,
      order_id,
      formattedAmount,
      "LKR",
      PAYHERE_MERCHANT_SECRET,
      isSandbox
    );

    // PayHere payment data
    const payhere_data = {
      sandbox: PAYHERE_SANDBOX === "true",
      merchant_id: PAYHERE_MERCHANT_ID,
      return_url: PAYHERE_RETURN_URL,
      cancel_url: PAYHERE_CANCEL_URL,
      notify_url: PAYHERE_NOTIFY_URL,
      order_id: order_id,
      items: booking.services?.title || "Service Booking",
      amount: formattedAmount,
      currency: "LKR",
      hash: hash,
      first_name: user.first_name || "Customer",
      last_name: user.last_name || "User",
      email: user.email,
      phone: (user.profile_data as any)?.phone || "0771234567",
      address: (user.profile_data as any)?.address || "No. 1, Main Street",
      city: (user.profile_data as any)?.city || "Colombo",
      country: (user.profile_data as any)?.country || "Sri Lanka",
      delivery_address: (user.profile_data as any)?.address || "No. 1, Main Street",
      delivery_city: (user.profile_data as any)?.city || "Colombo",
      delivery_country: (user.profile_data as any)?.country || "Sri Lanka",
      custom_1: `booking_id_${bookingId}`,
      custom_2: `user_id_${actualUserId}`,
    };

    console.log("Booking PayHere data:", payhere_data);

    res.json({
      success: true,
      data: {
        payment_id,
        order_id,
        payhere_data,
        booking_details: {
          id: booking.id,
          service_title: booking.services?.title,
          amount: booking.total_amount,
        },
      },
    });
  } catch (error) {
    console.error("Error creating booking payment order:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create booking payment order",
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

// Test endpoint to generate hash for debugging (DEVELOPMENT ONLY)
export const generateTestHash = async (req: Request, res: Response) => {
  try {
    const { merchant_id, order_id, amount, currency } = req.body;

    if (!merchant_id || !order_id || !amount || !currency) {
      return res.status(400).json({
        success: false,
        message:
          "Missing required fields: merchant_id, order_id, amount, currency",
      });
    }

    const isSandbox = PAYHERE_SANDBOX === "true";
    const formattedAmount = parseFloat(amount).toFixed(2);

    const hash = generatePayHereHash(
      merchant_id,
      order_id,
      formattedAmount,
      currency,
      PAYHERE_MERCHANT_SECRET || "",
      isSandbox
    );

    res.json({
      success: true,
      hash,
      method: isSandbox ? "sandbox" : "production",
      hash_string: isSandbox
        ? `${merchant_id}${order_id}${formattedAmount}${currency}${merchant_id.toUpperCase()}`
        : "Double MD5 (check console)",
    });
  } catch (error) {
    console.error("Error generating test hash:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate hash",
    });
  }
};

// Get booking payment statistics for guides
export const getBookingPaymentStats = async (req: Request, res: Response) => {
  try {
    const days = parseInt((req.query.days as string) || '30', 10);
    const since = new Date();
    since.setDate(since.getDate() - days);

    // If middleware attached a firebase user, try to scope stats to the guide
    const firebaseUser = (req as any).user;
    const guideUserId = firebaseUser?.userId || firebaseUser?.user_id || null;

    // Find guide bookings and sessions (if guideUserId available)
    let bookingIds: number[] = [];
    let sessionIds: number[] = [];
    if (guideUserId) {
        const guideBookings = await prisma.service_bookings.findMany({
          where: { services: { created_by: guideUserId }, created_at: { gte: since } },
          select: { id: true },
        });
      bookingIds = guideBookings.map((b) => b.id);

      const guideSessions = await prisma.sessions.findMany({
        where: { created_by: guideUserId, created_at: { gte: since } },
        select: { id: true },
      });
      sessionIds = guideSessions.map((s) => s.id);
    }

    // Fetch payments in range (we'll filter to guide-related payments in JS)
    const payments = await prisma.payments.findMany({
      where: { payment_gateway: 'payhere', created_at: { gte: since } },
    });

    const paymentsForGuide = guideUserId
      ? payments.filter((p) => {
          try {
            const metadata: any = p.metadata || {};
            const bookingRef = metadata.booking_id ? Number(metadata.booking_id) : null;
            const sessionRef = metadata.session_id ? Number(metadata.session_id) : null;
            if (bookingRef && bookingIds.includes(bookingRef)) return true;
            if (sessionRef && sessionIds.includes(sessionRef)) return true;
            return false;
          } catch (e) {
            return false;
          }
        })
      : payments;

    // Also fetch bookings for guide to include bookings without payments
    let guideBookingsFull: any[] = [];
    if (guideUserId && bookingIds.length > 0) {
      guideBookingsFull = await prisma.service_bookings.findMany({
        where: { id: { in: bookingIds } },
      });
    }

    // Compute totals
    const totalRevenueFromPayments = paymentsForGuide
      .filter((p) => p.payment_status === 'completed')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // For bookings that have payment_status completed but no payment record in paymentsForGuide, add their amounts
    const bookingIdsWithPayments = paymentsForGuide
      .map((p) => {
        try {
          const md: any = p.metadata || {};
          return md.booking_id ? Number(md.booking_id) : null;
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean) as number[];

    const bookingOnlyRevenue = guideBookingsFull
      .filter((b) => b.payment_status === 'completed' && !bookingIdsWithPayments.includes(b.id))
      .reduce((sum, b) => sum + Number(b.total_amount || 0), 0);

    const totalRevenue = totalRevenueFromPayments + bookingOnlyRevenue;

    const totalTransactions = paymentsForGuide.length + guideBookingsFull.length;
    const successCount = paymentsForGuide.filter((p) => p.payment_status === 'completed').length + guideBookingsFull.filter((b) => b.payment_status === 'completed').length;

    const pendingAmount = paymentsForGuide
      .filter((p) => p.payment_status === 'pending')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    const refundedAmount = paymentsForGuide
      .filter((p) => p.payment_status === 'refunded')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    let monthlyGrowth = 0;

    const stats = {
      totalRevenue,
      totalTransactions,
      successRate: totalTransactions === 0 ? 0 : (successCount / totalTransactions) * 100,
      pendingAmount,
      refundedAmount,
      monthlyGrowth,
    };

    return res.json(stats);
  } catch (error) {
    console.error("Error fetching booking payment stats:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch booking payment stats" });
  }
};

// Get booking payment transactions (paginated)
export const getBookingPaymentTransactions = async (req: Request, res: Response) => {
  try {
    const { status, dateRange, page = "1", limit = "20", sortBy = "created_at", sortOrder = "desc" } = req.query as any;
    const pageNum = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 20;

    const where: any = { payment_gateway: "payhere" };

    if (status) {
      where.payment_status = status;
    }

    if (dateRange) {
      const days = parseInt(dateRange as string, 10) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      where.created_at = { gte: since };
    }

    // Basic fetch; we'll paginate in the DB
    const total = await prisma.payments.count({ where });

    const payments = await prisma.payments.findMany({
      where,
      orderBy: { [sortBy]: sortOrder === "asc" ? "asc" : "desc" } as any,
      skip: (pageNum - 1) * pageLimit,
      take: pageLimit,
    });

    // Normalize payment statuses to match frontend expectations
    const normalizeStatus = (s: string | null | undefined) => {
      const st = (s || "").toString().toLowerCase();
      switch (st) {
        case "completed":
        case "approved":
          return "approved";
        case "pending":
          return "pending";
        case "refunded":
          return "refunded";
        case "failed":
          return "failed";
        default:
          return st || "pending";
      }
    };

    const transactions = payments.map((p) => {
      const metadata: any = (p.metadata as any) || {};
      return {
        id: String(p.id),
        date: (p.payment_date || p.created_at)?.toISOString() || new Date().toISOString(),
        amount: Number(p.amount || 0),
        currency: p.currency || "LKR",
        status: normalizeStatus(p.payment_status),
        type: metadata.booking_id ? "booking" : "payment",
        description: metadata.service_title || metadata.plan_name || "",
        gateway: p.payment_gateway || "payhere",
        reference: p.gateway_transaction_id || p.gateway_order_id || "",
        customerEmail: metadata.user_email || "",
        customerName: metadata.user_name || "",
        bookingId: metadata.booking_id ? Number(metadata.booking_id) : undefined,
        serviceId: metadata.service_id ? Number(metadata.service_id) : undefined,
      };
    });

    const totalPages = Math.ceil(total / pageLimit) || 1;

  return res.json({ transactions, total, page: pageNum, totalPages });
  } catch (error) {
    console.error("Error fetching booking payment transactions:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch payment transactions" });
  }
};

// Get booking payment transactions for guide's own services
export const getBookingPaymentTransactionsForGuide = async (req: Request, res: Response) => {
  try {
    // req.user populated by verifyToken middleware
    const firebaseUser = (req as any).user;
    const guideUserId = firebaseUser?.userId || firebaseUser?.user_id || null;
    if (!guideUserId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

  const { status, dateRange, page = '1', limit = '20', sortBy = 'date', sortOrder = 'desc' } = req.query as any;
    const pageNum = parseInt(page, 10) || 1;
    const pageLimit = parseInt(limit, 10) || 20;

    // Find bookings for services created by this guide
    console.log('Guide-scoped transactions request for guide user id:', guideUserId, 'params:', { status, dateRange, pageNum, pageLimit, sortBy, sortOrder });
    const bookingWhere: any = {};
    if (dateRange) {
      const days = parseInt(dateRange as string, 10) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      bookingWhere.created_at = { gte: since };
    }

    const guideBookings = await prisma.service_bookings.findMany({
      where: {
        services: { created_by: guideUserId },
      },
      select: { id: true },
    });

    console.log('Found guide bookings count:', guideBookings.length);
    // Also include session enrollments for sessions created by this guide
    const guideSessions = await prisma.sessions.findMany({
      where: { created_by: guideUserId },
      select: { id: true },
    });

    const guideSessionIds = guideSessions.map((s) => s.id);
    console.log('Found guide sessions count:', guideSessionIds.length);

    const bookingIds = guideBookings.map((b) => b.id);

    if (bookingIds.length === 0) {
      return res.json({ transactions: [], total: 0, page: pageNum, totalPages: 0 });
    }

    // Map frontend sort keys to DB columns
    const sortKeyMap: Record<string, string> = {
      date: 'created_at',
      amount: 'amount',
      status: 'payment_status',
    };
    const sortColumn = sortKeyMap[sortBy] || 'created_at';

    // Fetch payments (we'll filter by metadata.booking_id in JS since metadata is JSON)
    const payments = await prisma.payments.findMany({
      where: { payment_gateway: 'payhere' },
    });

    // Map payments to transaction-like objects
    // Normalize statuses for payments so frontend 'approved' filter matches completed payments
    const normalizeStatusForGuide = (s: string | null | undefined) => {
      const st = (s || "").toString().toLowerCase();
      switch (st) {
        case "completed":
        case "approved":
          return "approved";
        case "pending":
          return "pending";
        case "refunded":
          return "refunded";
        case "failed":
          return "failed";
        default:
          return st || "pending";
      }
    };

    const paymentTransactions = payments
      .map((p) => {
        try {
          const metadata: any = p.metadata || {};
          const bookingRef = metadata.booking_id ? Number(metadata.booking_id) : null;
          return {
            id: `pay-${p.id}`,
            date: (p.payment_date || p.created_at)?.toISOString() || new Date().toISOString(),
            amount: Number(p.amount || 0),
            currency: p.currency || 'LKR',
            status: normalizeStatusForGuide(p.payment_status),
            type: bookingRef ? 'booking' : 'payment',
            description: metadata.service_title || metadata.plan_name || '',
            gateway: p.payment_gateway || 'payhere',
            reference: p.gateway_transaction_id || p.gateway_order_id || '',
            customerEmail: metadata.user_email || '',
            customerName: metadata.user_name || '',
            bookingId: bookingRef || undefined,
            serviceId: metadata.service_id ? Number(metadata.service_id) : undefined,
          };
        } catch (e) {
          return null;
        }
      })
      .filter(Boolean) as any[];

    // Fetch session enrollments for guide's sessions and map to transactions
    let sessionTransactions: any[] = [];
    if (guideSessionIds.length > 0) {
      const enrollments = await prisma.session_enrollments.findMany({
        where: { session_id: { in: guideSessionIds } },
        include: { user: true },
      });

      sessionTransactions = enrollments.map((e) => ({
        id: `sess-${e.id}`,
        date: (e.created_at || e.enrollment_date)?.toISOString() || new Date().toISOString(),
        amount: Number(e.payment_amount || 0),
        currency: 'LKR',
        status: (e.payment_status as any) || 'pending',
        type: 'session',
        description: `Session enrollment #${e.id}`,
        gateway: e.payment_method || 'unknown',
        reference: e.transaction_id || '',
        customerEmail: e.user?.email || '',
        customerName: e.user ? `${e.user.first_name || ''} ${e.user.last_name || ''}`.trim() : '',
        bookingId: e.id,
        serviceId: e.session_id,
      }));
    }

    // Combine both sources and filter by bookingIds (for payments) or session ids (for sessions)
    // Also include bookings (service_bookings) as transactions when there is no payment record
    const bookingTransactions: any[] = [];
    if (bookingIds.length > 0) {
      const bookings = await prisma.service_bookings.findMany({
        where: { id: { in: bookingIds } },
        include: { users: true, services: true },
      });

      // Determine which bookings already have payment transactions
      const bookingIdsWithPayments = paymentTransactions.map((p) => Number(p.bookingId)).filter(Boolean);

      bookings.forEach((b) => {
        // Skip bookings that already have a payment transaction (to avoid duplicates)
        if (bookingIdsWithPayments.includes(b.id)) return;

        // Map booking status/payment_status into a transaction.status used by frontend
        let status = (b.payment_status as any) || 'pending';
        // If the guide confirmed the booking, show as 'approved' to reflect approval in transactions
        if (b.booking_status === 'confirmed') status = 'approved';
        if (b.booking_status === 'cancelled') {
          // If booking was cancelled and payment was refunded, mark refunded; otherwise mark rejected
          status = b.payment_status === 'refunded' ? 'refunded' : 'rejected';
        }

        bookingTransactions.push({
          id: `book-${b.id}`,
          date: (b.created_at || b.booking_date)?.toISOString() || new Date().toISOString(),
          amount: Number(b.total_amount || 0),
          currency: 'LKR',
          status,
          type: 'booking',
          description: b.services?.title || '',
          gateway: 'booking',
          reference: '',
          customerEmail: b.users?.email || '',
          customerName: b.users ? `${b.users.first_name || ''} ${b.users.last_name || ''}`.trim() : '',
          bookingId: b.id,
          serviceId: b.service_id,
        });
      });
    }

    const combined = [
      ...paymentTransactions.filter((t) => t.bookingId && bookingIds.includes(t.bookingId)),
      ...sessionTransactions,
      ...bookingTransactions,
    ];

    // Apply status filter if provided
    let filtered = combined;
    if (status && status !== 'all') {
      filtered = filtered.filter((t) => t.status === status);
    }

    // Apply dateRange filter if provided
    if (dateRange) {
      const days = parseInt(dateRange as string, 10) || 30;
      const since = new Date();
      since.setDate(since.getDate() - days);
      filtered = filtered.filter((t) => new Date(t.date) >= since);
    }

    // Sort combined list
    const sortKeyAccessor: Record<string, (item: any) => any> = {
      created_at: (it) => new Date(it.date).getTime(),
      amount: (it) => it.amount,
      payment_status: (it) => it.status,
    };
    const sortAccessor = sortKeyAccessor[sortColumn] || ((it: any) => new Date(it.date).getTime());
    filtered.sort((a, b) => {
      const va = sortAccessor(a);
      const vb = sortAccessor(b);
      if (va < vb) return sortOrder === 'asc' ? -1 : 1;
      if (va > vb) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageLimit) || 1;
    const start = (pageNum - 1) * pageLimit;
    const slice = filtered.slice(start, start + pageLimit);

    return res.json({ transactions: slice, total, page: pageNum, totalPages });
  } catch (error: any) {
    console.error('Error fetching guide booking payment transactions:', error instanceof Error ? error.message : error);
    return res.status(500).json({ success: false, message: 'Failed to fetch guide payment transactions', error: error instanceof Error ? error.message : String(error) });
  }
};

// Get booking payment details by booking id
export const getBookingPaymentDetails = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking id" });
    }

    // Find payment linked to booking via metadata
    const payments = await prisma.payments.findMany({ where: { payment_gateway: "payhere" }, orderBy: { created_at: "desc" } });

    const payment = payments.find((p) => {
      const metadata: any = p.metadata || {};
      return metadata && Number(metadata.booking_id) === bookingId;
    });

    if (!payment) {
      // If no payment record found, the id might refer to a session_enrollment (session booking)
      const enrollment = await prisma.session_enrollments.findUnique({ where: { id: bookingId } });
      if (enrollment) {
        // Found an enrollment; check payment status
        if (enrollment.payment_status !== 'completed') {
          return res.status(400).json({ success: false, message: 'Only completed enrollments can be refunded' });
        }

        // Mark enrollment as refunded
        await prisma.session_enrollments.update({
          where: { id: bookingId },
          data: { payment_status: 'refunded', updated_at: new Date() },
        });

        // Optionally create a payments record to record the refund (lightweight)
        try {
          await prisma.payments.create({
            data: {
              user_id: enrollment.user_id || null,
              amount: enrollment.payment_amount || 0,
              currency: 'LKR',
              payment_status: 'refunded',
              payment_gateway: enrollment.payment_method || 'session',
              gateway_transaction_id: enrollment.transaction_id || '',
              metadata: {
                enrollment_id: enrollment.id,
                session_id: enrollment.session_id,
              },
            },
          });
        } catch (e) {
          console.error('Failed to create refund payments record for enrollment:', e);
        }

        return res.json({ bookingId, amount: Number(enrollment.payment_amount || 0), status: 'refunded', processedAt: new Date() });
      }

      return res.status(404).json({ success: false, message: "Payment for booking not found" });
    }

    const metadata: any = payment.metadata || {};

    // Get booking and service info if available
    const booking = await prisma.service_bookings.findUnique({ where: { id: bookingId }, include: { services: true, users: true } });

    const detail = {
      bookingId: bookingId,
      orderId: payment.gateway_order_id,
      amount: Number(payment.amount || 0),
      currency: payment.currency || "LKR",
      paymentStatus: payment.payment_status,
      paymentMethod: payment.payment_method || "",
      transactionId: payment.gateway_transaction_id || null,
      customer: {
        id: booking?.users?.id || payment.user_id || null,
        name: metadata.user_name || `${booking?.users?.first_name || ""} ${booking?.users?.last_name || ""}`.trim(),
        email: metadata.user_email || booking?.users?.email || "",
        phone: (booking?.users?.profile_data as any)?.phone || (metadata.user_phone || ""),
      },
      service: {
        id: booking?.services?.id || metadata.service_id || null,
        title: booking?.services?.title || metadata.service_title || "",
        description: booking?.services?.description || "",
      },
      bookingDetails: booking
        ? {
            date: booking.booking_date?.toISOString().split("T")[0] || "",
            time: booking.booking_time ? booking.booking_time.toString() : "",
            participants: booking.participants_count,
            specialRequests: booking.special_requests || null,
          }
        : {},
      canRefund: payment.payment_status === "completed",
      createdAt: payment.created_at,
      updatedAt: payment.updated_at,
    };

  return res.json({ data: detail });
  } catch (error) {
    console.error("Error fetching booking payment details:", error);
    return res.status(500).json({ success: false, message: "Failed to fetch booking payment details" });
  }
};

// Process booking refund
export const processBookingRefund = async (req: Request, res: Response) => {
  try {
    const bookingId = parseInt(req.params.bookingId, 10);
    if (isNaN(bookingId)) {
      return res.status(400).json({ success: false, message: "Invalid booking id" });
    }

    const { amount, reason, refundType } = req.body || {};

    // Find payment linked to booking via metadata
    const payments = await prisma.payments.findMany({ where: { payment_gateway: "payhere" }, orderBy: { created_at: "desc" } });

    const payment = payments.find((p) => {
      const metadata: any = p.metadata || {};
      return metadata && Number(metadata.booking_id) === bookingId;
    });

    if (!payment) {
      // If no payment record found, it might be a session enrollment
      const enrollment = await prisma.session_enrollments.findUnique({ where: { id: bookingId }, include: { user: true } });
      if (enrollment) {
        if (enrollment.payment_status !== 'completed') {
          return res.status(400).json({ success: false, message: 'Only completed enrollments can be refunded' });
        }

        // Mark enrollment as refunded
        await prisma.session_enrollments.update({
          where: { id: bookingId },
          data: { payment_status: 'refunded', updated_at: new Date() },
        });

        // Record a payments entry for the refund (best-effort)
        try {
          await prisma.payments.create({
            data: {
              user_id: enrollment.user_id || null,
              amount: enrollment.payment_amount || 0,
              currency: 'LKR',
              payment_status: 'refunded',
              payment_gateway: enrollment.payment_method || 'session',
              gateway_transaction_id: enrollment.transaction_id || '',
              metadata: {
                enrollment_id: enrollment.id,
                session_id: enrollment.session_id,
              },
            },
          });
        } catch (e) {
          console.error('Failed to create payments record for enrollment refund:', e);
        }

        return res.json({ bookingId, amount: Number(enrollment.payment_amount || 0), status: 'refunded', processedAt: new Date() });
      }

      // If it's a service booking without a payment record, return a clearer message
      const booking = await prisma.service_bookings.findUnique({ where: { id: bookingId } });
      if (booking) {
        return res.status(400).json({ success: false, message: 'No payment record exists for this booking to refund' });
      }

      return res.status(404).json({ success: false, message: 'Payment for booking not found' });
    }

    if (payment.payment_status !== "completed") {
      return res.status(400).json({ success: false, message: "Only completed payments can be refunded" });
    }

    // In a real integration you'd call the payment gateway refund API here.
    // For now, mark payment as refunded and record refund metadata.
    const updated = await prisma.payments.update({
      where: { id: payment.id },
      data: {
        payment_status: "refunded",
        metadata: {
          ...(payment.metadata as object || {}),
          refund: {
            refundedAt: new Date().toISOString(),
            amount: amount || payment.amount,
            reason: reason || null,
            type: refundType || "full",
          },
        },
        updated_at: new Date(),
      },
    });

    // Also update booking payment status
    await prisma.service_bookings.updateMany({
      where: { id: bookingId },
      data: { payment_status: "refunded", booking_status: "cancelled", updated_at: new Date() },
    });

  return res.json({ bookingId, amount: Number(amount || payment.amount), status: "refunded", processedAt: new Date() });
  } catch (error) {
    console.error("Error processing refund:", error);
    return res.status(500).json({ success: false, message: "Failed to process refund" });
  }
};
