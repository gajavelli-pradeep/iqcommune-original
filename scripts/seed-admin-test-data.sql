-- iqcommune Admin Console — Test Data Seed (v2)
-- Run in Supabase SQL Editor: https://supabase.com/dashboard → your project → SQL Editor
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)
--
-- IDs below use valid RFC-4122 v4 format (version nibble = 4, variant = 8).
-- The "Assign practitioner" flow validates with Zod v4 `.uuid()` — these pass.


-- ── Practitioners (one per pipeline stage) ─────────────────────────────────────

INSERT INTO practitioners (id, name, email, phone, role, org, city, state, experience, modules, status, why, ref_code, created_at)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'Dr. Meena Krishnan',  'meena.krishnan@example.com',  '+91 99887 76650',
   'Certified Financial Planner', 'Independent',       'Bangalore', 'Karnataka',
   '12 years in personal finance coaching',
   ARRAY['Foundations of Personal Finance', 'Retirement & Goal-Based Financial Planning'],
   'Applied',
   'I want to democratise financial literacy for salaried Indians.',
   'MK001', NOW() - INTERVAL '2 days'),

  ('20000000-0000-4000-8000-000000000002', 'Sanjay Khanna',       'sanjay.khanna@example.com',   '+91 99887 76651',
   'Investment Analyst',          'Motilal Oswal',     'Mumbai',    'Maharashtra',
   '8 years in equity research',
   ARRAY['Equity Investing Simplified', 'Asset Allocation & Portfolio Construction'],
   'Under Review',
   'Teaching is the best way to learn — and I want to give back.',
   'SK002', NOW() - INTERVAL '5 days'),

  ('20000000-0000-4000-8000-000000000003', 'Deepa Venkataraman',  'deepa.v@example.com',         '+91 99887 76652',
   'CA & Financial Coach',        'Self-employed',     'Chennai',   'Tamil Nadu',
   '15 years in taxation and compliance',
   ARRAY['Foundations of Personal Finance', 'Debt & Fixed Income Investing'],
   'Screening Done',
   'Financial stress is real — I help people get out of it.',
   'DV003', NOW() - INTERVAL '8 days'),

  ('20000000-0000-4000-8000-000000000004', 'Rohan Desai',         'rohan.desai@example.com',     '+91 99887 76653',
   'Wealth Manager',              'ICICI Prudential',  'Pune',      'Maharashtra',
   '10 years in HNI wealth management',
   ARRAY['Retirement & Goal-Based Financial Planning', 'Investment Solutions & Portfolio Strategies'],
   'Agreement Sent',
   'I believe financial freedom is a right, not a privilege.',
   'RD004', NOW() - INTERVAL '12 days'),

  ('20000000-0000-4000-8000-000000000005', 'Lakshmi Subramaniam', 'lakshmi.s@example.com',       '+91 99887 76654',
   'Personal Finance Educator',   'Independent',       'Hyderabad', 'Telangana',
   '7 years conducting corporate workshops',
   ARRAY['Foundations of Personal Finance', 'Retirement & Goal-Based Financial Planning', 'Equity Investing Simplified'],
   'Empanelled',
   'Every rupee saved today is freedom tomorrow — I want to spread that.',
   'LS005', NOW() - INTERVAL '20 days'),

  ('20000000-0000-4000-8000-000000000006', 'Arun Kumar',          'arun.kumar@example.com',      '+91 99887 76655',
   'Retired Bank Manager',        'Former SBI GM',     'Delhi',     'Delhi',
   '35 years in banking and credit',
   ARRAY['Foundations of Personal Finance', 'Debt & Fixed Income Investing'],
   'Rejected',
   'I want to mentor the next generation on money management.',
   NULL, NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;


-- ── Session Requests (one per status) ──────────────────────────────────────────
-- audience_type values: 'Groups' | 'Organisations & Institutions' | 'AMCs & Wealth Firms'
-- group_size values:    '5-8' | '9-15' | '16-25'  (only for Groups; NULL otherwise)

INSERT INTO session_requests (
  id, name, email, phone, city, state,
  org_name, topic, audience_type,
  group_size, min_commit, venue, preferred_dates, notes,
  spoc_declaration, status, created_at
)
VALUES
  -- Groups: require group_size
  ('10000000-0000-4000-8000-000000000001',
   'Priya Sharma', 'priya.sharma@infosys.com', '+91 98765 43210',
   'Bangalore', 'Karnataka',
   NULL,
   'Foundations of Personal Finance',
   'Groups', '9-15', 12, 'Infosys campus, Electronic City', 'July 2025, any Friday',
   'Prefer morning slots',
   TRUE, 'New', NOW() - INTERVAL '1 day'),

  ('10000000-0000-4000-8000-000000000002',
   'Rahul Mehta', 'rahul.mehta@hdfc.com', '+91 98765 43211',
   'Mumbai', 'Maharashtra',
   NULL,
   'Equity Investing Simplified',
   'Groups', '16-25', 20, 'HDFC Bank HQ, 4th floor', 'August 10–12, 2025',
   NULL,
   TRUE, 'Matched', NOW() - INTERVAL '3 days'),

  ('10000000-0000-4000-8000-000000000003',
   'Ananya Gupta', 'ananya.gupta@wipro.com', '+91 98765 43212',
   'Pune', 'Maharashtra',
   NULL,
   'Bundle — Equity Investing Simplified + Debt & Fixed Income Investing (6 hrs)',
   'Groups', '9-15', 15, 'Wipro Pune campus', 'Last week of July 2025',
   'Needs AV setup',
   TRUE, 'Confirmed', NOW() - INTERVAL '5 days'),

  ('10000000-0000-4000-8000-000000000004',
   'Vikram Nair', 'vikram.nair@tcs.com', '+91 98765 43213',
   'Chennai', 'Tamil Nadu',
   NULL,
   'Asset Allocation & Portfolio Construction',
   'Groups', '5-8', 8, 'TCS Chennai office, Block B', 'August 2025, weekday',
   NULL,
   TRUE, 'Completed', NOW() - INTERVAL '10 days'),

  ('10000000-0000-4000-8000-000000000005',
   'Sneha Reddy', 'sneha.reddy@amazon.com', '+91 98765 43214',
   'Hyderabad', 'Telangana',
   NULL,
   'Retirement & Goal-Based Financial Planning',
   'Groups', '16-25', 20, 'Amazon Hyderabad HQ', 'September 2025',
   'Participants are L5+ engineers',
   TRUE, 'Cancelled', NOW() - INTERVAL '7 days'),

  -- Organisations & Institutions: org_name required, no group_size
  ('10000000-0000-4000-8000-000000000006',
   'Arjun Patel', 'arjun.patel@google.com', '+91 98765 43215',
   'Gurgaon', 'Haryana',
   'Google India Pvt Ltd',
   'Investment Solutions & Portfolio Strategies',
   'Organisations & Institutions', NULL, NULL, NULL, 'Flexible — any date August',
   NULL,
   TRUE, 'New', NOW() - INTERVAL '2 hours'),

  -- AMCs & Wealth Firms: org_name required, no group_size
  ('10000000-0000-4000-8000-000000000007',
   'Kavya Iyer', 'kavya.iyer@deloitte.com', '+91 98765 43216',
   'Delhi', 'Delhi',
   'Deloitte India LLP',
   'Debt & Fixed Income Investing',
   'AMCs & Wealth Firms', NULL, NULL, 'Deloitte Delhi NCR office', 'August 5–9, 2025',
   'Mixed audience — advisors and analysts',
   TRUE, 'New', NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;
