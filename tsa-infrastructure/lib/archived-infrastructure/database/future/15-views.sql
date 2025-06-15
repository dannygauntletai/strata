-- =====================================================
-- MATERIALIZED VIEWS FOR PERFORMANCE
-- Real-time dashboard and analytics views
-- =====================================================

-- Real-time dashboard metrics
CREATE MATERIALIZED VIEW school_metrics_current AS
WITH latest_metrics AS (
    SELECT 
        org_id,
        metric_type,
        score,
        measurement_date,
        ROW_NUMBER() OVER (PARTITION BY org_id, metric_type ORDER BY measurement_date DESC) as rn
    FROM quality_metrics
    WHERE measurement_date >= CURRENT_DATE - INTERVAL '7 days'
),
school_stats AS (
    SELECT
        o.id,
        COUNT(DISTINCT e.user_id) as total_students,
        COUNT(DISTINCT CASE WHEN a.status = 'present' THEN a.student_id END) as present_today
    FROM organizations o
    LEFT JOIN enrollments e ON o.id = e.org_id AND e.status = 'active'
    LEFT JOIN attendance_events a ON e.user_id = a.student_id AND a.date = CURRENT_DATE
    WHERE o.type = 'microschool'
    GROUP BY o.id
)
SELECT 
    o.id,
    o.name,
    o.state,
    o.city,
    o.focus_area,
    o.coach_id,
    u.first_name || ' ' || u.last_name as coach_name,
    f.latitude,
    f.longitude,
    ss.total_students,
    ss.present_today,
    MAX(CASE WHEN lm.metric_type = 'love_school' THEN lm.score END) as love_school_score,
    MAX(CASE WHEN lm.metric_type = 'learn_2x' THEN lm.score END) as learn_2x_score,
    MAX(CASE WHEN lm.metric_type = 'life_skills' THEN lm.score END) as life_skills_score,
    MAX(CASE WHEN lm.metric_type = 'parent_satisfaction' THEN lm.score END) as parent_satisfaction_score
FROM organizations o
LEFT JOIN latest_metrics lm ON o.id = lm.org_id AND lm.rn = 1
LEFT JOIN school_stats ss ON o.id = ss.id
LEFT JOIN users u ON o.coach_id = u.id
LEFT JOIN facilities f ON o.facility_id = f.id
WHERE o.type = 'microschool' AND o.status = 'active'
GROUP BY o.id, o.name, o.state, o.city, o.focus_area, o.coach_id, u.first_name, u.last_name, f.latitude, f.longitude, ss.total_students, ss.present_today;

CREATE UNIQUE INDEX ON school_metrics_current(id);

-- Lead funnel metrics
CREATE MATERIALIZED VIEW lead_funnel_metrics AS
WITH funnel_data AS (
    SELECT 
        fs.funnel_type,
        fs.stage_name,
        fs.stage_order,
        COUNT(DISTINCT lsh.lead_id) as leads_in_stage,
        AVG(EXTRACT(EPOCH FROM (COALESCE(lsh.exited_at, NOW()) - lsh.entered_at))/3600) as avg_hours_in_stage
    FROM funnel_stages fs
    LEFT JOIN lead_stage_history lsh ON fs.id = lsh.stage_id
    WHERE lsh.entered_at >= CURRENT_DATE - INTERVAL '30 days'
    GROUP BY fs.funnel_type, fs.stage_name, fs.stage_order
)
SELECT 
    *,
    SUM(leads_in_stage) OVER (PARTITION BY funnel_type ORDER BY stage_order DESC) as cumulative_leads,
    CASE 
        WHEN LAG(leads_in_stage) OVER (PARTITION BY funnel_type ORDER BY stage_order) > 0 
        THEN leads_in_stage::float / LAG(leads_in_stage) OVER (PARTITION BY funnel_type ORDER BY stage_order)
        ELSE 1
    END as stage_conversion_rate
FROM funnel_data; 