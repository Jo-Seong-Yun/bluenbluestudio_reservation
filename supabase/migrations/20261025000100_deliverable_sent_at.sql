alter table reservations
  add column if not exists deliverable_sent_at timestamptz;
