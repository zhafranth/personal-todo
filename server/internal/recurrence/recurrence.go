package recurrence

import (
	"fmt"
	"strconv"
	"strings"
	"time"
)

// Validate returns nil if rule is a recognized recurrence format.
func Validate(rule string) error {
	switch rule {
	case "daily", "weekly", "monthly", "yearly", "monthly_last_day":
		return nil
	}

	if strings.HasPrefix(rule, "every_") {
		parts := strings.Split(rule, "_")
		if len(parts) != 3 {
			return fmt.Errorf("unrecognized recurrence rule: %s", rule)
		}
		n, err := strconv.Atoi(parts[1])
		if err != nil || n < 1 || n > 365 {
			return fmt.Errorf("invalid interval N=%s: must be 1-365", parts[1])
		}
		switch parts[2] {
		case "days", "weeks", "months":
			return nil
		}
	}

	return fmt.Errorf("unrecognized recurrence rule: %s", rule)
}

// Next computes the next occurrence time from the given base time and rule.
func Next(rule string, base time.Time) (time.Time, error) {
	switch rule {
	case "daily":
		return base.AddDate(0, 0, 1), nil
	case "weekly":
		return base.AddDate(0, 0, 7), nil
	case "monthly":
		return base.AddDate(0, 1, 0), nil
	case "yearly":
		return base.AddDate(1, 0, 0), nil
	case "monthly_last_day":
		return LastDayOfNextMonth(base), nil
	}

	if strings.HasPrefix(rule, "every_") {
		parts := strings.Split(rule, "_")
		if len(parts) != 3 {
			return time.Time{}, fmt.Errorf("invalid custom rule format: %s", rule)
		}
		n, err := strconv.Atoi(parts[1])
		if err != nil || n < 1 {
			return time.Time{}, fmt.Errorf("invalid interval: %s (must be >= 1)", parts[1])
		}
		switch parts[2] {
		case "days":
			return base.AddDate(0, 0, n), nil
		case "weeks":
			return base.AddDate(0, 0, n*7), nil
		case "months":
			return base.AddDate(0, n, 0), nil
		}
	}

	return time.Time{}, fmt.Errorf("unrecognized recurrence rule: %s", rule)
}

// LastDayOfNextMonth returns the last day of the month following base's month,
// preserving the time-of-day from base.
func LastDayOfNextMonth(base time.Time) time.Time {
	firstOfNextNextMonth := time.Date(base.Year(), base.Month()+2, 1, base.Hour(), base.Minute(), base.Second(), base.Nanosecond(), base.Location())
	return firstOfNextNextMonth.AddDate(0, 0, -1)
}
