-- Add transaction batch support for daily receptionist closures.
-- This migration creates a transaction_batches table and links job_cards to the current batch.

create extension if not exists pgcrypto;

create table if not exists transaction_batches (
  id uuid primary key default gen_random_uuid(),
  batch_date date not null unique,
  status text not null check (status in ('OPEN', 'CLOSED')) default 'OPEN',
  created_by uuid null,
  closed_by uuid null,
  reopened_by uuid null,
  reopened_at timestamptz null,
  created_at timestamptz not null default now(),
  closed_at timestamptz null
);

alter table if exists job_cards
  add column if not exists batch_id uuid null references transaction_batches(id) on delete set null;

alter table if exists transaction_batches
  add column if not exists reopened_by uuid null,
  add column if not exists reopened_at timestamptz null;

alter table if exists transaction_batches enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Allow authenticated users to select transaction batches'
      AND schemaname = 'public'
      AND tablename = 'transaction_batches'
  ) THEN
    CREATE POLICY "Allow authenticated users to select transaction batches"
      ON transaction_batches
      FOR SELECT
      USING (auth.role() = 'authenticated');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Allow authenticated users to insert transaction batches'
      AND schemaname = 'public'
      AND tablename = 'transaction_batches'
  ) THEN
    CREATE POLICY "Allow authenticated users to insert transaction batches"
      ON transaction_batches
      FOR INSERT
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE policyname = 'Allow authenticated users to update transaction batches'
      AND schemaname = 'public'
      AND tablename = 'transaction_batches'
  ) THEN
    CREATE POLICY "Allow authenticated users to update transaction batches"
      ON transaction_batches
      FOR UPDATE
      USING (auth.role() = 'authenticated')
      WITH CHECK (auth.role() = 'authenticated');
  END IF;
END$$;
