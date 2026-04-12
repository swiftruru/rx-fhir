export interface AuditMessageSummary {
  key: string
  params?: Record<string, string>
  category: 'environment' | 'bestPractice' | 'structural' | 'fallback'
}

export function getServerAuditMessageSummary(message: string): AuditMessageSummary {
  const normalized = message.trim()

  let match = normalized.match(/Unable to expand ValueSet because CodeSystem could not be found:\s*(\S+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.missingCodeSystem',
      params: { system: match[1] },
      category: 'environment'
    }
  }

  match = normalized.match(/CodeSystem is unknown and can't be validated:\s*(\S+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.unknownCodeSystem',
      params: { system: match[1] },
      category: 'environment'
    }
  }

  if (/None of the codings provided are in the value set 'FHIR Document Type Codes'/i.test(normalized)) {
    return {
      key: 'audit.serverIssueSummary.documentTypeValueSet',
      category: 'environment'
    }
  }

  if (/None of the codings provided are in the value set 'Document Section Codes'/i.test(normalized)) {
    return {
      key: 'audit.serverIssueSummary.documentSectionValueSet',
      category: 'bestPractice'
    }
  }

  match = normalized.match(/Profile reference '([^']+)' has not been checked because it (?:could not be found|is unknown)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.profileNotAvailable',
      params: { profile: match[1] },
      category: 'environment'
    }
  }

  match = normalized.match(/Failed to retrieve profile with url=([^\s]+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.profileFetchFailed',
      params: { profile: match[1] },
      category: 'environment'
    }
  }

  match = normalized.match(/Unknown extension\s+(\S+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.unknownExtension',
      params: { url: match[1] },
      category: 'environment'
    }
  }

  if (/Constraint failed:\s*dom-6/i.test(normalized) || /Best Practice Recommendation/i.test(normalized)) {
    return {
      key: 'audit.serverIssueSummary.bestPractice',
      category: 'bestPractice'
    }
  }

  match = normalized.match(/Unable to resolve the profile reference '([^']+)'/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.profileReferenceUnresolved',
      params: { profile: match[1] },
      category: 'environment'
    }
  }

  if (/Invalid Resource target type\./i.test(normalized)) {
    return {
      key: 'audit.serverIssueSummary.targetTypeValidationBlocked',
      category: 'environment'
    }
  }

  match = normalized.match(/Slicing cannot be evaluated: .*resolve\(\)\.conformsTo\('([^']+)'\).*Unable to resolve the reference\s+([^\s)]+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.slicingProfileValidationBlocked',
      params: { profile: match[1] || match[2] },
      category: 'environment'
    }
  }

  match = normalized.match(/Composition\.section:([^.]+)\.entry:([^:]+): Found (\d+) matches, but unable to check minimum required .* due to lack of slicing validation/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.slicingMinimumCheckBlocked',
      params: {
        section: match[1],
        entryType: match[2],
        found: match[3]
      },
      category: 'environment'
    }
  }

  match = normalized.match(/Entry '([^']+)' isn't reachable by traversing forwards from the Composition/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.unreachableEntry',
      params: { entry: match[1] },
      category: 'structural'
    }
  }

  match = normalized.match(/This element does not match any known slice defined in the profile ([^\s]+).+Does not match slice '([^']+)'/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.sectionSliceMismatch',
      params: {
        profile: match[1],
        slice: match[2]
      },
      category: 'structural'
    }
  }

  match = normalized.match(/Composition\.section:([^:]+): minimum required = (\d+), but only found (\d+)/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.missingRequiredSection',
      params: {
        section: match[1],
        required: match[2],
        found: match[3]
      },
      category: 'structural'
    }
  }

  match = normalized.match(/Value is '([^']+)' but must be '([^']+)'/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.fixedValueMismatch',
      params: {
        actual: match[1],
        expected: match[2]
      },
      category: 'structural'
    }
  }

  match = normalized.match(/Unknown code '([^#']+)#([^']+)'/i)
  if (match) {
    return {
      key: 'audit.serverIssueSummary.unknownCode',
      params: {
        system: match[1],
        code: match[2]
      },
      category: 'structural'
    }
  }

  return {
    key: 'audit.serverIssueSummary.fallback',
    category: 'fallback'
  }
}
