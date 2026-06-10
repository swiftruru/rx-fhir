export type AppRouteKey = 'creator' | 'consumer' | 'converter' | 'settings' | 'about'

const ROUTE_NAV_KEYS: Record<string, AppRouteKey> = {
  '/creator': 'creator',
  '/consumer': 'consumer',
  '/converter': 'converter',
  '/settings': 'settings',
  '/about': 'about'
}

export function getRouteNavKey(pathname: string): AppRouteKey | undefined {
  return ROUTE_NAV_KEYS[pathname]
}
