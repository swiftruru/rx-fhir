import { describe, expect, it } from 'vitest'
import { parseServerCapabilities } from '../serverHealthApi'

describe('parseServerCapabilities', () => {
  it('marks Bundle validation as available when metadata advertises $validate', () => {
    const capabilities = parseServerCapabilities({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2026-04-11T10:00:00Z',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Bundle',
              operation: [{ name: '$validate', definition: 'OperationDefinition/Bundle-validate' }]
            }
          ]
        }
      ]
    })

    expect(capabilities.bundleValidate).toBe('available')
  })

  it('marks Bundle validation as unavailable when Bundle exists without $validate', () => {
    const capabilities = parseServerCapabilities({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2026-04-11T10:00:00Z',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Bundle'
            }
          ]
        }
      ]
    })

    expect(capabilities.bundleValidate).toBe('unavailable')
  })

  it('marks Bundle validation as available when metadata advertises validate without a dollar prefix', () => {
    const capabilities = parseServerCapabilities({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2026-04-12T10:00:00Z',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Bundle',
              operation: [{ name: 'validate', definition: 'OperationDefinition/Bundle-validate' }]
            }
          ]
        }
      ]
    })

    expect(capabilities.bundleValidate).toBe('available')
  })

  it('marks Bundle validation as available when system metadata advertises validate and Bundle exists', () => {
    const capabilities = parseServerCapabilities({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2026-04-12T10:00:00Z',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          operation: [{ name: 'validate', definition: 'OperationDefinition/Resource-validate' }],
          resource: [
            {
              type: 'Bundle'
            }
          ]
        }
      ]
    })

    expect(capabilities.bundleValidate).toBe('available')
  })

  it('marks Bundle validation as unknown when metadata does not mention Bundle support', () => {
    const capabilities = parseServerCapabilities({
      resourceType: 'CapabilityStatement',
      status: 'active',
      date: '2026-04-11T10:00:00Z',
      kind: 'instance',
      fhirVersion: '4.0.1',
      format: ['json'],
      rest: [
        {
          mode: 'server',
          resource: [
            {
              type: 'Patient'
            }
          ]
        }
      ]
    })

    expect(capabilities.bundleValidate).toBe('unknown')
  })
})
