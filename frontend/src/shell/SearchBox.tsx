import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { api, type SearchHit } from "../lib/api"

const KIND = {
  organization: "Organization",
  contact: "Contact",
  deal: "Deal",
} as const

function href(item: SearchHit): string {
  if (item.kind === "organization") return `/organizations/${item.id}`
  if (item.kind === "contact") return `/contacts/${item.id}`
  return `/deals/${item.id}`
}

export function SearchBox() {
  const [q, setQ] = useState("")
  const [result, setResult] = useState<{ q: string; items: SearchHit[] } | null>(null)

  useEffect(() => {
    const text = q.trim()
    if (!text) return
    let live = true
    api
      .search(text)
      .then((found) => {
        if (live) setResult({ q: text, items: found.items })
      })
      .catch(() => {
        if (live) setResult({ q: text, items: [] })
      })
    return () => {
      live = false
    }
  }, [q])

  const text = q.trim()
  const items = result && result.q === text ? result.items : []
  const showEmpty = text !== "" && result?.q === text && items.length === 0

  return (
    <div className="search">
      <input aria-label="Search" value={q} onChange={(event) => setQ(event.target.value)} />
      {showEmpty ? <p className="search-results panel">There are no matches.</p> : null}
      {items.length > 0 ? (
        <div className="search-results panel">
          {items.map((item) => (
            <Link key={`${item.kind}-${item.id}`} to={href(item)}>
              <span>{item.name}</span>
              <span>{KIND[item.kind]}</span>
            </Link>
          ))}
        </div>
      ) : null}
    </div>
  )
}
