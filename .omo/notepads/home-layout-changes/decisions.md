## 2026-03-01T22:03:00Z - Task 5 decisions

- Kept pagination controls inline in `app/Main.tsx` (no extracted component) to match task constraints.
- Used URL params as canonical UI state for both filter and page instead of local state synchronization.
- Preserved original home card DOM/class structure and only changed the data source (filtered + paginated collection).
