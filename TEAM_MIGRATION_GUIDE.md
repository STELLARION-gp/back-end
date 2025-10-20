# 🔄 Team Migration Guide - Provider Payments Triggers

## 📋 Overview

After pulling the latest changes that include the automated provider payments system, each team member needs to apply the database triggers to their local/development database.

---

## ✅ What You Need to Do

### **Step 1: Pull Latest Changes**

```bash
git pull origin feature/mentorChat
```

### **Step 2: Install Dependencies** (if needed)

```bash
cd back-end
npm install
# or
pnpm install
```

### **Step 3: Apply Database Triggers** ⚠️ **REQUIRED**

This is the **most important step**! Run this command to install the triggers in your database:

```bash
npx tsx scripts/apply-provider-triggers.ts
```

**Expected Output:**
```
🚀 Applying Provider Payment Triggers
✅ Triggers created successfully!
✅ Triggers verified:
   📌 trg_service_booking_provider_payment
   📌 trg_session_enrollment_provider_payment
✅ Functions verified:
   🔧 update_provider_payment
✅ Migration Complete!
```

### **Step 4: Verify Installation**

```bash
npx tsx scripts/test-triggers.ts
```

**Expected Output:**
```
✅ Found 6 triggers
✅ Service booking trigger: Working
✅ Session enrollment trigger: Working
✅ Trigger Test Complete!
```

### **Step 5: Backfill Historical Data** (Optional but Recommended)

Populate `provider_payments` with existing historical data:

```bash
# Preview first
npx tsx scripts/backfill-provider-payments.ts --dry-run

# Then run actual backfill
npx tsx scripts/backfill-provider-payments.ts
```

---

## 🎯 What This Does

The scripts install **database triggers** that automatically update the `provider_payments` table whenever:
- Service bookings are completed
- Session enrollments are completed
- Payment statuses change
- Bookings/enrollments are deleted or refunded

**After installation, the system works automatically!** No manual intervention needed.

---

## 📁 New Files in This PR

```
back-end/
├── prisma/migrations/
│   ├── create_provider_payment_triggers.sql     ← SQL trigger definitions
│   └── rollback_provider_payment_triggers.sql   ← Rollback if needed
├── scripts/
│   ├── apply-provider-triggers.ts               ← Run this!
│   ├── test-triggers.ts                         ← Then test
│   ├── backfill-provider-payments.ts            ← Optional: backfill data
│   └── test-backfill.ts                         ← Test backfill
└── docs/
    ├── INSTALLATION_SUCCESS.md                  ← Installation results
    ├── TRIGGER_QUICK_SETUP.md                   ← Quick reference
    ├── PROVIDER_PAYMENTS_TRIGGER_SYSTEM.md      ← Full technical docs
    └── PROVIDER_PAYMENTS_IMPLEMENTATION.md      ← Complete guide
```

---

## 🔍 Verification Checklist

After running the scripts, verify:

- [ ] **Triggers installed**: Run `npx tsx scripts/test-triggers.ts`
- [ ] **Database connection works**: Check your `.env` has correct `DATABASE_URL`
- [ ] **No errors in output**: All checks should pass ✅
- [ ] **Test in app**: Create a completed booking and check `provider_payments` table

---

## 🐛 Troubleshooting

### Error: "DATABASE_URL is not defined"

**Solution**: Ensure your `.env` file has the database connection string:
```env
DATABASE_URL="postgresql://user:password@localhost:5432/database"
```

### Error: "Cannot find module 'pg'"

**Solution**: Install dependencies:
```bash
npm install
```

### Error: "Permission denied" or "relation does not exist"

**Solution**: Make sure:
1. Your database is running
2. You have the latest Prisma schema: `npx prisma generate`
3. You have run migrations: `npx prisma migrate dev`

### Triggers already exist

**Solution**: No problem! The script handles this gracefully. You'll see warnings but it will work.

To completely reset:
```bash
# Remove old triggers
psql $DATABASE_URL -f prisma/migrations/rollback_provider_payment_triggers.sql

# Re-apply
npx tsx scripts/apply-provider-triggers.ts
```

---

## 🎓 Understanding the System

### Before (Manual)
```typescript
// Admin had to manually generate payments each month
POST /api/provider-payments/generate
Body: { "month": 10, "year": 2025 }
```

### After (Automatic)
```typescript
// Just create completed bookings - triggers handle the rest!
await prisma.service_bookings.create({
  data: {
    payment_status: 'completed', // ← Trigger automatically updates provider_payments
    // ...
  }
});
```

### What Gets Automatically Updated

For each provider, per month:
- ✅ `services_revenue` - Total from completed bookings
- ✅ `services_count` - Number of bookings
- ✅ `sessions_revenue` - Total from completed enrollments
- ✅ `sessions_count` - Number of enrollments
- ✅ `total_revenue` - Services + Sessions
- ✅ `platform_fee` - 10% of total
- ✅ `provider_earnings` - 90% of total
- ✅ `payment_status` - Starts as "pending"

---

## 📞 Need Help?

1. **Check the docs**:
   - `TRIGGER_QUICK_SETUP.md` - Quick start
   - `PROVIDER_PAYMENTS_TRIGGER_SYSTEM.md` - Full technical docs
   - `INSTALLATION_SUCCESS.md` - Installation verification

2. **Run diagnostic tests**:
   ```bash
   # Test triggers
   npx tsx scripts/test-triggers.ts
   
   # Test database connection
   npx prisma studio
   ```

3. **Check database directly**:
   ```sql
   -- View installed triggers
   SELECT trigger_name, event_object_table 
   FROM information_schema.triggers 
   WHERE trigger_name LIKE '%provider_payment%';
   
   -- View installed functions
   SELECT routine_name 
   FROM information_schema.routines 
   WHERE routine_name LIKE '%provider_payment%';
   ```

4. **Ask the team**: Contact the person who committed this feature

---

## 🚨 Important Notes

### For Development Environment
- ✅ **Must run** `apply-provider-triggers.ts` script
- ✅ Safe to run multiple times (idempotent)
- ✅ Can backfill existing data anytime

### For Production Deployment
When deploying to production:

1. **Backup database first**:
   ```bash
   pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
   ```

2. **Apply triggers**:
   ```bash
   npx tsx scripts/apply-provider-triggers.ts
   ```

3. **Verify installation**:
   ```bash
   npx tsx scripts/test-triggers.ts
   ```

4. **Backfill data**:
   ```bash
   # Preview first
   npx tsx scripts/backfill-provider-payments.ts --dry-run
   
   # Then apply
   npx tsx scripts/backfill-provider-payments.ts
   ```

5. **Monitor performance**: Check database logs and query performance

---

## 📊 Quick Reference

| Command | Purpose |
|---------|---------|
| `npx tsx scripts/apply-provider-triggers.ts` | Install triggers (run once) |
| `npx tsx scripts/test-triggers.ts` | Verify triggers work |
| `npx tsx scripts/backfill-provider-payments.ts` | Fill historical data |
| `npx tsx scripts/test-backfill.ts` | Test before backfilling |

---

## ✅ Success Criteria

You'll know everything is working when:

1. ✅ `apply-provider-triggers.ts` completes without errors
2. ✅ `test-triggers.ts` shows all triggers working
3. ✅ Creating a completed booking auto-updates `provider_payments`
4. ✅ API endpoint `/api/provider-payments` returns data
5. ✅ Admin dashboard shows provider payments

---

## 🎉 That's It!

Once you've run the `apply-provider-triggers.ts` script, the system is fully operational and will work automatically. No further manual intervention needed!

**Questions?** Check the documentation files or ask the team.

---

*Last Updated: October 20, 2025*  
*Feature: Automated Provider Payments System*  
*PR: Provider Payment Triggers Implementation*
