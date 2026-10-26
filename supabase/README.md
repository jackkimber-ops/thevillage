# Database

- `migrations/`: every database change, applied in order (Supabase runs these on staging and production).
- `seed.sql`: studio settings and the launch catalog.
- `tests/`: automated tests for the core rules. They run on plain Postgres with `tests/local-shim.sql`, which stands in for the bits of Supabase the migrations use (local only, never run on Supabase).

Run the tests (needs Postgres 16+ with `psql`; CI does this on every pull request):

```bash
cd supabase/tests
npm install
ADMIN_DATABASE_URL=postgres://postgres@localhost:5432/postgres npm test
```

See `docs/database.md` for the plan in plain words.
