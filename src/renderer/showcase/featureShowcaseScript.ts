import type { FeatureShowcaseStepDefinition } from './types'

export const FEATURE_SHOWCASE_STEPS: FeatureShowcaseStepDefinition[] = [
  {
    id: 'appShell',
    route: '/creator',
    targetId: 'app.sidebar',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'glow',
    panelPlacement: 'top-right'
  },
  {
    id: 'creatorWorkflow',
    route: '/creator',
    targetId: 'creator.stepper',
    durationMs: 4400,
    spotlightPadding: 14,
    highlightStyle: 'pulse',
    panelPlacement: 'bottom-right',
    ui: {
      creator: {
        currentStep: 0,
        showRightPanel: false
      }
    }
  },
  {
    id: 'fillMock',
    route: '/creator',
    targetId: 'creator.form',
    durationMs: 4200,
    spotlightPadding: 14,
    highlightStyle: 'glow',
    panelPlacement: 'bottom-right',
    ui: {
      creator: {
        currentStep: 1,
        showRightPanel: false
      }
    }
  },
  {
    id: 'jsonPreview',
    route: '/creator',
    targetId: 'creator.rightPanel',
    durationMs: 4200,
    spotlightPadding: 14,
    highlightStyle: 'focus',
    panelPlacement: 'bottom-left',
    ui: {
      creator: {
        currentStep: 8,
        showRightPanel: true,
        rightPanelMode: 'json'
      }
    }
  },
  {
    id: 'requestInspector',
    route: '/creator',
    targetId: 'creator.rightPanel',
    durationMs: 4200,
    spotlightPadding: 14,
    highlightStyle: 'pulse',
    panelPlacement: 'bottom-left',
    ui: {
      creator: {
        currentStep: 2,
        showRightPanel: true,
        rightPanelMode: 'request'
      }
    }
  },
  {
    id: 'bundleAssembly',
    route: '/creator',
    targetId: 'creator.bundleSubmit',
    durationMs: 4400,
    spotlightPadding: 12,
    highlightStyle: 'glow',
    panelPlacement: 'top-right',
    ui: {
      creator: {
        currentStep: 10,
        showRightPanel: true,
        rightPanelMode: 'json'
      }
    }
  },
  {
    id: 'consumerSearch',
    route: '/consumer',
    targetId: 'consumer.searchPanel',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'glow',
    panelPlacement: 'top-right',
    ui: {
      consumer: {
        activeTab: 'complex',
        middleTab: 'results'
      }
    }
  },
  {
    id: 'consumerQuickStart',
    route: '/consumer',
    targetId: 'consumer.quickStartPane',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'focus',
    panelPlacement: 'top-left',
    ui: {
      consumer: {
        middleTab: 'quickstart'
      }
    }
  },
  {
    id: 'consumerResults',
    route: '/consumer',
    targetId: 'consumer.resultsPane',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'pulse',
    panelPlacement: 'top-right',
    ui: {
      consumer: {
        middleTab: 'results'
      }
    }
  },
  {
    id: 'consumerStructuredDetail',
    route: '/consumer',
    targetId: 'consumer.detailPane',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'glow',
    panelPlacement: 'bottom-left',
    ui: {
      consumer: {
        middleTab: 'results',
        showDetail: true,
        detailView: 'structured'
      }
    }
  },
  {
    id: 'consumerRawJson',
    route: '/consumer',
    targetId: 'consumer.detailPane',
    durationMs: 4200,
    spotlightPadding: 12,
    highlightStyle: 'focus',
    panelPlacement: 'bottom-left',
    ui: {
      consumer: {
        middleTab: 'results',
        showDetail: true,
        detailView: 'json'
      }
    }
  },
  {
    id: 'consumerExport',
    route: '/consumer',
    targetId: 'consumer.exportButton',
    durationMs: 4400,
    spotlightPadding: 10,
    highlightStyle: 'glow',
    panelPlacement: 'bottom-left',
    ui: {
      consumer: {
        middleTab: 'results',
        showDetail: true,
        detailView: 'structured'
      }
    }
  },
  {
    id: 'consumerBundleDiff',
    route: '/consumer',
    targetId: 'consumer.resultsPane',
    durationMs: 5500,
    spotlightPadding: 12,
    highlightStyle: 'pulse',
    panelPlacement: 'bottom-right',
    ui: {
      consumer: {
        middleTab: 'results',
        selectedBundleId: 'showcase-bundle-001',
        bundleDiffTargetId: 'showcase-bundle-002'
      }
    }
  },
  {
    id: 'settingsServer',
    route: '/settings',
    targetId: 'settings.serverCard',
    durationMs: 4000,
    spotlightPadding: 12,
    highlightStyle: 'glow',
    panelPlacement: 'bottom-right'
  },
  {
    id: 'settingsStatus',
    route: '/settings',
    targetId: 'settings.statusCard',
    durationMs: 3800,
    spotlightPadding: 12,
    highlightStyle: 'pulse',
    panelPlacement: 'top-right'
  },
  {
    id: 'appControls',
    route: '/creator',
    targetId: 'app.utilityControls',
    durationMs: 3600,
    spotlightPadding: 10,
    highlightStyle: 'glow',
    panelPlacement: 'bottom-right'
  },
  {
    id: 'statusBar',
    route: '/creator',
    targetId: 'app.statusBar',
    durationMs: 3600,
    spotlightPadding: 8,
    highlightStyle: 'focus',
    panelPlacement: 'top-right'
  }
]
