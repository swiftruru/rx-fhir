export const selectors = {
  app: {
    sidebar: 'app.sidebar',
    nav: {
      creator: 'app.sidebar.nav.creator',
      consumer: 'app.sidebar.nav.consumer',
      settings: 'app.sidebar.nav.settings',
      about: 'app.sidebar.nav.about'
    }
  },
  creator: {
    draftStatus: 'creator.draft-status',
    draftRestored: 'creator.draft-restored',
    compositionAudit: 'creator.composition.audit',
    bundleSuccess: 'creator.bundle-success',
    goToConsumer: 'creator.go-to-consumer',
    previewInConsumer: 'creator.preview-in-consumer'
  },
  consumer: {
    dropzoneRoot: 'consumer.dropzone.root',
    dropzoneOverlay: 'consumer.dropzone.overlay',
    middleTabs: {
      results: 'consumer.middle-tab.results',
      quickstart: 'consumer.middle-tab.quickstart',
      history: 'consumer.middle-tab.history'
    },
    history: {
      root: 'consumer.history.tab-pane',
      innerTabs: {
        submissions: 'consumer.history.inner-tab.submissions',
        searches: 'consumer.history.inner-tab.searches'
      },
      submissionList: {
        root: 'consumer.history.submission-list',
        filter: 'consumer.history.submission-list.filter',
        sort: 'consumer.history.submission-list.sort',
        card: 'consumer.history.submission-card',
        view: 'consumer.history.submission-view',
        fill: 'consumer.history.submission-fill',
        delete: 'consumer.history.submission-delete'
      },
      searchList: {
        root: 'consumer.history.search-list',
        filter: 'consumer.history.search-list.filter',
        sort: 'consumer.history.search-list.sort',
        card: 'consumer.history.search-card',
        run: 'consumer.history.search-run',
        pin: 'consumer.history.search-pin',
        delete: 'consumer.history.search-delete',
        pinnedBadge: 'consumer.history.search-pinned-badge'
      }
    },
    savedSearches: {
      dashboard: 'consumer.saved-searches.dashboard',
      sidebar: 'consumer.saved-searches.sidebar',
      toggle: (variant: 'dashboard' | 'sidebar') => `consumer.saved-searches.toggle.${variant}`,
      clearRecent: (variant: 'dashboard' | 'sidebar') => `consumer.saved-searches.clear-recent.${variant}`,
      row: 'consumer.saved-search.row',
      run: 'consumer.saved-search.run',
      pin: 'consumer.saved-search.pin',
      delete: 'consumer.saved-search.delete'
    },
    recentRecords: {
      dashboard: 'consumer.recent-records.dashboard',
      sidebar: 'consumer.recent-records.sidebar',
      toggle: (variant: 'dashboard' | 'sidebar') => `consumer.recent-records.toggle.${variant}`,
      clearAll: (variant: 'dashboard' | 'sidebar') => `consumer.recent-records.clear-all.${variant}`,
      row: 'consumer.recent-record.row',
      fill: 'consumer.recent-record.fill',
      delete: 'consumer.recent-record.delete'
    },
    search: {
      root: 'consumer.search.root',
      basicForm: 'consumer.search.form.basic',
      basicInput: 'consumer.search.input.basic-value',
      basicSubmit: 'consumer.search.submit.basic',
      basicCancel: 'consumer.search.cancel.basic',
      dateForm: 'consumer.search.form.date',
      dateIdentifier: 'consumer.search.input.date-identifier',
      dateValue: 'consumer.search.input.date-value',
      dateSubmit: 'consumer.search.submit.date',
      dateCancel: 'consumer.search.cancel.date',
      complexForm: 'consumer.search.form.complex',
      complexIdentifier: 'consumer.search.input.complex-identifier',
      complexBy: 'consumer.search.input.complex-by',
      complexOrgId: 'consumer.search.input.complex-org-id',
      complexAuthorName: 'consumer.search.input.complex-author-name',
      complexSubmit: 'consumer.search.submit.complex',
      complexCancel: 'consumer.search.cancel.complex'
    },
    previewReturn: {
      root: 'consumer.preview-return.root',
      action: 'consumer.preview-return.action'
    },
    results: {
      root: 'consumer.results.root',
      loading: 'consumer.results.loading',
      cancelled: 'consumer.results.cancelled',
      empty: 'consumer.results.empty',
      error: 'consumer.results.error',
      list: 'consumer.results.list',
      compare: (bundleId: string) => `consumer.results.compare.${bundleId}`,
      loadMore: 'consumer.results.load-more'
    },
    detail: {
      root: 'consumer.detail',
      previewBadge: 'consumer.detail.preview-badge',
      audit: 'consumer.detail.audit',
      structuredView: 'consumer.detail.view.structured',
      jsonView: 'consumer.detail.view.json',
      exportTrigger: 'consumer.detail.export.trigger',
      exportJson: 'consumer.detail.export.json',
      exportPostman: 'consumer.detail.export.postman',
      exportHtml: 'consumer.detail.export.html'
    }
  },
  settings: {
    tabs: {
      server: 'settings.tab.server',
      accessibility: 'settings.tab.accessibility',
      shortcuts: 'settings.tab.shortcuts'
    },
    server: {
      urlInput: 'settings.server.url-input',
      testConnection: 'settings.server.test-connection',
      save: 'settings.server.save',
      reset: 'settings.server.reset',
      testSuccess: 'settings.server.test-success',
      testFail: 'settings.server.test-fail',
      saved: 'settings.server.saved',
      statusCard: 'settings.server.status-card',
      statusIndicator: 'settings.server.status-indicator',
      capabilities: 'settings.server.capabilities',
      bundleValidateCapability: 'settings.server.capability.bundle-validate'
    },
    accessibility: {
      motion: (option: string) => `settings.accessibility.motion.${option}`,
      textScale: (option: string) => `settings.accessibility.text-scale.${option}`,
      zoom: (option: string) => `settings.accessibility.zoom.${option}`,
      focus: (option: string) => `settings.accessibility.focus.${option}`
    }
  },
  about: {
    external: {
      github: 'about.external.github',
      homepage: 'about.external.homepage'
    },
    update: {
      indicator: 'about.update.indicator',
      check: 'about.update.check',
      statuses: {
        upToDate: 'about.update.status.up-to-date',
        available: 'about.update.status.available',
        error: 'about.update.status.error'
      },
      openReleases: 'about.update.open-releases',
      remindLater: 'about.update.remind-later',
      skipVersion: 'about.update.skip-version'
    }
  }
} as const
