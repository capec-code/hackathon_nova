-- LEADERBOARD & STATS VIEWS
-- Run in Supabase SQL Editor

-- 1. ITEC-PEC Stats
CREATE OR REPLACE VIEW volunteer_stats_itecpec AS
WITH task_stats AS (
    SELECT volunteer_id, 
           COUNT(*) as tasks_count, 
           COALESCE(SUM(duration_minutes), 0) as task_minutes
    FROM tasks_itecpec 
    WHERE status = 'approved'
    GROUP BY volunteer_id
),
att_stats AS (
    SELECT volunteer_id, 
           COALESCE(SUM(duration_minutes), 0) as att_minutes
    FROM attendance_itecpec 
    WHERE status = 'approved'
    GROUP BY volunteer_id
)
SELECT 
    v.id,
    v.name,
    v.unique_code,
    (COALESCE(a.att_minutes, 0) + COALESCE(t.task_minutes, 0)) as total_minutes,
    COALESCE(t.tasks_count, 0) as tasks_completed,
    RANK() OVER (ORDER BY (COALESCE(a.att_minutes, 0) + COALESCE(t.task_minutes, 0)) DESC, COALESCE(t.tasks_count, 0) DESC) as rank
FROM volunteers_itecpec v
LEFT JOIN att_stats a ON a.volunteer_id = v.id
LEFT JOIN task_stats t ON t.volunteer_id = v.id;

-- 2. CAPEC Stats
CREATE OR REPLACE VIEW volunteer_stats_capec AS
WITH task_stats AS (
    SELECT volunteer_id, 
           COUNT(*) as tasks_count, 
           COALESCE(SUM(duration_minutes), 0) as task_minutes
    FROM tasks_capec 
    WHERE status = 'approved'
    GROUP BY volunteer_id
),
att_stats AS (
    SELECT volunteer_id, 
           COALESCE(SUM(duration_minutes), 0) as att_minutes
    FROM attendance_capec 
    WHERE status = 'approved'
    GROUP BY volunteer_id
)
SELECT 
    v.id,
    v.name,
    v.unique_code,
    (COALESCE(a.att_minutes, 0) + COALESCE(t.task_minutes, 0)) as total_minutes,
    COALESCE(t.tasks_count, 0) as tasks_completed,
    RANK() OVER (ORDER BY (COALESCE(a.att_minutes, 0) + COALESCE(t.task_minutes, 0)) DESC, COALESCE(t.tasks_count, 0) DESC) as rank
FROM volunteers_capec v
LEFT JOIN att_stats a ON a.volunteer_id = v.id
LEFT JOIN task_stats t ON t.volunteer_id = v.id;

-- 3. Grant Permissions
GRANT SELECT ON volunteer_stats_itecpec TO authenticated;
GRANT SELECT ON volunteer_stats_itecpec TO anon;
GRANT SELECT ON volunteer_stats_capec TO authenticated;
GRANT SELECT ON volunteer_stats_capec TO anon;

-- Refresh API Cache
NOTIFY pgrst, 'reload schema';
