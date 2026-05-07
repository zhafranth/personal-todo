package scheduler

import (
	"context"
	"log"
	"time"

	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

var wibLocation *time.Location

func init() {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		log.Fatalf("failed to load Asia/Jakarta timezone: %v", err)
	}
	wibLocation = loc
}

type RecurringScheduler struct {
	repo *repository.RecurringDefinitionRepo
}

func NewRecurringScheduler(repo *repository.RecurringDefinitionRepo) *RecurringScheduler {
	return &RecurringScheduler{repo: repo}
}

// Start launches the recurring task generation loop. Cancel ctx to stop.
func (s *RecurringScheduler) Start(ctx context.Context) {
	log.Println("[recurring-scheduler] started")
	s.generate(ctx)

	for {
		now := time.Now().In(wibLocation)
		// Next midnight WIB
		nextMidnight := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, wibLocation)
		until := nextMidnight.Sub(now)

		select {
		case <-ctx.Done():
			log.Println("[recurring-scheduler] stopped")
			return
		case <-time.After(until):
			s.generate(ctx)
		}
	}
}

func (s *RecurringScheduler) generate(ctx context.Context) {
	now := time.Now().In(wibLocation)
	// Use start of next WIB day as the threshold. The next_due_date column is DATE,
	// which PostgreSQL compares as midnight UTC. WIB is UTC+7, so midnight WIB is
	// 17:00 UTC the previous day — causing today's DATE entries to fail a naive
	// midnight-WIB comparison. Comparing against tomorrow WIB midnight correctly
	// includes all dates <= today WIB.
	upTo := time.Date(now.Year(), now.Month(), now.Day()+1, 0, 0, 0, 0, wibLocation)

	// Loop to drain all missed periods (e.g., daily task after 5 days of downtime).
	// Each iteration generates one task per definition and advances next_due_date.
	// The loop re-queries until no more definitions are due.
	for {
		defs, err := s.repo.ListDueForGeneration(ctx, upTo)
		if err != nil {
			log.Printf("[recurring-scheduler] error listing due definitions: %v", err)
			return
		}
		if len(defs) == 0 {
			return
		}

		for _, def := range defs {
			created, err := s.repo.GenerateTask(ctx, def)
			if err != nil {
				log.Printf("[recurring-scheduler] error generating task for definition %s: %v", def.ID, err)
				continue
			}
			if created {
				log.Printf("[recurring-scheduler] created task for definition %s (title=%q)", def.ID, def.Title)
			} else {
				log.Printf("[recurring-scheduler] skipped definition %s (task already exists for due date)", def.ID)
			}
		}
	}
}
