-- Insert coding questions with sample and hidden test cases
-- Using a known org ID that matches test data (00000000-0000-0000-0000-000000000000)
INSERT INTO question (id, org_id, type, body, option_a, option_b, option_c, option_d, correct_option, difficulty, tags, test_cases, hidden_test_cases, created_by, status, version, created_at, updated_at)
VALUES
('c0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'coding',
 'Write a function to reverse a string.',
 NULL, NULL, NULL, NULL, NULL, 'easy', 'strings',
 'Input: "hello" => Output: "olleh"
Input: "world" => Output: "dlrow"
Input: "abc" => Output: "cba"',
 'Input: "" => Output: ""
Input: "a" => Output: "a"
Input: "12345" => Output: "54321"
Input: "JavaScript" => Output: "tpircSavaJ"
Input: "racecar" => Output: "racecar"
Input: "Hello World" => Output: "dlroW olleH"
Input: "123" => Output: "321"
Input: "xyz" => Output: "zyx"
Input: "A" => Output: "A"
Input: "ab" => Output: "ba"',
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('c0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'coding',
 'Write a function to check if a number is prime.',
 NULL, NULL, NULL, NULL, NULL, 'medium', 'math',
 'Input: 7 => Output: "true"
Input: 4 => Output: "false"
Input: 13 => Output: "true"',
 'Input: 1 => Output: "false"
Input: 2 => Output: "true"
Input: 3 => Output: "true"
Input: 9 => Output: "false"
Input: 11 => Output: "true"
Input: 15 => Output: "false"
Input: 17 => Output: "true"
Input: 21 => Output: "false"
Input: 29 => Output: "true"
Input: 100 => Output: "false"',
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('c0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'coding',
 'Write a function to find the maximum element in an array.',
 NULL, NULL, NULL, NULL, NULL, 'easy', 'arrays',
 'Input: [1,2,3,4,5] => Output: 5
Input: [10,20,30] => Output: 30
Input: [5] => Output: 5',
 'Input: [1] => Output: 1
Input: [100,200,50,300,150] => Output: 300
Input: [-1,-5,-3] => Output: -1
Input: [0,0,0] => Output: 0
Input: [99] => Output: 99
Input: [3,1,4,1,5,9,2,6] => Output: 9
Input: [1000000] => Output: 1000000
Input: [-100,-200,-50] => Output: -50
Input: [7,7,7,7] => Output: 7
Input: [42,17,88,3,55] => Output: 88',
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW()),

('c0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'coding',
 'Write a function to count the number of vowels in a string.',
 NULL, NULL, NULL, NULL, NULL, 'easy', 'strings',
 'Input: "hello" => Output: 2
Input: "world" => Output: 1
Input: "aeiou" => Output: 5',
 'Input: "" => Output: 0
Input: "a" => Output: 1
Input: "xyz" => Output: 0
Input: "JavaScript" => Output: 3
Input: "AaEeIiOoUu" => Output: 10
Input: "bcd" => Output: 0
Input: "racecar" => Output: 3
Input: "QUEUE" => Output: 4
Input: "sky" => Output: 0
Input: "Beautiful" => Output: 5',
 '00000000-0000-0000-0000-000000000000', 'published', 1, NOW(), NOW());
