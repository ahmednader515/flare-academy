# reCaptcha v2 Setup Guide

This project uses Google reCaptcha v2 to protect the sign-up page from bots and spam.

## Required Environment Variables

Add the following environment variables to your `.env.local` file:

```env
# reCaptcha Site Key (public - used in client-side)
NEXT_PUBLIC_RECAPTCHA_SITE_KEY=your_site_key_here

# reCaptcha Secret Key (private - used in server-side verification)
RECAPTCHA_SECRET_KEY=your_secret_key_here
```

## Getting Your reCaptcha Keys

1. Go to [Google reCaptcha Admin Console](https://www.google.com/recaptcha/admin)
2. Click on "+" to create a new site
3. Fill in the form:
   - **Label**: Give your site a name (e.g., "Flare Academy")
   - **reCaptcha type**: Select "reCaptcha v2" → "I'm not a robot" Checkbox
   - **Domains**: Add your domains (e.g., `localhost`, `yourdomain.com`)
4. Accept the reCaptcha Terms of Service
5. Click "Submit"
6. You'll receive:
   - **Site Key**: This is your `NEXT_PUBLIC_RECAPTCHA_SITE_KEY`
   - **Secret Key**: This is your `RECAPTCHA_SECRET_KEY`

## Implementation Details

### Page-Level reCaptcha Gate
- **Homepage & Sign-Up Page**: A reCaptcha gate appears before users can access these pages
- **Verification Storage**: Once verified, the verification is stored in localStorage for 24 hours
- **Server Verification**: The gate token is verified via `/api/auth/verify-recaptcha-gate` endpoint
- **Bot Protection**: This prevents bots from accessing the site, making requests to your database, or consuming Vercel hosting resources

### Form-Level reCaptcha
- **Sign-Up Form**: An additional reCaptcha widget is displayed on the sign-up form itself
- **Server-side**: The reCaptcha token is verified in the `/api/auth/register` route before user registration
- The form submission is blocked until the reCaptcha is completed
- If verification fails, the user will see an error message and the reCaptcha will reset

### Security Layers
1. **First Layer**: Page-level gate (blocks bots before they can access any content)
2. **Second Layer**: Form-level verification (additional security for registration)

## Testing

For local development, you can use reCaptcha test keys:
- Site Key: `6LeIxAcTAAAAAJcZVRqyHh71UMIEGNQ_MXjiZKhI`
- Secret Key: `6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe`

These test keys will always pass verification but should only be used for development.

