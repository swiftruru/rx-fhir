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
    draftRestored: 'creator.draft-restored'
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
    search: {
      root: 'consumer.search.root',
      basicForm: 'consumer.search.form.basic',
      basicInput: 'consumer.search.input.basic-value',
      basicSubmit: 'consumer.search.submit.basic'
    },
    results: {
      root: 'consumer.results.root',
      loading: 'consumer.results.loading',
      empty: 'consumer.results.empty',
      error: 'consumer.results.error',
      list: 'consumer.results.list',
      compare: (bundleId: string) => `consumer.results.compare.${bundleId}`
    },
    detail: {
      root: 'consumer.detail',
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
