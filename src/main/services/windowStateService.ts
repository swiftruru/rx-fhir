import { app, BrowserWindow, screen } from 'electron'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'path'

type ElectronBrowserWindow = InstanceType<typeof BrowserWindow>

export interface WindowState {
  width: number
  height: number
  x?: number
  y?: number
  isMaximized?: boolean
}

export const DEFAULT_WINDOW_STATE: WindowState = {
  width: 1280,
  height: 800,
  isMaximized: false
}

export const MIN_WINDOW_WIDTH = 900
export const MIN_WINDOW_HEIGHT = 600

const WINDOW_STATE_PATH = join(app.getPath('userData'), 'window-state.json')

function isVisibleWithinDisplays(state: WindowState): boolean {
  if (state.x === undefined || state.y === undefined) return true
  const x = state.x
  const y = state.y

  return screen.getAllDisplays().some((display) => {
    const { x: areaX, y: areaY, width, height } = display.workArea
    return x >= areaX
      && y >= areaY
      && x < areaX + width
      && y < areaY + height
  })
}

export async function readWindowState(): Promise<WindowState> {
  try {
    const raw = await readFile(WINDOW_STATE_PATH, 'utf8')
    const parsed = JSON.parse(raw) as Partial<WindowState>

    const nextState: WindowState = {
      width: Math.max(MIN_WINDOW_WIDTH, Math.round(parsed.width ?? DEFAULT_WINDOW_STATE.width)),
      height: Math.max(MIN_WINDOW_HEIGHT, Math.round(parsed.height ?? DEFAULT_WINDOW_STATE.height)),
      x: typeof parsed.x === 'number' ? Math.round(parsed.x) : undefined,
      y: typeof parsed.y === 'number' ? Math.round(parsed.y) : undefined,
      isMaximized: Boolean(parsed.isMaximized)
    }

    if (!isVisibleWithinDisplays(nextState)) {
      return {
        ...DEFAULT_WINDOW_STATE,
        width: nextState.width,
        height: nextState.height
      }
    }

    return nextState
  } catch {
    return DEFAULT_WINDOW_STATE
  }
}

export async function writeWindowState(windowState: WindowState): Promise<void> {
  await writeFile(WINDOW_STATE_PATH, JSON.stringify(windowState, null, 2), 'utf8')
}

export function getWindowState(mainWindow: ElectronBrowserWindow): WindowState {
  const bounds = mainWindow.isMaximized() ? mainWindow.getNormalBounds() : mainWindow.getBounds()
  return {
    width: Math.max(MIN_WINDOW_WIDTH, Math.round(bounds.width)),
    height: Math.max(MIN_WINDOW_HEIGHT, Math.round(bounds.height)),
    x: Math.round(bounds.x),
    y: Math.round(bounds.y),
    isMaximized: mainWindow.isMaximized()
  }
}
