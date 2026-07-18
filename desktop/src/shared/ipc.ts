/** Canonical IPC channel names shared between main and preload. */
export const IPC = {
  chrome: {
    minimize: "chrome:minimize",
    maximize: "chrome:maximize",
    close: "chrome:close",
    isMaximized: "chrome:isMaximized",
    maximizeChanged: "chrome:maximizeChanged",
  },
  dialog: {
    openProjectFolder: "dialog:openProjectFolder",
  },
  project: {
    scan: "project:scan",
    scanProgress: "project:scanProgress",
    recents: "project:recents",
    applyAsset: "project:applyAsset",
    cloneRepo: "project:cloneRepo",
  },
  git: {
    applyAsset: "git:applyAsset",
    rollback: "git:rollback",
    status: "git:status",
  },
  fs: {
    tree: "fs:tree",
    read: "fs:read",
  },
  settings: {
    get: "settings:get",
    set: "settings:set",
  },
  auth: {
    getTokens: "auth:getTokens",
    setTokens: "auth:setTokens",
    clear: "auth:clear",
    callback: "auth:callback",
  },
  updater: {
    available: "updater:available",
    downloaded: "updater:downloaded",
    install: "updater:install",
  },
  cache: {
    get: "cache:get",
    set: "cache:set",
  },
  app: {
    version: "app:version",
    e2e: "app:e2e",
  },
  export: {
    saveHtmlAsPdf: "export:saveHtmlAsPdf",
  },
  agent: {
    startRun: "agent:startRun",
    interrupt: "agent:interrupt",
    approve: "agent:approve",
    apply: "agent:apply",
    applyHunks: "agent:applyHunks",
    discard: "agent:discard",
    discardFiles: "agent:discardFiles",
    preview: "agent:preview",
    stopPreview: "agent:stopPreview",
    validate: "agent:validate",
    since: "agent:since",
    activeRun: "agent:activeRun",
    /** Main → renderer push of RunEvents. */
    events: "agent:events",
    /** Main → renderer when cloud run row is created (localRunId → serverRunId). */
    runRegistered: "agent:runRegistered",
  },
  activity: {
    listRuns: "activity:listRuns",
    getRunEvents: "activity:getRunEvents",
    getRun: "activity:getRun",
    appendBrowseRun: "activity:appendBrowseRun",
  },
  planProgress: {
    load: "planProgress:load",
    save: "planProgress:save",
  },
  shell: {
    openExternal: "shell:openExternal",
    openInEditor: "shell:openInEditor",
    revealInFolder: "shell:revealInFolder",
  },
  bundledServer: {
    status: "bundledServer:status",
    start: "bundledServer:start",
    stop: "bundledServer:stop",
    available: "bundledServer:available",
    setApiKey: "bundledServer:setApiKey",
    hasApiKey: "bundledServer:hasApiKey",
  },
  runs: {
    start: "runs:start",
    interrupt: "runs:interrupt",
    browserControl: "runs:browserControl",
  },
  context: {
    suggest: "context:suggest",
    search: "context:search",
  },
  notifications: {
    list: "notifications:list",
    dismiss: "notifications:dismiss",
    updated: "notifications:updated",
  },
  index: {
    enqueue: "index:enqueue",
  },
  traces: {
    list: "traces:list",
    read: "traces:read",
  },
  evidence: {
    saveScreenshot: "evidence:saveScreenshot",
  },
} as const;
