package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type Scheduler struct {
	reminders *repository.ReminderRepo
	interval  time.Duration
}

func New(reminders *repository.ReminderRepo) *Scheduler {
	return &Scheduler{
		reminders: reminders,
		interval:  60 * time.Second,
	}
}

// Start launches the background loop. Cancel ctx to stop.
func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	log.Println("[scheduler] started, checking every", s.interval)

	// Run immediately on start
	s.tick(ctx)

	for {
		select {
		case <-ctx.Done():
			log.Println("[scheduler] stopped")
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

func (s *Scheduler) tick(ctx context.Context) {
	reminders, err := s.reminders.ListPendingDue(ctx, time.Now())
	if err != nil {
		log.Printf("[scheduler] error listing pending reminders: %v", err)
		return
	}

	for _, rm := range reminders {
		if err := s.reminders.MarkSentAndScheduleNext(ctx, rm.ID); err != nil {
			log.Printf("[scheduler] error processing reminder %s: %v", rm.ID, err)
			continue
		}
		log.Printf("[scheduler] processed reminder %s (task=%s, recurrence=%v)", rm.ID, rm.TaskID, rm.RecurrenceRule)
	}
}
