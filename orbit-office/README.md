# Orbit Office — AI Virtual Office

Orbit Office is a separate responsive web app for everyday planning, task tracking, notes, and an AI conversation interface. The 3D-inspired orb and glassy panels are built with CSS so the workspace stays lightweight.

## Included
- 3D-inspired responsive dashboard
- Tasks, daily planner, and notes stored in the current browser
- Chat interface connected to a server-side Vercel function
- OpenAI-compatible API integration through server environment variables
- No AI key shipped to the browser

## Deploy / configure
1. Deploy the \`orbit-office/\` directory as its own Vercel project.
2. Add \`OPENAI_API_KEY\` as an encrypted Vercel environment variable to enable the AI chat.
3. Optional: set \`OPENAI_MODEL\` and \`OPENAI_BASE_URL\` to select a supported model or OpenAI-compatible provider.
4. Test the API route after configuring the secret.

The chat is intentionally not active until the secret is configured. Do not commit real API keys or other credentials.

## Data and safety
- Tasks, chat history, and notes are stored in the browser's local storage for this prototype; they are not synced to a database or other devices.
- Use Supabase Auth and row-level security before saving private data in a cloud database.
- Require user confirmation before sending emails, spending money, deleting data, or performing other external side effects.
- This starter app is not a replacement for professional medical, legal, or financial advice.
