-- Sample aptitude and reasoning MCQs for the default test org
INSERT INTO question (id, org_id, type, body, option_a, option_b, option_c, option_d, correct_option, difficulty, tags, test_cases, hidden_test_cases, created_by, status, version, created_at, updated_at)
VALUES
('a0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'aptitude',
 'What is the value of 15 + 27?',
 '40', '41', '42', '43', 'C', 'easy', 'arithmetic',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('a0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'aptitude',
 'If a train travels at 60 km/h, how far does it travel in 2.5 hours?',
 '120 km', '140 km', '150 km', '160 km', 'C', 'easy', 'arithmetic',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('a0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'aptitude',
 'What is 25% of 80?',
 '15', '18', '20', '22', 'C', 'easy', 'arithmetic',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('b0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'reasoning',
 'Find the next number in the series: 2, 6, 12, 20, 30, ...',
 '36', '40', '42', '44', 'C', 'medium', 'patterns',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('b0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'reasoning',
 'If all roses are flowers and some flowers fade quickly, which statement must be true?',
 'All roses fade quickly', 'Some roses fade quickly', 'No roses fade quickly', 'Roses are flowers', 'D', 'medium', 'logic',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('b0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'reasoning',
 'Which figure comes next in the pattern: square, circle, triangle, square, circle, ...?',
 'Square', 'Circle', 'Triangle', 'Rectangle', 'C', 'easy', 'patterns',
 NULL, NULL,
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW());
