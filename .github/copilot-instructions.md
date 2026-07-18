# GitHub Copilot instructions — PsicoNorte Journal iOS

Read `AGENTS.md`, `docs/RECONSTRUCTION_PROGRAM.md`, `docs/PSYCHONAUTWIKI_DATABASE.md`, and `docs/SEM_PC_PASSO_A_PASSO.md` before making changes.

## Operating constraints

- The user works only from an iPhone and has no local Mac or PC.
- Copilot cloud agent does not have a macOS/Xcode environment. Do not claim that an iOS app compiled inside the agent session.
- Make code changes in small branches and pull requests.
- Rely on the repository's macOS GitHub Actions workflow for `xcodebuild`, simulator build, and tests.
- After pushing changes, inspect the PR checks and use their logs as the source of truth.
- Do not merge automatically.

## Product constraints

- Preserve GPL-3.0-or-later notices and attribution.
- Preserve the offline PsychonautWiki knowledge snapshot and its licenses.
- Never edit the upstream snapshot destructively for personal corrections.
- Implement local field-level overrides and personal substances as separate data layers.
- Preserve Core Data model versions, migrations, and Journal/PsyLog import compatibility.
- Never infer redose, misuse, dependence, diagnosis, or treatment intent from timing alone.
- Separate actual ingestion from prescription context.
- Separate upstream PsychonautWiki content from locally reviewed clinical pharmacology.
- Pharmacology and PK data must store source, date, evidence level, population, route, and uncertainty.
- No analytics, external AI, cloud sync, or patient-identifying data by default.

## SwiftUI and code quality

- Prefer small dedicated SwiftUI `View` types.
- Split files above approximately 300 lines incrementally without changing behavior.
- Keep business logic out of `body`.
- Avoid introducing force unwraps or undocumented `fatalError`.
- Preserve stable navigation and view identity.
- Add tests for domain rules, imports, exports, and Core Data migrations.
- Maintain accessibility with Dynamic Type and VoiceOver labels.

## Required response on every coding task

Document:

1. files changed;
2. behavior preserved;
3. tests added or updated;
4. macOS Actions check result;
5. remaining risks;
6. any data migration impact.
