# Base44 Export Archive Placeholder

This directory is reserved for the read-only Base44 export archive referenced by
`MIGRATION_NOTES.md`.

## Current state

The original export payload is not present in this repository snapshot. This
placeholder ensures the required archive path exists so follow-up migration work
can add exported assets in-place without changing path conventions.

## Expected usage

- Add Base44 export artifacts here as read-only reference material.
- Do not wire runtime app imports to files in this directory.
- Keep migration implementation code under `src/api/platform/**` and
  `src/api/legacy/**`.
