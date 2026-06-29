-- Photo submissions test data
-- Run in Supabase SQL Editor (Dashboard → your project → SQL Editor)
-- Safe to run multiple times — uses ON CONFLICT DO NOTHING
--
-- Uses practitioner refs from scripts/seed-admin-test-data.sql:
--   LS005 · MK001 · SK002 · DV003 · RD004
-- storage_keys is empty: View modal will show "No photos" skeleton — expected for test data.
-- To test the lightbox, upload files to the storage bucket and update storage_keys manually.

INSERT INTO photo_submissions (
  id,
  practitioner_ref, session_ref,
  module, city, state,
  submitted_at, expiry_date,
  photo_count, storage_keys,
  participant_consent, status
)
VALUES
  -- Pending — primary test case for the View + Approve flow
  ('d0000000-0000-4000-8000-000000000001',
   'LS005', 'IQC/2025/001',
   'Foundations of Personal Finance', 'Hyderabad', 'Telangana',
   NOW() - INTERVAL '2 hours',  CURRENT_DATE + INTERVAL '28 days',
   6, '{}', TRUE, 'Pending'),

  ('d0000000-0000-4000-8000-000000000002',
   'MK001', 'IQC/2025/002',
   'Retirement & Goal-Based Financial Planning', 'Bangalore', 'Karnataka',
   NOW() - INTERVAL '1 day',   CURRENT_DATE + INTERVAL '27 days',
   4, '{}', TRUE, 'Pending'),

  -- Approved — View button still shown; approve action hidden
  ('d0000000-0000-4000-8000-000000000003',
   'SK002', 'IQC/2025/003',
   'Equity Investing Simplified', 'Mumbai', 'Maharashtra',
   NOW() - INTERVAL '3 days',  CURRENT_DATE + INTERVAL '25 days',
   8, '{}', TRUE, 'Approved'),

  -- Rejected — no View button
  ('d0000000-0000-4000-8000-000000000004',
   'DV003', 'IQC/2025/004',
   'Debt & Fixed Income Investing', 'Chennai', 'Tamil Nadu',
   NOW() - INTERVAL '5 days',  CURRENT_DATE + INTERVAL '23 days',
   3, '{}', TRUE, 'Rejected'),

  -- Expired — no View button; tests the expired badge
  ('d0000000-0000-4000-8000-000000000005',
   'RD004', 'IQC/2025/005',
   'Asset Allocation & Portfolio Construction', 'Pune', 'Maharashtra',
   NOW() - INTERVAL '35 days', CURRENT_DATE - INTERVAL '5 days',
   5, '{}', TRUE, 'Expired')

ON CONFLICT (id) DO NOTHING;
