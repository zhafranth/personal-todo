export const calendarStyles = `
  .rdp-calendar .rdp-root {
    --rdp-accent-color: #2563eb;
    --rdp-accent-background-color: #eff6ff;
    --rdp-day-height: 2.75rem;
    --rdp-day-width: 2.75rem;
    --rdp-day_button-height: 2.5rem;
    --rdp-day_button-width: 2.5rem;
    --rdp-day_button-border-radius: 0.5rem;
    --rdp-nav_button-height: 2.5rem;
    --rdp-nav_button-width: 2.5rem;
    --rdp-nav-height: 2.75rem;
    font-size: 0.875rem;
  }
  .rdp-calendar .rdp-month_caption {
    font-size: 0.875rem;
    font-weight: 600;
    justify-content: center;
  }
  .rdp-calendar .rdp-weekday {
    font-size: 0.75rem;
    font-weight: 500;
    color: #94a3b8;
    opacity: 1;
    padding: 0.375rem 0;
  }
  .rdp-calendar .rdp-chevron {
    fill: #64748b;
  }
  .rdp-calendar .rdp-button_previous,
  .rdp-calendar .rdp-button_next {
    border-radius: 0.5rem;
    transition: background-color 0.15s;
  }
  .rdp-calendar .rdp-button_previous:hover,
  .rdp-calendar .rdp-button_next:hover {
    background-color: #f1f5f9;
  }
  .rdp-calendar .rdp-button_previous:active,
  .rdp-calendar .rdp-button_next:active {
    background-color: #e2e8f0;
  }
  .rdp-calendar .rdp-day_button {
    border-radius: 0.5rem;
    border: 2px solid transparent;
    transition: background-color 0.15s, color 0.15s;
  }
  .rdp-calendar .rdp-day_button:hover {
    background-color: #eff6ff;
    color: #2563eb;
  }
  .rdp-calendar .rdp-day_button:active {
    background-color: #dbeafe;
  }
  .rdp-calendar .rdp-today:not(.rdp-outside) {
    color: #2563eb;
    font-weight: 700;
  }
  .rdp-calendar .rdp-selected .rdp-day_button {
    background-color: #2563eb;
    color: white;
    border-color: #2563eb;
  }
  .rdp-calendar .rdp-outside {
    opacity: 0.3;
  }
  .rdp-calendar .rdp-disabled {
    opacity: 0.2;
  }
  .rdp-calendar .rdp-dropdown_root {
    font-size: 0.875rem;
    font-weight: 500;
  }
  .rdp-calendar .rdp-caption_label {
    font-size: 0.875rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.375rem;
  }
  .rdp-calendar .rdp-caption_label:hover {
    background-color: #f1f5f9;
  }
`
