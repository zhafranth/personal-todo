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
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, wibLocation)

	defs, err := s.repo.ListDueForGeneration(ctx, today)
	if err != nil {
		log.Printf("[recurring-scheduler] error listing due definitions: %v", err)
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
