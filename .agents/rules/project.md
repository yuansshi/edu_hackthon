# Project scope and conventions

- Use the user's confirmed brief as the source of product scope. This setup does
  not choose a framework, provider, architecture, or deployment target.
- Prefer the smallest end-to-end implementation that satisfies the task. Add
  dependencies and supporting files only when the current work needs them.
- When adding the application, record real setup and execution commands in the
  root README and update the verification rules with the relevant checks.
- Keep credentials out of tracked files and tool output. Use only credentials
  explicitly designated for this project when live access is required; document
  variable names with empty or dummy values in an `.env.example` if needed.
- Use synthetic demo data by default. Record which external integrations are
  live, simulated, or unavailable so the demo behavior is clear.
