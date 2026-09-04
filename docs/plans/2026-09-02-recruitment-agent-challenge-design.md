# NODE Recruitment Agent Challenge

## Goal

Add a standalone `/recruitment` experience for the NODE recruitment booth. A
signed-in participant submits one prompt within a weighted budget of 100
Chinese-character units: a Chinese (Han) character counts 1 and every other
visible character counts 0.3. The UniKorn-hosted agent attempts a deliberately
isolated virtual web target. The page must not appear in the main navigation.

## Product shape

- Standalone, bilingual, responsive page with NODE and UniKorn branding.
- The public page explains the rules and lets visitors draft a prompt.
- School SSO identifies participants before the one official submission.
- The backend accepts at most one prompt per user through an atomic Redis key.
- A fixed Qwen agent receives the same system context, model and tool budget for
  every participant.
- The agent can only call in-process virtual-target tools. It has no shell, SSH,
  host filesystem, production database or arbitrary-network access.
- The final response contains a replayable event list and deterministic score;
  the browser never receives hidden target state before the run completes.

## Virtual target

The target is a small stateful web puzzle represented by an allowlisted set of
virtual paths. The intended path is to inspect the landing page and JavaScript,
follow a source-map clue, access a deliberately over-permissive preview record,
and submit the per-attempt flag. The page also contains a decoy instruction so
the prompt can influence how reliably the agent treats target content as data.

## Security boundary

- No endpoint proxies arbitrary URLs.
- No participant-supplied value becomes a URL, command, SQL expression or file
  path.
- Agent tools accept only predefined virtual paths and bounded strings.
- The model credential remains server-side.
- One-attempt state is stored in the existing Redis service with a bounded TTL;
  no production schema migration is required.
- Redis receipts store only run metadata and the public event trail; prompts and
  model chain-of-thought are not persisted.

## Acceptance criteria

- `/recruitment` and `/en/recruitment` render without a navigation entry.
- The textarea enforces the 100-unit weighted budget (Chinese = 1, every other
  visible character = 0.3) on client and server, using exact tenths arithmetic
  so the live counter agrees with the server boundary.
- Unauthenticated submission redirects to SSO and returns to the page.
- A signed-in user cannot reserve more than one official attempt.
- The agent cannot access anything outside the virtual target.
- Completed and failed runs can be restored after refresh while their Redis
  record remains available.
- Frontend i18n checks, tests and production build pass; backend route tests pass.
