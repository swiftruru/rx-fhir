export type AppRouteKey = 'creator' | 'consumer' | 'settings' | 'about'

const ROUTE_NAV_KEYS: Record<string, AppRouteKey> = {
  '/creator': 'creator',
  '/consumer': 'consumer',
  '/settings': 'settings',
  '/about': 'about'
}

export function getRouteNavKey(pathname: string): AppRouteKey | undefined {
  return ROUTE_NAV_KEYS[pathname]
}
