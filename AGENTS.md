# AGENTS.md — PsicoNorte Journal iOS

## Objective

Reconstruct this GPLv3 iOS application into a stable personal pharmacology journal while preserving data compatibility with PsychonautWiki Journal and PsyLog.

## Non-negotiable rules

1. Preserve GPL-3.0-or-later notices and source availability.
2. Do not merge broad rewrites directly into `main`.
3. One concern per branch and pull request.
4. Build and test before changing the next subsystem.
5. Preserve Core Data migrations and import/export compatibility unless a tested migration replaces them.
6. Do not infer redose, abuse, diagnosis, or treatment intent from timing alone.
7. Separate pharmacology knowledge, clinical journal data, and presentation code.
8. Never add patient-identifying data, analytics, external AI, or cloud sync by default.
9. New network access must be explicit, documented, opt-in, and covered by a privacy review.
10. Pharmacology content must record source, publication/version date, evidence level, and review status.

## SwiftUI conventions

- Prefer small dedicated `View` types; split files above approximately 300 lines.
- Keep local UI state in `@State` and pass narrow bindings/values to children.
- Keep business rules in models or services, not inside `body`.
- Prefer `.sheet(item:)` for model-driven sheets.
- Avoid multiple booleans for mutually exclusive routes or sheets.
- Preserve a stable root view tree.
- Add previews and accessibility labels for new interactive screens.
- Maintain legacy `ObservableObject` patterns only where required by the current deployment target; modernize incrementally.

## Data model boundaries

- `Substance`: canonical identity and aliases.
- `Product`: brand, manufacturer, formulation, concentration, lot.
- `Ingestion`: actual exposure event.
- `PrescriptionContext`: prescribed amount/schedule, separate from actual ingestion.
- `CheckIn`: time-relative and absolute response data.
- `KnowledgeRecord`: sourced pharmacology/PK/PD content.
- `ImportAudit`: source format, hash, mapping decisions, warnings, and counts.

## Required checks for every PR

- Xcode project resolves Swift Package dependencies.
- Build succeeds for an iOS Simulator destination.
- Existing unit tests pass.
- New domain rules include tests.
- Core Data model changes include a new model version and migration test.
- Import/export changes preserve original timestamps, units, values, and unknown fields.
- No force unwrap is introduced without a documented invariant.
- Screens remain usable with Dynamic Type and VoiceOver labels.

## Initial priorities

1. Establish a reproducible macOS CI build.
2. Import the PsyLog development baseline with provenance.
3. Audit migrations, imports, custom substances, Live Activity, App Intents, and authentication.
4. Repair defects before redesign.
5. Refactor oversized SwiftUI views without behavior changes.
6. Introduce clinical/PK extensions through a new Core Data model version.
7. Add deterministic, sourced pharmacology knowledge and explicit uncertainty.
8. Configure cloud signing and TestFlight only after unsigned simulator builds are stable.
