# Working on this research instrument

Preserve the separation between observation, configuration, executed evidence and claims about outcomes. Never turn package presence, a skill file or a green job into proof of WCAG conformance, use in an agile team, independent agent review, sales gains or ranking.

## Acceptance before implementation

Record the task, affected journey/state, expected behavior and evidence needed. Prefer native semantics; when using Radix or another library, preserve its naming, keyboard, focus and composition contracts. Do not remove or weaken checks to obtain a passing result.

## Roles and evidence

- An implementation agent may propose and implement code within the requested scope.
- A verification role checks the behavior, gate verdict and source/evidence correspondence. If the same session does both roles, record that fact; do not claim independent review.
- A human reviewer confirms scope, exceptions and publication or merge decisions when applicable. Record whether that review actually occurred; missing review is not an approval.

These are workflow roles, not instructions to create extra agents. Use delegation only when authorized by the current session. The supplied skill is a reusable operating procedure; its presence is not evidence that it was invoked.

## Verification commands

Run checks appropriate to the change: `npm test`, `npm run lint:a11y`, `npm run typecheck`, `npm run test:browser`, and `npm run react:verify`. The React demonstration must pass the accessibility gate in its valid states and reject its negative control while retaining the same component library. Preserve the original `study/baseline` and its hashes.

The CI workflow includes an explicit `commerce-audit gate` command. A failing gate returns a nonzero exit code; repository branch protection remains a separate setting. Attach the actual run and artifacts to the change. A run for another commit or a dirty working tree does not validate the current code.

Use `.github/PULL_REQUEST_TEMPLATE.md` and `docs/AGILE-ACCESSIBILITY.md` for the review record. Do not fabricate human approval, sprint metrics, independent reviewers or user-testing outcomes.
