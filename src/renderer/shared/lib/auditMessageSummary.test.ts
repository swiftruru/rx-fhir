import { describe, expect, it } from 'vitest'
import { getServerAuditMessageSummary } from './auditMessageSummary'

describe('getServerAuditMessageSummary', () => {
  it('classifies missing terminology package messages', () => {
    expect(getServerAuditMessageSummary(
      'Unable to expand ValueSet because CodeSystem could not be found: http://loinc.org'
    )).toEqual({
      key: 'audit.serverIssueSummary.missingCodeSystem',
      params: { system: 'http://loinc.org' },
      category: 'environment'
    })
  })

  it('classifies nested unknown code messages', () => {
    expect(getServerAuditMessageSummary(
      "Details for urn:uuid:abc matching against profile http://hl7.org/fhir/StructureDefinition/Organization|4.0.1 - Unknown code 'http://terminology.hl7.org/CodeSystem/organization-type#HOSP'"
    )).toEqual({
      key: 'audit.serverIssueSummary.unknownCode',
      params: {
        system: 'http://terminology.hl7.org/CodeSystem/organization-type',
        code: 'HOSP'
      },
      category: 'structural'
    })
  })

  it('classifies profile reference messages', () => {
    expect(getServerAuditMessageSummary(
      "Profile reference 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP' has not been checked because it could not be found, and the validator is set to not fetch unknown profiles"
    )).toEqual({
      key: 'audit.serverIssueSummary.profileNotAvailable',
      params: { profile: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Observation-EP' },
      category: 'environment'
    })
  })

  it('classifies composition section slice mismatch messages', () => {
    expect(getServerAuditMessageSummary(
      "This element does not match any known slice defined in the profile https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0 - Bundle.entry[0].resource/*Composition/example*/.section[1]: Does not match slice 'Coverage' (discriminator: ('29762-2' in code.coding.code))"
    )).toEqual({
      key: 'audit.serverIssueSummary.sectionSliceMismatch',
      params: {
        profile: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0',
        slice: 'Coverage'
      },
      category: 'structural'
    })
  })

  it('classifies unresolved profile reference messages', () => {
    expect(getServerAuditMessageSummary(
      "Unable to resolve the profile reference 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP'"
    )).toEqual({
      key: 'audit.serverIssueSummary.profileReferenceUnresolved',
      params: { profile: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Patient-EP' },
      category: 'environment'
    })
  })

  it('classifies slicing-validation errors caused by unresolved profiles', () => {
    expect(getServerAuditMessageSummary(
      "Slicing cannot be evaluated: Problem evaluating slicing expression for element in profile https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0 path Bundle.entry[0].resource/*Composition/example*/.section[3].entry[0] (fhirPath = true and resolve().conformsTo('https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP')): Unable to resolve the reference https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP"
    )).toEqual({
      key: 'audit.serverIssueSummary.slicingProfileValidationBlocked',
      params: { profile: 'https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Medication-EP' },
      category: 'environment'
    })
  })

  it('classifies slicing minimum-check warnings caused by unresolved profiles', () => {
    expect(getServerAuditMessageSummary(
      'Composition.section:MedicationPrescribed.entry:Medication: Found 0 matches, but unable to check minimum required (Composition.section.entry) due to lack of slicing validation (from https://twcore.mohw.gov.tw/ig/emr/StructureDefinition/Composition-EP|0.1.0)'
    )).toEqual({
      key: 'audit.serverIssueSummary.slicingMinimumCheckBlocked',
      params: {
        section: 'MedicationPrescribed',
        entryType: 'Medication',
        found: '0'
      },
      category: 'environment'
    })
  })

  it('falls back for unmatched messages', () => {
    expect(getServerAuditMessageSummary('Server warning from $validate.')).toEqual({
      key: 'audit.serverIssueSummary.fallback',
      category: 'fallback'
    })
  })
})
