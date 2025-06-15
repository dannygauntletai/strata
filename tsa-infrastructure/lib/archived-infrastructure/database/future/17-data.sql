-- =====================================================
-- INITIAL DATA SETUP
-- Seed data for funnel stages and scoring rules
-- =====================================================

-- Insert default funnel stages
INSERT INTO funnel_stages (funnel_type, stage_name, stage_order, conversion_actions) VALUES
-- Parent funnel
('parent', 'Awareness', 1, '["ad_click", "organic_visit", "referral"]'),
('parent', 'Interest', 2, '["download_brochure", "watch_video", "read_3_pages", "chat_interaction"]'),
('parent', 'Consideration', 3, '["schedule_tour", "start_application", "request_info"]'),
('parent', 'Intent', 4, '["complete_application", "submit_documents", "shadow_day_scheduled"]'),
('parent', 'Enrollment', 5, '["sign_agreement", "submit_esa", "make_payment"]'),
-- Coach funnel
('coach', 'Awareness', 1, '["ad_click", "organic_visit", "referral"]'),
('coach', 'Interest', 2, '["read_coach_info", "download_guide", "watch_webinar"]'),
('coach', 'Application', 3, '["start_application", "submit_application"]'),
('coach', 'Vetting', 4, '["background_check_consent", "interview_scheduled", "references_submitted"]'),
('coach', 'Onboarding', 5, '["llc_created", "training_started", "facility_identified"]'),
('coach', 'Launch', 6, '["first_student_enrolled", "school_active"]');

-- Insert default lead scoring rules
INSERT INTO lead_scoring_rules (name, condition_type, condition_details, points) VALUES
-- Positive behaviors
('Page View', 'behavior', '{"event": "page_view"}', 1),
('Return Visit', 'behavior', '{"event": "return_visit"}', 5),
('Form Start', 'behavior', '{"event": "form_start"}', 10),
('Form Complete', 'behavior', '{"event": "form_complete"}', 25),
('Resource Download', 'behavior', '{"event": "download_resource"}', 15),
('Video 50% Complete', 'behavior', '{"event": "video_50_percent"}', 10),
('Video 100% Complete', 'behavior', '{"event": "video_100_percent"}', 20),
('Schedule Tour', 'behavior', '{"event": "schedule_tour"}', 50),
('Attend Event', 'behavior', '{"event": "attend_event"}', 40),
('Email Open', 'engagement', '{"event": "email_open"}', 2),
('Email Click', 'engagement', '{"event": "email_click"}', 5),
('Chat Interaction', 'engagement', '{"event": "chat_interaction"}', 15),
-- Demographics
('Target Location', 'demographic', '{"state": ["TX"]}', 20),
('Has Children', 'demographic', '{"has_children": true}', 30),
('Sports Interest', 'demographic', '{"interests": ["sports"]}', 25),
-- Negative behaviors
('Email Bounce', 'negative', '{"event": "email_bounce"}', -10),
('Unsubscribe', 'negative', '{"event": "unsubscribe"}', -50),
('No Show', 'negative', '{"event": "no_show_event"}', -30); 