import { useCallback, useEffect, useState } from 'react'
import {
  isExtensionContext,
  loadExtensionSettings,
  subscribeExtensionSettings,
  type ExtensionSettings,
} from './settings'

export function useExtensionSettings(enabled = isExtensionContext()) {
  const [settings, setSettings] = useState<ExtensionSettings | null>(null)
  const [loading, setLoading] = useState(enabled)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    try {
      setSettings(await loadExtensionSettings())
    } finally {
      setLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    if (!enabled) return
    void refresh()
    return subscribeExtensionSettings(setSettings)
  }, [enabled, refresh])

  return { settings, loading, refresh }
}
