# Elios Community

## Local Authentication Setup

Create `.env.local` from `.env.example` and add your Supabase project URL and publishable anon key.

During development, disable email confirmation in Supabase:

`Authentication` -> `Sign In / Providers` -> `Email` -> turn off `Confirm email`

If email confirmation stays enabled, Supabase may create the Auth user without returning an active session. In that case the app shows a confirmation message and the user must confirm their email before logging in.

Admin accounts are not created from the public register page. Create a normal account first, then manually update its `profiles.role` to `admin` in Supabase.
