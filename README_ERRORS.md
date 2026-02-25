README — Issues found, fixes applied, and recommendations

Date: 2026-02-25

Scope
- This file documents the mistakes, runtime/logic issues and warnings discovered while inspecting and smoke-testing the backend; it also lists the changes applied and next recommended actions.

Summary of issues found and fixes applied

1) Email transporter creation bug
- File: src/utils/email.js
- Problem: Code used nodemailer.createTransporter (non-existent) and treated EMAIL_PORT as string. This caused runtime errors when sending mail.
- Fix applied: Replaced with nodemailer.createTransport(...) and parsed EMAIL_PORT to integer; secure flag now checks numeric port === 465.
- Recommendation: Ensure real email env vars are set in .env before enabling email sending.

2) 404 handler registered before routes (blocked mounted routers)
- File: src/application.js
- Problem: The global 404 handler was registered before dynamic route loading which caused some mounted routers to be shadowed by the catch-all 404.
- Fix applied: Moved 404 handler registration to after routes are loaded in startServer(). Kept global error handler intact.
- Recommendation: Keep 404 handler last and ensure route loader runs before it.

3) Duplicate Mongoose index warnings
- Files: src/models/User.js, src/models/SecureUser.js, src/models/Case.js, src/models/Appointment.js
- Problem: Some unique/index declarations were redundant (both field-level unique:true and repeated schema.index(...) calls) which produced duplicate-index warnings at runtime.
- Fix applied: Removed duplicated index declarations (kept unique on schema fields where appropriate, removed extra schema.index calls that duplicated unique indexes).
- Recommendation: Prefer defining unique constraints on the field itself and avoid duplicating via schema.index(). Run migrations/carefully manage indexes in production.

4) Test runner / Jest ESM error
- Files: __tests__/app.test.js (Jest ESM parsing issue detected)
- Problem: Jest failed to parse ESM-style test file (SyntaxError: Cannot use import statement outside a module) with current Jest config.
- Action taken: Created a small ESM smoke test runner to exercise endpoints without Jest, used it to validate routes and then removed the temporary test runner and the failing test file.
- Recommendation: Decide on a testing strategy:
  - Option A: Configure Jest to support ESM (see jest docs for ESM support) or use "transform" (babel-jest) to transpile modules.
  - Option B: Use CommonJS test files (require) or switch to a test runner that supports ESM out of the box.
  - Also recommended: Use mongodb-memory-server for integration tests to avoid requiring a real MongoDB during CI tests.

5) Database connection toggle for tests
- File: src/application.js
- Problem: Tests attempted to connect to MongoDB during unit/end-to-end smoke runs which is not always desired.
- Fix applied: Added support to skip DB connection by setting SKIP_DB=true during test runs. This allows route loading without requiring DB.
- Recommendation: Use environment-specific setups for tests (in-memory DB or mocking). Avoid leaving SKIP_DB set in production.

6) Miscellaneous runtime warnings
- Files: mongoose connect options
- Observed: Warnings from MongoDB driver about deprecated options (useNewUrlParser, useUnifiedTopology are no-ops in newer drivers).
- Recommendation: Remove deprecated options from mongoose.connect options to eliminate warnings. Keep other connection options (pool size/timeouts) as needed.

7) Temporary test files created and removed during debugging
- Files: test-runner.js, __tests__/app.test.js
- Action: Temporary ESM runner created to smoke-test routes; afterward both temporary artifacts were removed per cleanup step.
- Note: If you want persistent automated tests, scaffold Jest properly and add integration tests using mongodb-memory-server.

Additional recommendations / next steps
- Run linting and static analysis (eslint, security linters). This remains outstanding.
- Add a Jest E2E test suite using an in-memory MongoDB (mongodb-memory-server) and configure Jest for ESM if you prefer module-style tests.
- Remove deprecated mongoose connect options (useNewUrlParser/useUnifiedTopology) from src/config/database.js.
- Add CI pipeline steps to run linting and tests and to fail builds for regressions.
- Add environment checks: fail fast and more descriptive messages if required env vars are missing (validateEnv already present but consider providing examples in README).
- Consider centralizing index declarations in each model and documenting which indexes must exist in production (and add DB migration scripts if indexes change).

How I verified
- Loaded app with SKIP_DB=true or with DB on local machine where available.
- Ran a smoke test sequence validating:
  - GET /api/health returned 200
  - unknown route returned 404
  - POST /api/auth/register with empty body returned 400 validation failure (route reachable and validations working)
- Monitored console output for warnings and confirmed duplicate-index warnings were removed after edits.

Files changed during this session
- Modified:
  - src/utils/email.js  — fixed transporter creation
  - src/application.js  — SKIP_DB support; moved 404 handler to after route loading
  - src/models/User.js  — removed duplicate index declarations
  - src/models/Case.js  — removed duplicate index declaration
  - src/models/Appointment.js  — removed duplicate index declaration
  - src/models/SecureUser.js — removed duplicate index declarations
- Created (temporary and removed during cleanup): test-runner.js, __tests__/app.test.js

If you want me to continue
- I can scaffold proper Jest + mongodb-memory-server tests and reintroduce tests that pass under CI.
- I can run eslint, fix style issues, and add a pre-commit hook.
- I can remove deprecated mongoose options and re-run a clean startup.

Contact
- If you'd like a prioritized plan for the next three steps I recommend (tests, linting, CI), tell me which one to start with and I'll proceed.
