my app will be deployed on vercel with a supabase backend that includes realtime chat. The tenant will purchase a domain, which will be mapped to @unitNNN for household seats and @name for solo seats, each household will receive up to five aliases. We using better auth, what I understand, is we can issue each use with a unique identifier to login, but they will still need email to recieve password reset notification, am I correct?
Yes, you are correct. In
Better Auth, while you can enable username-based login for your unique identifiers (like @unitNNN or @name), a valid email address is still required to handle password reset flows and critical account notifications.
How this works in your architecture:

    Login with Identifiers: By enabling the Username Plugin, users can sign in using their unique identifier instead of an email. This perfectly supports your @unitNNN (household) and @name (solo) seat mapping.
    Email for Recovery: Even if users never use their email to log in, Better Auth uses the stored email field to trigger the sendResetPassword function. When a user forgets their password, they provide their identifier, and the system sends the reset link to their registered email.
    Household Aliases: Since you are using a Supabase backend, you can store the five household aliases as additional fields or in a related aliases table. Better Auth allows you to extend the core schema to include these custom fields.
    Vercel Deployment: For your multi-tenant setup, Vercel for Platforms is the ideal way to map these custom tenant domains to your single deployment.

Implementation Tip
To ensure a smooth UX, you can configure your sign-up flow to:

    Collect the Email (for system use/recovery).
    Assign the Unique Identifier (for daily login).
    Set the Identifier as the primary username in Better Auth.

Are you planning to handle the domain mapping programmatically via the Vercel API as new tenants sign up?
