# RxFHIR — System Summary / Conformance Statement

| | |
|---|---|
| **Product name** | RxFHIR (℞ + FHIR) |
| **Version** | 1.1.0 |
| **System type** | Cross-platform desktop application (Electron + React + TypeScript) |
| **Platforms** | macOS, Windows, Linux |
| **FHIR version** | R4 (4.0.1) |
| **FHIR role** | Client |
| **Wire format** | `application/fhir+json` |
| **Author** | Yu-Ru Pan (潘昱如) |
| **Affiliation** | National Taipei University of Nursing and Health Sciences — Department of Information Management |
| **Repository** | https://github.com/swiftruru/rx-fhir |

## 1. Overview

RxFHIR is a FHIR R4 **client** for Taiwan Core electronic prescriptions and interoperability. It provides:

- **Creator** — a step-by-step workflow that assembles a TW Core EMR electronic-prescription **Document Bundle** (`Composition` + supporting resources) and submits it to a FHIR server.
- **Consumer** — query, import, paginate, audit, and `$validate` FHIR Bundles from a server or local file.
- **Converter** — converts a flat interoperability problem JSON into a **TW Core (`twcore`) compliant collection Bundle**, validated against the conference Gazelle/Prism validator.

## 2. Conformance

| Item | Detail |
|------|--------|
| Implementation Guides | TW Core IG (`twcore`) and TW Core EMR-IG (`emr` / `-EP`) |
| Profiling | Every generated resource declares its profile in `meta.profile` |
| References | `urn:uuid` references resolving to each entry's `fullUrl` |
| Terminology | SNOMED CT, LOINC, UCUM, HL7 v2/v3 code systems, TW MOI national-ID system |
| Bundle types | `collection` (TW Core interoperability), document/transaction (EMR prescription) |

## 3. Security / Authentication

| Item | Detail |
|------|--------|
| Authorization | **OAuth 2.0 — client_credentials grant** |
| Authorization server | Keycloak (TW CAT), realm `twcat2026`, `…/protocol/openid-connect/token` |
| Access token | Sent as `Authorization: Bearer <access_token>` on every request |
| Participant token | Sent as `X-Participant-Token: <token>` on the token exchange and every FHIR request |
| Token lifecycle | Fetched on demand, cached in memory, refreshed before expiry |
| Credential storage | Local only; never transmitted except to the authorization/FHIR server |

## 4. Supported Resources & Profiles

| Resource | TW Core profile(s) | Interactions |
|----------|--------------------|--------------|
| Patient | `Patient-twcore`, `Patient-EP` | create, read, search, update |
| Organization | `Organization-twcore`, `Organization-EP` | create, read, search, update |
| Practitioner | `Practitioner-twcore`, `Practitioner-EP` | create, read, search, update |
| PractitionerRole | `PractitionerRole-twcore` | create, read, search, update |
| Encounter | `Encounter-twcore`, `Encounter-EP` | create, read, search, update |
| Condition | `Condition-twcore`, `Condition-EP` | create, read, search, update |
| Observation | vital-signs, heart-rate, body-temperature, body-weight, respiratory-rate, bloodPressure, pulse-oximetry, laboratoryResult (`*-twcore`) | create, read, search, update |
| AllergyIntolerance | `AllergyIntolerance-twcore` | create, read, search, update |
| Procedure | `Procedure-twcore` | create, read, search, update |
| DiagnosticReport | `DiagnosticReport-twcore` | create, read, search, update |
| Medication | `Medication-EP` | create, read, search, update |
| MedicationRequest | `MedicationRequest-twcore`, `MedicationRequest-EP` | create, read, search, update |
| Coverage | `Coverage-EP` | create, read, search, update |
| Composition | `Composition-EP` | create, read, search |
| Bundle | `Bundle-twcore`, `Bundle-EP` | create, read, search |

(Profile base URLs: `https://twcore.mohw.gov.tw/ig/twcore/StructureDefinition/…` and `https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/…`)

## 5. Supported Interactions

- **Instance / type level:** `create` (POST), `read` (GET), `update` (PUT), `search-type` (GET with parameters)
- **System level:** `transaction`, `batch` (Bundle POST to base)
- **Operations:** `$validate` (resource- and bundle-level validation)
- **Resilience:** automatic `PUT`-to-resurrect on HTTP 410 Gone for soft-deleted resources

## 6. Notes

- RxFHIR does not expose a FHIR server endpoint; it only issues outbound requests as a client.
- All credentials (OAuth client secret, participant token) are supplied by the operator and stored locally.
- The accompanying machine-readable conformance is provided as a FHIR R4 `CapabilityStatement` (`RxFHIR-CapabilityStatement.json`).
