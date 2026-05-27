insert into public.platform_settings(key, value, description, is_public) values
('general', '{
  "platformName":"sosprof.tn",
  "tagline":"Soutien scolaire - Reponses rapides - Cours",
  "description":"Trouvez des profs qualifies, posez vos questions et accedez a des cours adaptes.",
  "defaultLanguage":"fr",
  "defaultCurrency":"TND"
}'::jsonb, 'General public platform identity.', true),
('branding', '{
  "logoHorizontal":"/brand/sosprof-logo-horizontal.png.png",
  "logoDark":"/brand/sosprof-logo-dark.png.png",
  "logoIcon":"/brand/sosprof-icon.png.png",
  "primaryColor":"#082B66",
  "accentColor":"#FF8A00",
  "backgroundColor":"#F7FAFC"
}'::jsonb, 'Public logo and visual brand values.', true),
('support', '{
  "supportEmail":"",
  "supportPhone":"",
  "supportWhatsapp":"",
  "facebookUrl":"",
  "instagramUrl":"",
  "linkedinUrl":""
}'::jsonb, 'Public platform support contacts.', true),
('uploads', '{
  "maxImageSizeMB":5,
  "maxVideoSizeMB":300,
  "maxAttachmentSizeMB":50,
  "maxPaymentProofSizeMB":10,
  "allowedImageTypes":["jpg","jpeg","png","webp"],
  "allowedVideoTypes":["mp4","webm","mov"],
  "allowedAttachmentTypes":["pdf","doc","docx","ppt","pptx","xls","xlsx","jpg","jpeg","png","webp"],
  "allowedPaymentProofTypes":["jpg","jpeg","png","webp","pdf"]
}'::jsonb, 'Upload limits exposed for client validation.', true),
('legal', '{
  "termsUrl":"",
  "privacyUrl":"",
  "refundPolicyUrl":"",
  "contactUrl":""
}'::jsonb, 'Public legal document links.', true),
('maintenance', '{
  "enabled":false,
  "message":"La plateforme est en maintenance. Nous revenons bientot.",
  "allowedRoles":["admin"]
}'::jsonb, 'Public maintenance state and message.', true)
on conflict (key) do nothing;
