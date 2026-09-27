---
name: Supabase connector schema setup
description: The connected Supabase integration exposes the PostgREST data API but not schema creation.
---

The Supabase connection can read and write exposed tables through the Replit connector proxy, but creating tables requires running SQL in the Supabase SQL Editor. Keep schema setup SQL in the project and show an actionable setup message when the table is absent.

**Why:** The connection's REST base returns table data successfully but rejects schema-management paths; silently falling back to another database would violate the user's provider choice.

**How to apply:** For new Supabase-backed features, add or update the project's SQL setup file first, then wire the server to the connector and tell the user which SQL to run.