-- Add recurrence rule to reminders
-- Format: 'daily' | 'weekly' | 'monthly' | 'yearly' | 'every_N_days' | 'every_N_weeks' | 'every_N_months'
ALTER TABLE reminders
  ADD COLUMN recurrence_rule TEXT DEFAULT NULL;

-- Add recurrence rule to tasks
ALTER TABLE tasks
  ADD COLUMN recurrence_rule TEXT DEFAULT NULL;

-- Index for the scheduler: find unsent, due reminders efficiently
CREATE INDEX idx_reminders_pending ON reminders(remind_at)
  WHERE is_sent = FALSE;
