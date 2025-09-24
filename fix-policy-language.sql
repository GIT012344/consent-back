-- Fix language mapping for policies
UPDATE policy_versions 
SET language = 'th'
WHERE title = '001' AND user_type = 'customer';

UPDATE policy_versions 
SET language = 'en'
WHERE title = '002' AND user_type = 'customer';

-- Verify the fix
SELECT user_type, language, title, is_active
FROM policy_versions 
WHERE user_type = 'customer' AND is_active = true
ORDER BY language;
