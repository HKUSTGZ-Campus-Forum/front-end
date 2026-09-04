/** Called only from an explicit browser download gesture; no server request. */
export function downloadSchedulerCalendar(content: string, filename: string): void {
  const anchor = document.createElement('a')
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  try {
    anchor.href = url
    anchor.download = filename
    document.body.appendChild(anchor)
    anchor.click()
  } finally {
    anchor.remove()
    // Keep the URL alive until the browser has consumed the download gesture.
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }
}
