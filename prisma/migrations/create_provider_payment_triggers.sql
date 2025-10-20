-- =====================================================
-- AUTOMATED PROVIDER PAYMENTS TRIGGER SYSTEM
-- =====================================================
-- This creates database triggers that automatically update
-- provider_payments table when bookings/enrollments are completed
-- =====================================================

-- =====================================================
-- FUNCTION: Calculate and update provider payment for a specific month/year
-- =====================================================
CREATE OR REPLACE FUNCTION update_provider_payment(
    p_provider_id INT,
    p_month INT,
    p_year INT
) RETURNS void AS $$
DECLARE
    v_provider_name TEXT;
    v_provider_email TEXT;
    v_provider_type TEXT;
    v_services_revenue NUMERIC(10,2);
    v_services_count INT;
    v_sessions_revenue NUMERIC(10,2);
    v_sessions_count INT;
    v_total_revenue NUMERIC(10,2);
    v_platform_fee NUMERIC(10,2);
    v_provider_earnings NUMERIC(10,2);
    v_start_date TIMESTAMP;
    v_end_date TIMESTAMP;
    v_existing_id INT;
BEGIN
    -- Calculate date range for the month
    v_start_date := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1));
    v_end_date := DATE_TRUNC('month', MAKE_DATE(p_year, p_month, 1)) + INTERVAL '1 month' - INTERVAL '1 second';

    -- Get provider details
    SELECT 
        CONCAT(first_name, ' ', last_name),
        email,
        role::TEXT
    INTO v_provider_name, v_provider_email, v_provider_type
    FROM users
    WHERE id = p_provider_id
        AND is_active = true
        AND role IN ('guide', 'influencer');

    -- Exit if provider not found or not active
    IF v_provider_name IS NULL THEN
        RETURN;
    END IF;

    -- Calculate service bookings revenue
    SELECT 
        COALESCE(SUM(sb.total_amount), 0),
        COUNT(*)
    INTO v_services_revenue, v_services_count
    FROM service_bookings sb
    INNER JOIN services s ON sb.service_id = s.id
    WHERE s.created_by = p_provider_id
        AND sb.payment_status = 'completed'
        AND sb.created_at >= v_start_date
        AND sb.created_at <= v_end_date;

    -- Calculate session enrollments revenue
    SELECT 
        COALESCE(SUM(se.payment_amount), 0),
        COUNT(*)
    INTO v_sessions_revenue, v_sessions_count
    FROM session_enrollments se
    INNER JOIN sessions sess ON se.session_id = sess.id
    WHERE sess.created_by = p_provider_id
        AND se.payment_status = 'completed'
        AND se.enrollment_date >= v_start_date
        AND se.enrollment_date <= v_end_date;

    -- Calculate totals
    v_total_revenue := v_services_revenue + v_sessions_revenue;
    v_platform_fee := v_total_revenue * 0.10;
    v_provider_earnings := v_total_revenue * 0.90;

    -- Only proceed if there's revenue
    IF v_total_revenue > 0 THEN
        -- Check if payment record exists
        SELECT id INTO v_existing_id
        FROM provider_payments
        WHERE provider_id = p_provider_id
            AND month = p_month
            AND year = p_year;

        IF v_existing_id IS NOT NULL THEN
            -- Update existing record
            UPDATE provider_payments
            SET 
                provider_name = v_provider_name,
                provider_email = v_provider_email,
                provider_type = v_provider_type,
                services_revenue = v_services_revenue,
                services_count = v_services_count,
                sessions_revenue = v_sessions_revenue,
                sessions_count = v_sessions_count,
                total_revenue = v_total_revenue,
                platform_fee = v_platform_fee,
                provider_earnings = v_provider_earnings,
                updated_at = NOW()
            WHERE id = v_existing_id;
        ELSE
            -- Create new record
            INSERT INTO provider_payments (
                provider_id,
                provider_name,
                provider_email,
                provider_type,
                month,
                year,
                services_revenue,
                services_count,
                sessions_revenue,
                sessions_count,
                total_revenue,
                platform_fee,
                provider_earnings,
                payment_status,
                created_at,
                updated_at
            ) VALUES (
                p_provider_id,
                v_provider_name,
                v_provider_email,
                v_provider_type,
                p_month,
                p_year,
                v_services_revenue,
                v_services_count,
                v_sessions_revenue,
                v_sessions_count,
                v_total_revenue,
                v_platform_fee,
                v_provider_earnings,
                'pending',
                NOW(),
                NOW()
            );
        END IF;
    ELSE
        -- If revenue is 0, delete the payment record if it exists
        DELETE FROM provider_payments
        WHERE provider_id = p_provider_id
            AND month = p_month
            AND year = p_year
            AND payment_status = 'pending'; -- Only delete unpaid records
    END IF;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Handle service_bookings changes
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_provider_payment_from_booking()
RETURNS TRIGGER AS $$
DECLARE
    v_provider_id INT;
    v_month INT;
    v_year INT;
    v_old_month INT;
    v_old_year INT;
BEGIN
    -- Handle INSERT and UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Only process if payment_status is 'completed'
        IF NEW.payment_status = 'completed' THEN
            -- Get provider_id from services table
            SELECT created_by INTO v_provider_id
            FROM services
            WHERE id = NEW.service_id;

            -- Extract month and year from created_at
            v_month := EXTRACT(MONTH FROM NEW.created_at);
            v_year := EXTRACT(YEAR FROM NEW.created_at);

            -- Update provider payment
            PERFORM update_provider_payment(v_provider_id, v_month, v_year);
        END IF;

        -- If UPDATE and status changed FROM completed, recalculate old month
        IF (TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' AND NEW.payment_status != 'completed') THEN
            SELECT created_by INTO v_provider_id
            FROM services
            WHERE id = OLD.service_id;

            v_old_month := EXTRACT(MONTH FROM OLD.created_at);
            v_old_year := EXTRACT(YEAR FROM OLD.created_at);

            PERFORM update_provider_payment(v_provider_id, v_old_month, v_old_year);
        END IF;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        IF OLD.payment_status = 'completed' THEN
            SELECT created_by INTO v_provider_id
            FROM services
            WHERE id = OLD.service_id;

            v_month := EXTRACT(MONTH FROM OLD.created_at);
            v_year := EXTRACT(YEAR FROM OLD.created_at);

            PERFORM update_provider_payment(v_provider_id, v_month, v_year);
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- TRIGGER FUNCTION: Handle session_enrollments changes
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_update_provider_payment_from_enrollment()
RETURNS TRIGGER AS $$
DECLARE
    v_provider_id INT;
    v_month INT;
    v_year INT;
    v_old_month INT;
    v_old_year INT;
BEGIN
    -- Handle INSERT and UPDATE
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        -- Only process if payment_status is 'completed'
        IF NEW.payment_status = 'completed' THEN
            -- Get provider_id from sessions table
            SELECT created_by INTO v_provider_id
            FROM sessions
            WHERE id = NEW.session_id;

            -- Extract month and year from enrollment_date
            v_month := EXTRACT(MONTH FROM NEW.enrollment_date);
            v_year := EXTRACT(YEAR FROM NEW.enrollment_date);

            -- Update provider payment
            PERFORM update_provider_payment(v_provider_id, v_month, v_year);
        END IF;

        -- If UPDATE and status changed FROM completed, recalculate old month
        IF (TG_OP = 'UPDATE' AND OLD.payment_status = 'completed' AND NEW.payment_status != 'completed') THEN
            SELECT created_by INTO v_provider_id
            FROM sessions
            WHERE id = OLD.session_id;

            v_old_month := EXTRACT(MONTH FROM OLD.enrollment_date);
            v_old_year := EXTRACT(YEAR FROM OLD.enrollment_date);

            PERFORM update_provider_payment(v_provider_id, v_old_month, v_old_year);
        END IF;
    END IF;

    -- Handle DELETE
    IF (TG_OP = 'DELETE') THEN
        IF OLD.payment_status = 'completed' THEN
            SELECT created_by INTO v_provider_id
            FROM sessions
            WHERE id = OLD.session_id;

            v_month := EXTRACT(MONTH FROM OLD.enrollment_date);
            v_year := EXTRACT(YEAR FROM OLD.enrollment_date);

            PERFORM update_provider_payment(v_provider_id, v_month, v_year);
        END IF;
        RETURN OLD;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- DROP EXISTING TRIGGERS (if they exist)
-- =====================================================
DROP TRIGGER IF EXISTS trg_service_booking_provider_payment ON service_bookings;
DROP TRIGGER IF EXISTS trg_session_enrollment_provider_payment ON session_enrollments;

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Trigger for service_bookings
CREATE TRIGGER trg_service_booking_provider_payment
    AFTER INSERT OR UPDATE OR DELETE
    ON service_bookings
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_provider_payment_from_booking();

-- Trigger for session_enrollments
CREATE TRIGGER trg_session_enrollment_provider_payment
    AFTER INSERT OR UPDATE OR DELETE
    ON session_enrollments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_update_provider_payment_from_enrollment();

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Index for faster lookups when calculating revenue
CREATE INDEX IF NOT EXISTS idx_service_bookings_provider_payment 
    ON service_bookings(service_id, payment_status, created_at);

CREATE INDEX IF NOT EXISTS idx_session_enrollments_provider_payment 
    ON session_enrollments(session_id, payment_status, enrollment_date);

CREATE INDEX IF NOT EXISTS idx_services_created_by 
    ON services(created_by);

CREATE INDEX IF NOT EXISTS idx_sessions_created_by 
    ON sessions(created_by);

-- =====================================================
-- COMMENTS FOR DOCUMENTATION
-- =====================================================

COMMENT ON FUNCTION update_provider_payment(INT, INT, INT) IS 
'Calculates and updates provider_payments for a specific provider and month. 
Automatically handles insert/update/delete of payment records based on revenue.';

COMMENT ON FUNCTION trigger_update_provider_payment_from_booking() IS 
'Trigger function that updates provider_payments when service_bookings are modified.
Triggers on INSERT, UPDATE, DELETE with payment_status = completed.';

COMMENT ON FUNCTION trigger_update_provider_payment_from_enrollment() IS 
'Trigger function that updates provider_payments when session_enrollments are modified.
Triggers on INSERT, UPDATE, DELETE with payment_status = completed.';

COMMENT ON TRIGGER trg_service_booking_provider_payment ON service_bookings IS 
'Automatically updates provider_payments when service bookings are completed, modified, or deleted.';

COMMENT ON TRIGGER trg_session_enrollment_provider_payment ON session_enrollments IS 
'Automatically updates provider_payments when session enrollments are completed, modified, or deleted.';

-- =====================================================
-- END OF TRIGGER SYSTEM
-- =====================================================

-- To verify triggers are installed, run:
-- SELECT trigger_name, event_manipulation, event_object_table 
-- FROM information_schema.triggers 
-- WHERE trigger_name LIKE '%provider_payment%';
