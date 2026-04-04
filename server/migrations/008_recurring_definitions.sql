-- Create recurring_definitions table
CREATE TABLE recurring_definitions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  section_id UUID NOT NULL REFERENCES sections(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium',
  recurrence_rule TEXT NOT NULL,
  next_due_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add FK from tasks to recurring_definitions
ALTER TABLE tasks
  ADD COLUMN recurring_definition_id UUID REFERENCES recurring_definitions(id) ON DELETE SET NULL;

-- Index for scheduler: find active definitions due today or earlier
CREATE INDEX idx_recurring_definitions_active_due ON recurring_definitions(next_due_date)
  WHERE is_active = true;

-- Index for idempotency check: find tasks by definition + due_date
CREATE INDEX idx_tasks_recurring_def_due ON tasks(recurring_definition_id, due_date)
  WHERE recurring_definition_id IS NOT NULL;

-- Migrate existing recurring tasks to recurring_definitions
-- For each incomplete task with a recurrence_rule and due_date, create a definition
INSERT INTO recurring_definitions (user_id, section_id, title, description, priority, recurrence_rule, next_due_date)
SELECT
  s.user_id,
  t.section_id,
  t.title,
  t.description,
  t.priority,
  t.recurrence_rule,
  CASE
    WHEN t.recurrence_rule = 'daily' THEN (t.due_date + INTERVAL '1 day')::date
    WHEN t.recurrence_rule = 'weekly' THEN (t.due_date + INTERVAL '7 days')::date
    WHEN t.recurrence_rule = 'monthly' THEN (t.due_date + INTERVAL '1 month')::date
    WHEN t.recurrence_rule = 'yearly' THEN (t.due_date + INTERVAL '1 year')::date
    ELSE (t.due_date + INTERVAL '1 month')::date
  END
FROM tasks t
JOIN sections s ON s.id = t.section_id
WHERE t.recurrence_rule IS NOT NULL
  AND t.is_completed = false
  AND t.due_date IS NOT NULL;

-- Link existing tasks to their new definitions
UPDATE tasks t SET recurring_definition_id = rd.id
FROM recurring_definitions rd
WHERE rd.section_id = t.section_id
  AND rd.title = t.title
  AND rd.recurrence_rule = t.recurrence_rule
  AND t.recurrence_rule IS NOT NULL
  AND t.is_completed = false
  AND t.due_date IS NOT NULL;
