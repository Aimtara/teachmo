import { useEffect, useMemo } from "react"
import DOMPurify from "dompurify"

const DEFAULT_CSP = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "img-src 'self' data:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self'",
  "connect-src 'self'",
].join("; ")

export const sanitizeHtml = (html) =>
  DOMPurify.sanitize(html ?? "", { USE_PROFILES: { html: true } })

const ensureCspMeta = (policy) => {
  if (!policy || typeof document === "undefined") return undefined

  const existing = document.querySelector(
    'meta[http-equiv="Content-Security-Policy"]'
  )

  if (existing) {
    existing.content = policy
    return undefined
  }

  const meta = document.createElement("meta")
  meta.httpEquiv = "Content-Security-Policy"
  meta.content = policy
  document.head.appendChild(meta)

  return () => {
    if (meta.parentNode) {
      meta.parentNode.removeChild(meta)
    }
  }
}

const CriticalSecurityFixes = ({ html, csp = DEFAULT_CSP, className }) => {
  useEffect(() => ensureCspMeta(csp), [csp])

  const sanitizedHtml = useMemo(() => sanitizeHtml(html), [html])

  if (!sanitizedHtml) return null

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

export default CriticalSecurityFixes
