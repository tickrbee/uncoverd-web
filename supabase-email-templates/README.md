# Supabase Email Templates

This folder contains email templates for Supabase authentication emails.

## How to Use

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Email Templates**
3. Select the template you want to update (e.g., "Reset Password")
4. Copy the HTML from the corresponding file in this folder
5. Paste it into the Supabase email template editor
6. Save the template

## Templates

### Password Reset (`password-reset.html`)
- Used when users request a password reset
- Contains a "Reset Password" button that links to `{{ .ConfirmationURL }}`
- Make sure the redirect URL in Supabase settings points to: `https://uncoverd.org/auth/password-reset`

## Important Notes

- The `{{ .ConfirmationURL }}` variable is automatically replaced by Supabase with the actual confirmation URL
- Make sure to add the redirect URLs to the **Redirect URLs** allowlist in Supabase:
  - `https://uncoverd.org/auth/password-reset`
  - `https://uncoverd.org/reset-password`
- The Site URL should be set to: `https://uncoverd.org`

