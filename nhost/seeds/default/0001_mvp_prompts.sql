-- PHASE A: MVP Prompts Seed Data
-- Taxonomy: Humor, Curiosity, Challenge, Empathy, Gratitude

INSERT INTO public.prompts (id, category, prompt_text, age_min, age_max, target_energy) VALUES
(gen_random_uuid(), 'Humor', 'If you had to replace your hands with objects for a day, what would you choose?', 4, 12, 'high'),
(gen_random_uuid(), 'Curiosity', 'What is something you learned today that surprised you?', 6, 18, 'medium'),
(gen_random_uuid(), 'Empathy', 'Did you see anyone looking lonely today? What do you think they were feeling?', 5, 15, 'low'),
(gen_random_uuid(), 'Challenge', 'What was the hardest thing you had to figure out today?', 7, 18, 'medium'),
(gen_random_uuid(), 'Gratitude', 'What made you smile today, even just a little bit?', 3, 18, 'low')
ON CONFLICT DO NOTHING;

-- Insert a default parent archetype to test onboarding
INSERT INTO public.parent_archetypes (id, name, description) VALUES
('arch_01', 'The Optimizer', 'Wants quick, high-impact connection moments.'),
('arch_02', 'The Listener', 'Prioritizes emotional safety and deep conversations.')
ON CONFLICT DO NOTHING;
