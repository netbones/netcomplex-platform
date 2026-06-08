import { posthog } from 'posthog-js'

export function register() {
  if (typeof window !== 'undefined') {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
      api_host:
        process.env.NEXT_PUBLIC_POSTHOG_HOST || '/ingest',
      defaults: '2026-01-30',
      capture_pageview: false,
      autocapture: true,
      session_recording: {
        maskAllInputs: true,
        maskTextSelector: '*',
      },
    })
  }
}
