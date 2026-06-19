-- iqcommune Admin Console — Test Data Seed
-- Run in Supabase SQL Editor: https://supabase.com/dashboard → your project → SQL Editor
-- Safe to run multiple times (uses INSERT ... ON CONFLICT DO NOTHING)

-- ── Session Requests (one per status) ──────────────────────────────────────────

INSERT INTO session_requests (id, name, org, email, phone, topic, audience_type, group_size, min_commit, venue, preferred_dates, status, created_at)
VALUES
  ('00000000-0000-0000-0001-000000000001', 'Priya Sharma',    'Infosys Ltd',        'priya.sharma@infosys.com',     '+91 98765 43210', 'Personal Finance Basics',      'Corporate employees',  '30–50',   25, 'Bangalore office',   'July 2025, any Friday',     'New',       NOW() - INTERVAL '1 day'),
  ('00000000-0000-0000-0001-000000000002', 'Rahul Mehta',     'HDFC Bank',          'rahul.mehta@hdfc.com',         '+91 98765 43211', 'Equity & Mutual Funds 101',    'Mid-level managers',   '20–30',   20, 'Mumbai HQ, 4th floor','August 10–12, 2025',        'Matched',   NOW() - INTERVAL '3 days'),
  ('00000000-0000-0000-0001-000000000003', 'Ananya Gupta',    'Wipro Technologies', 'ananya.gupta@wipro.com',       '+91 98765 43212', 'Tax Planning for Salaried',    'All employees',        '50–80',   40, 'Pune campus',        'Last week of July 2025',    'Confirmed', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0001-000000000004', 'Vikram Nair',     'Tata Consultancy',   'vikram.nair@tcs.com',          '+91 98765 43213', 'Behavioural Finance',          'Senior leadership',    '15–20',   15, 'Chennai office',     'August 2025, weekday',      'Completed', NOW() - INTERVAL '10 days'),
  ('00000000-0000-0000-0001-000000000005', 'Sneha Reddy',     'Amazon India',       'sneha.reddy@amazon.com',       '+91 98765 43214', 'Goal-Based Investing',         'Early career talent',  '40–60',   30, 'Hyderabad HQ',       'September 2025',            'Cancelled', NOW() - INTERVAL '7 days'),
  ('00000000-0000-0000-0001-000000000006', 'Arjun Patel',     'Google India',       'arjun.patel@google.com',       '+91 98765 43215', 'Retirement Planning Essentials','All staff',           '25–40',   25, NULL,                 'Flexible — any date Aug',   'New',       NOW() - INTERVAL '2 hours'),
  ('00000000-0000-0000-0001-000000000007', 'Kavya Iyer',      'Deloitte India',     'kavya.iyer@deloitte.com',      '+91 98765 43216', 'Insurance & Risk Coverage',    'Mid to senior staff',  '30–45',   20, 'Delhi NCR office',   'August 5–9, 2025',          'New',       NOW() - INTERVAL '30 minutes')
ON CONFLICT (id) DO NOTHING;


-- ── Practitioners (one per pipeline stage) ─────────────────────────────────────

INSERT INTO practitioners (id, name, email, phone, role, org, city, experience, modules, status, why, consent_operational, consent_nosell, consent_employer, ref_code, created_at)
VALUES
  ('00000000-0000-0000-0002-000000000001', 'Dr. Meena Krishnan',  'meena.krishnan@example.com',  '+91 99887 76650', 'Certified Financial Planner', 'Independent',        'Bangalore', '12 years in personal finance coaching', ARRAY['Personal Finance', 'Tax Planning', 'Retirement'], 'Applied',        'I want to democratise financial literacy for salaried Indians.', true,  true,  true,  'MK001', NOW() - INTERVAL '2 days'),
  ('00000000-0000-0000-0002-000000000002', 'Sanjay Khanna',       'sanjay.khanna@example.com',   '+91 99887 76651', 'Investment Analyst',          'Motilal Oswal',      'Mumbai',    '8 years in equity research',            ARRAY['Equity & MF', 'Behavioural Finance'],            'Under Review',   'Teaching is the best way to learn — and I want to give back.', true,  true,  false, 'SK002', NOW() - INTERVAL '5 days'),
  ('00000000-0000-0000-0003-000000000003', 'Deepa Venkataraman',  'deepa.v@example.com',         '+91 99887 76652', 'CA & Financial Coach',        'Self-employed',      'Chennai',   '15 years in taxation and compliance',   ARRAY['Tax Planning', 'Goal-Based Investing'],          'Screening Done', 'Financial stress is real — I help people get out of it.',      true,  true,  true,  'DV003', NOW() - INTERVAL '8 days'),
  ('00000000-0000-0000-0004-000000000004', 'Rohan Desai',         'rohan.desai@example.com',     '+91 99887 76653', 'Wealth Manager',              'ICICI Prudential',   'Pune',      '10 years in HNI wealth management',     ARRAY['Retirement', 'Insurance'],                       'Agreement Sent', 'I believe financial freedom is a right, not a privilege.',      true,  true,  true,  'RD004', NOW() - INTERVAL '12 days'),
  ('00000000-0000-0000-0005-000000000005', 'Lakshmi Subramaniam', 'lakshmi.s@example.com',       '+91 99887 76654', 'Personal Finance Educator',   'Independent',        'Hyderabad', '7 years conducting corporate workshops', ARRAY['Personal Finance', 'Behavioural Finance', 'Goal-Based Investing'], 'Empanelled', 'Every rupee saved today is freedom tomorrow — I want to spread that.', true, true, true, 'LS005', NOW() - INTERVAL '20 days'),
  ('00000000-0000-0000-0006-000000000006', 'Arun Kumar',          'arun.kumar@example.com',      '+91 99887 76655', 'Retired Bank Manager',        'Former SBI GM',      'Delhi',     '35 years in banking and credit',        ARRAY['Personal Finance', 'Tax Planning'],              'Rejected',       'I want to mentor the next generation on money management.',     true,  false, true,  NULL,    NOW() - INTERVAL '25 days')
ON CONFLICT (id) DO NOTHING;
