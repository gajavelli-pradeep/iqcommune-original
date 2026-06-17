-- Demo data matching prototype hardcoded arrays

INSERT INTO practitioners (name, email, role, org, city, experience, modules, status, ref_code) VALUES
  ('Priya Sharma',    'priya.sharma@gmail.com',  'Certified Financial Planner', 'Independent CFP Practice', 'Hyderabad', '9 – 12 years', ARRAY['Financial Planning Basics'], 'Empanelled',     '0041'),
  ('Vikram Kulkarni', 'vikram.k@gmail.com',       'Equity Analyst',             'Motilal Oswal',            'Mumbai',    '9 – 12 years', ARRAY['Stock Market Basics'],        'Agreement Sent', '0042'),
  ('Anita Menon',     'anita.menon@gmail.com',    'Portfolio Manager',          'HDFC AMC',                 'Bengaluru', '13 – 18 years',ARRAY['Market Fundamentals'],         'Screening Done', '0043'),
  ('Rohan Desai',     'rohan.desai@gmail.com',    'Wealth Advisor',             'IIFL Wealth',              'Pune',      '5 – 8 years',  ARRAY['Goal-Based Investing'],       'Under Review',   '0044'),
  ('Sneha Nair',      'sneha.nair@gmail.com',     'CFP & Retirement Specialist','Independent Practice',     'Chennai',   '9 – 12 years', ARRAY['Retirement Planning'],        'Applied',        '0045'),
  ('Karan Mehta',     'karan.mehta@gmail.com',    'Relationship Manager',       'Axis Bank Wealth',         'Delhi',     '5 – 8 years',  ARRAY['Investment Basics'],          'Rejected',       '0046');
