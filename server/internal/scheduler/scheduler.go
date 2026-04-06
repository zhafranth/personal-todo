package scheduler

import (
	"context"
	"encoding/json"
	"log"
	"net/http"
	"time"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/zhafrantharif/personal-todo/server/internal/repository"
)

type VAPIDConfig struct {
	PublicKey  string
	PrivateKey string
	Subject    string
}

type Scheduler struct {
	reminders *repository.ReminderRepo
	pushSubs  *repository.PushSubscriptionRepo
	vapid     VAPIDConfig
	interval  time.Duration
}

func New(reminders *repository.ReminderRepo, pushSubs *repository.PushSubscriptionRepo, vapid VAPIDConfig) *Scheduler {
	return &Scheduler{
		reminders: reminders,
		pushSubs:  pushSubs,
		vapid:     vapid,
		interval:  60 * time.Second,
	}
}

func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	log.Println("[scheduler] started, checking every", s.interval)
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

type pushPayload struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	Data  struct {
		TaskID string `json:"taskId"`
	} `json:"data"`
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
		log.Printf("[scheduler] processed reminder %s (task=%s)", rm.ID, rm.TaskID)

		s.sendPushNotifications(ctx, rm.UserID, rm.TaskTitle, rm.TaskID)
	}
}

func (s *Scheduler) sendPushNotifications(ctx context.Context, userID, taskTitle, taskID string) {
	if s.vapid.PublicKey == "" || s.vapid.PrivateKey == "" {
		return
	}

	subs, err := s.pushSubs.ListByUser(ctx, userID)
	if err != nil {
		log.Printf("[scheduler] error fetching push subs for user %s: %v", userID, err)
		return
	}

	payload := pushPayload{
		Title: "Reminder",
		Body:  taskTitle,
	}
	payload.Data.TaskID = taskID

	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		log.Printf("[scheduler] error marshaling push payload: %v", err)
		return
	}

	for _, sub := range subs {
		resp, err := webpush.SendNotification(payloadBytes, &webpush.Subscription{
			Endpoint: sub.Endpoint,
			Keys: webpush.Keys{
				P256dh: sub.P256dh,
				Auth:   sub.Auth,
			},
		}, &webpush.Options{
			Subscriber:      s.vapid.Subject,
			VAPIDPublicKey:  s.vapid.PublicKey,
			VAPIDPrivateKey: s.vapid.PrivateKey,
			TTL:             60,
		})
		if err != nil {
			log.Printf("[scheduler] error sending push to %s: %v", sub.Endpoint, err)
			continue
		}
		resp.Body.Close()

		if resp.StatusCode == http.StatusGone || resp.StatusCode == http.StatusNotFound {
			log.Printf("[scheduler] removing expired subscription %s", sub.ID)
			_ = s.pushSubs.DeleteByEndpoint(ctx, sub.Endpoint)
		}
	}
}
