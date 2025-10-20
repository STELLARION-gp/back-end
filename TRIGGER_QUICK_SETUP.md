# 🚀 Provider Payments Trigger System - Quick Setup

## What This Does

Automatically updates `provider_payments` table whenever:
- ✅ Service booking is completed
- ✅ Session enrollment is completed
- ✅ Payment status changes (pending ↔ completed ↔ refunded)
- ✅ Completed booking/enrollment is deleted

**No manual updates needed!** The database handles everything.

---

## 📦 3-Step Setup

### **Step 1: Install Triggers** ⚙️

```bash
cd back-end
npx tsx scripts/apply-provider-triggers.ts
```

**What it does**:
- Creates database triggers on `service_bookings` and `session_enrollments`
- Installs calculation functions
- Adds performance indexes

**Expected output**:
```
✅ Triggers created successfully!
✅ Triggers verified:
   📌 trg_service_booking_provider_payment
   📌 trg_session_enrollment_provider_payment
✅ Migration Complete!
```

---

### **Step 2: Test Triggers** 🧪

```bash
npx tsx scripts/test-triggers.ts
```

**What it does**:
- Verifies triggers are installed
- Tests with your existing data
- Confirms auto-updates work

**Expected output**:
```
✅ Found 2 triggers
✅ Service booking trigger: Working
✅ Session enrollment trigger: Working
✅ Trigger Test Complete!
```

---

### **Step 3: Backfill Existing Data** 📊

```bash
npx tsx scripts/backfill-provider-payments.ts
```

**What it does**:
- Fills `provider_payments` with historical data
- Processes all completed bookings/enrollments
- Creates payment records for all providers

**Expected output**:
```
✅ Backfill Complete!
📊 Final Summary:
   ✨ Records Created: 145
   🔄 Records Updated: 23
```

---

## ✅ You're Done!

From now on, **provider_payments automatically updates** when:

```typescript
// Example 1: New booking completed
await prisma.service_bookings.create({
  data: {
    service_id: 123,
    payment_status: 'completed', // ← Trigger fires!
    total_amount: 5000,
    // ... other fields
  }
});
// ✅ provider_payments automatically updated!

// Example 2: Status changed
await prisma.service_bookings.update({
  where: { id: 456 },
  data: { 
    payment_status: 'completed' // ← Trigger fires!
  }
});
// ✅ provider_payments automatically updated!
```

---

## 🔍 Verify It's Working

### Check in Database
```sql
-- See recent provider payments
SELECT * FROM provider_payments 
ORDER BY updated_at DESC 
LIMIT 10;
```

### Check via API
```bash
curl http://localhost:3000/api/provider-payments/stats
```

### Test with New Booking
1. Create a new service booking with `payment_status = 'completed'`
2. Check `provider_payments` table
3. Should see updated revenue for that provider/month

---

## 📊 What Gets Calculated

For each provider, per month:

```
Services Revenue = SUM(completed bookings amounts)
Sessions Revenue = SUM(completed enrollments amounts)
Total Revenue = Services + Sessions
Platform Fee = Total × 10%
Provider Earnings = Total × 90%
```

**Auto-updates on**:
- New completed transactions
- Status changes
- Deletions
- Amount changes

---

## 🎯 Key Features

| Feature | Description |
|---------|-------------|
| **Real-time** | Updates instantly when transaction completes |
| **Automatic** | No manual intervention needed |
| **Comprehensive** | Handles inserts, updates, deletes |
| **Accurate** | Always reflects current state |
| **Efficient** | Only recalculates affected month/provider |
| **Safe** | Never deletes paid records |

---

## 🔄 Old vs New

### Before (Manual)
```bash
# Admin had to manually run this every month
POST /api/provider-payments/generate
Body: { "month": 10, "year": 2025 }
```

### After (Automatic)
```
✅ Nothing to do!
Triggers handle everything automatically.
```

---

## 🐛 Troubleshooting

### Triggers not installed?
```bash
# Re-run installation
npx tsx scripts/apply-provider-triggers.ts
```

### Want to verify?
```bash
# Run test script
npx tsx scripts/test-triggers.ts
```

### Need to remove triggers?
```bash
# Run rollback SQL
psql $DATABASE_URL -f prisma/migrations/rollback_provider_payment_triggers.sql
```

---

## 📚 More Info

- **Full Documentation**: `PROVIDER_PAYMENTS_TRIGGER_SYSTEM.md`
- **Trigger SQL**: `prisma/migrations/create_provider_payment_triggers.sql`
- **Test Script**: `scripts/test-triggers.ts`
- **Backfill Guide**: `PROVIDER_PAYMENTS_BACKFILL_GUIDE.md`

---

## ✨ Summary

1. **Install**: `npx tsx scripts/apply-provider-triggers.ts`
2. **Test**: `npx tsx scripts/test-triggers.ts`
3. **Backfill**: `npx tsx scripts/backfill-provider-payments.ts`
4. **Done!** Enjoy automatic updates! 🎉

**No more manual generation needed!** The system is fully automated. 🚀
