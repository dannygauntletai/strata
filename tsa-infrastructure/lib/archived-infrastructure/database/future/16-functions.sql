-- =====================================================
-- DATABASE FUNCTIONS AND TRIGGERS
-- Standard PostgreSQL functions and triggers
-- =====================================================

-- Function to log data export events (replaces S3 export)
CREATE OR REPLACE FUNCTION log_daily_metrics_export()
RETURNS VOID AS $$
DECLARE
    v_date DATE := CURRENT_DATE - 1;
    v_record_count INTEGER;
BEGIN
    -- Log quality metrics export event
    SELECT COUNT(*) INTO v_record_count
    FROM quality_metrics 
    WHERE measurement_date = v_date;
    
    INSERT INTO audit_logs (
        entity_type,
        action,
        entity_id,
        details,
        created_at
    ) VALUES (
        'quality_metrics',
        'export_requested',
        v_date::text,
        json_build_object(
            'export_date', v_date,
            'record_count', v_record_count,
            'export_type', 'daily_metrics'
        ),
        NOW()
    );
    
    -- Log attendance export event
    SELECT COUNT(*) INTO v_record_count
    FROM attendance_events 
    WHERE date = v_date;
    
    INSERT INTO audit_logs (
        entity_type,
        action,
        entity_id,
        details,
        created_at
    ) VALUES (
        'attendance_events',
        'export_requested',
        v_date::text,
        json_build_object(
            'export_date', v_date,
            'record_count', v_record_count,
            'export_type', 'daily_metrics'
        ),
        NOW()
    );
END;
$$ LANGUAGE plpgsql;

-- Function to trigger lead scoring (replaces Lambda integration)
CREATE OR REPLACE FUNCTION trigger_lead_scoring()
RETURNS TRIGGER AS $$
BEGIN
    -- Log lead scoring trigger event for external processing
    INSERT INTO audit_logs (
        entity_type,
        action,
        entity_id,
        details,
        created_at
    ) VALUES (
        'lead_touchpoints',
        'scoring_triggered',
        NEW.lead_id::text,
        json_build_object(
            'touchpoint_id', NEW.touchpoint_id,
            'event_type', TG_ARGV[0],
            'timestamp', NOW(),
            'lead_id', NEW.lead_id
        ),
        NOW()
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for lead scoring
CREATE TRIGGER lead_touchpoint_scoring
    AFTER INSERT ON lead_touchpoints
    FOR EACH ROW
    EXECUTE FUNCTION trigger_lead_scoring('touchpoint'); 