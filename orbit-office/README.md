# Orbit Office — AI Virtual Office

A new, separate application for a personal AI office assistant.

## Scope
- 3D-inspired responsive dashboard
- Tasks, notes, daily planner, and chat UI
- Prepared for Supabase Auth + isolated application tables
- Prepared for AI integration through a server-side Edge Function

## Safety
- Do not put AI provider secrets in the browser.
- Use Supabase Auth and row-level security before storing private user data.
- Require user confirmation before sending emails, spending money, deleting data, or other external side effects.

This is the initial project scaffold; live AI integration and production deployment are separate setup steps.
