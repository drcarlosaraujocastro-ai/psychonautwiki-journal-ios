# Clinical Pharmacology Engine v1

## Product rule
The Journal UI remains simple and PsychonautWiki-like. Raw PsychonautWiki data is not overwritten. Clinical pharmacology is an overlay that can be edited independently and can learn patient-specific deviations from the canonical curve.

## Evidence layers
1. PsychonautWiki: primary phenomenology, routes, dose bins, subjective duration, effects, safer-use summaries and interaction taxonomy.
2. Erowid: experiential reports and recurrent phenomenology. Reports are evidence about lived experience, not proof of causality or dose safety.
3. TripSit and similar harm-reduction references: interaction taxonomy and broad safer-use guidance.
4. DailyMed/FDA, PubMed and DrugBank: technical PK/PD, metabolism, transporters, receptor pharmacology, labeling, adverse events and clinical evidence.

Conflicts are preserved with provenance instead of silently choosing one source. The UI can show confidence and source layer.

## Four simultaneous curve models
- Journal effect curve: onset -> come-up -> peak -> offset -> after-effects.
- Clinical PK curve: absorption, Tmax, half-life, accumulation, carry-over and steady state.
- PD axis curve: receptor/transmitter/circuit loads such as GABA-A, alpha-2, dopamine, norepinephrine and serotonin.
- Observed patient curve: longitudinal symptoms, vitals, sleep, food context, perceived effects and adverse effects.

The observed layer may personalize timing/intensity, but must never rewrite the canonical source record. It creates patient overrides with confidence and provenance.

## Dose semantics
PsychonautWiki dose categories remain visible as raw source data. A separate clinical layer uses Minimum / Low / Standard / High / Maximum therapeutic when such categories are meaningful. A value may be null; the UI must not invent a Heavy or Maximum value.

## Tolerance/adaptation schema
A single half-tolerance/zero-tolerance pair is insufficient for chronic pharmacotherapy. Clinical profiles may contain:
- acuteTolerance
- chronicTolerance
- crossTolerance
- physiologicDependence
- withdrawalRisk
- reboundRisk
- sensitizationRisk
- receptorAdaptation
- patientToleranceState
- confidence

Examples: benzodiazepine dose-effect tolerance is separated from GABA-A adaptation and physical dependence; clonidine tracks sympathetic rebound; dopamine agonists track DAWS and behavioral adaptation.

## Context modifiers
Food/stomach fullness is substance-specific. The engine may shift Tmax only when supported by a rule for that substance/formulation. It must not apply a generic full-stomach delay to every drug.

Future patient modifiers include formulation, renal/hepatic function, CYP phenotype/inhibitors/inducers, sleep deprivation, caffeine, alcohol, adherence, recent redoses and measured vitals.

## Inference
The inference layer receives active ingestions, their current Journal phase and clinical exposure estimate. It aggregates PD axes, identifies overlap/carry-over and returns hypotheses such as alertness, sedation, autonomic load or reward-salience changes with an explicit confidence and rationale.

Clinical hypotheses are decision support. They are not measured serum concentrations, diagnoses or autonomous prescriptions. Medication-change suggestions must expose the mechanism, assumptions, alternatives and evidence used.

## Safety / harm-reduction content
The application can preserve broad safer-use warnings and discourage high-risk routes/combinations. It must not turn harm-reduction references into procedural instructions for extracting, concentrating, preparing for injection, or otherwise increasing the efficiency of hazardous drug administration.

## Initial clinical profiles
v1 seeds lisdexamfetamine, clonidine, clonazepam, pramipexole and vortioxetine. The raw PW entries remain intact where they already exist.
