-- =====================================================
-- ROLLBACK SCRIPT FOR PROVIDER PAYMENT TRIGGERS
-- =====================================================
-- This script removes all triggers and functions created
-- for automated provider_payments updates
-- =====================================================

-- Drop triggers
DROP TRIGGER IF EXISTS trg_service_booking_provider_payment ON service_bookings;
DROP TRIGGER IF EXISTS trg_session_enrollment_provider_payment ON session_enrollments;

-- Drop functions
DROP FUNCTION IF EXISTS trigger_update_provider_payment_from_booking();
DROP FUNCTION IF EXISTS trigger_update_provider_payment_from_enrollment();
DROP FUNCTION IF EXISTS update_provider_payment(INT, INT, INT);

-- Drop indexes (optional - these may be useful for other queries)
-- DROP INDEX IF EXISTS idx_service_bookings_provider_payment;
-- DROP INDEX IF EXISTS idx_session_enrollments_provider_payment;
-- DROP INDEX IF EXISTS idx_services_created_by;
-- DROP INDEX IF EXISTS idx_sessions_created_by;

-- =====================================================
-- Verification query
-- =====================================================
-- To verify triggers are removed, run:
-- SELECT trigger_name, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%provider_payment%';
