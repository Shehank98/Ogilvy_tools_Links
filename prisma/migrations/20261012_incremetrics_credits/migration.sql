-- Fill in the pop-up credits for the Ogilvy Incremetrics Canvas tool.
-- Only touches fields that are still empty, so anything an admin typed is kept.
UPDATE "Tool"
SET
  "subtitle"    = COALESCE("subtitle", 'Ogilvy Media Automation Team'),
  "initiatedBy" = COALESCE("initiatedBy", 'Sandaruwan Perera'),
  "developedBy" = COALESCE("developedBy", 'Sandaruwan Perera, Rohan Perera & Shehan Kavishka'),
  "team"        = COALESCE("team", 'Sachintha Gunawardane, Thusara Ranasinghe, Hasith Dilakshana, Primali Dias, Ravihari Muhandiramge, Shashika Wijesinghe, Vithyashini Sivasundaram'),
  "advisory"    = COALESCE("advisory", 'Lalith Sumanasiri, Sameer Sabith, Usitha Dheerasinghe, Adrian Selvadurai, Chandranath Gamage')
WHERE "name" ILIKE '%increme%trics%' OR "name" ILIKE '%incremen%trics%';
