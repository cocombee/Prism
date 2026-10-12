import { useEffect, useRef, useState } from 'react'
import { nodeErrorNoticeKey, scheduleNodeErrorNoticeExpiry, type NodeNotificationState } from '../../shared/nodeNotificationCategory'

export function useNodeErrorNotice(state: NodeNotificationState & { notificationVersion?: number; runStartedAt?: string }): string | undefined {
  const key = nodeErrorNoticeKey(state)
  const currentKey = useRef(key)
  currentKey.current = key
  const [expiredKey, setExpiredKey] = useState<string>()
  useEffect(() => key ? scheduleNodeErrorNoticeExpiry(key, () => currentKey.current, () => setExpiredKey(key)) : undefined, [key])
  return key && expiredKey !== key ? state.error : undefined
}
