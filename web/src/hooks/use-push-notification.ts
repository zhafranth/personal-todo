import { useCallback, useEffect, useState } from 'react'
import { getVapidKey, subscribePush, unsubscribePush } from '../api/client'

type PushStatus = 'unsupported' | 'denied' | 'prompt' | 'subscribed' | 'unsubscribed'

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotification() {
  const [status, setStatus] = useState<PushStatus>('unsupported')
  const [backendSubId, setBackendSubId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setStatus('unsupported')
      return
    }

    if (Notification.permission === 'denied') {
      setStatus('denied')
      return
    }

    navigator.serviceWorker.ready.then((registration) => {
      registration.pushManager.getSubscription().then((sub) => {
        if (sub) {
          setStatus('subscribed')
        } else if (Notification.permission === 'granted') {
          setStatus('unsubscribed')
        } else {
          setStatus('prompt')
        }
      })
    })
  }, [])

  const subscribe = useCallback(async () => {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission === 'denied') {
        setStatus('denied')
        return
      }

      const { publicKey } = await getVapidKey()
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      })

      const subJSON = subscription.toJSON()
      const backendSub = await subscribePush(subJSON)
      setBackendSubId(backendSub.id)
      setStatus('subscribed')
    } catch (err) {
      console.error('Push subscription failed:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const unsubscribe = useCallback(async () => {
    setLoading(true)
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await subscription.unsubscribe()
      }
      if (backendSubId) {
        await unsubscribePush(backendSubId)
        setBackendSubId(null)
      }
      setStatus('unsubscribed')
    } catch (err) {
      console.error('Push unsubscribe failed:', err)
    } finally {
      setLoading(false)
    }
  }, [backendSubId])

  return { status, loading, subscribe, unsubscribe }
}
