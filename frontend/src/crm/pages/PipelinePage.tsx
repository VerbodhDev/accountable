import { useEffect, useState } from "react"
import { api, type Contact, type Deal, type Organization } from "../../lib/api"
import { Board } from "../Board"
import { DealForm } from "../Forms"
import { LoadError, PageHeading } from "../../shell/Shell"

export function PipelinePage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [today, setToday] = useState("")
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [contacts, setContacts] = useState<Contact[]>([])
  const [error, setError] = useState(false)
  const [loaded, setLoaded] = useState(false)
  const [stage, setStage] = useState<string | null>(null)

  async function load() {
    try {
      setError(false)
      const data = await api.deals()
      setDeals(data.items)
      setToday(data.today)
      setLoaded(true)
    } catch {
      setError(true)
    }
  }

  useEffect(() => { void load() }, [])

  async function openAdd(nextStage: string) {
    const [orgs, people] = await Promise.all([api.organizations(), api.contacts()])
    setOrganizations(orgs.items)
    setContacts(people.items)
    setStage(nextStage)
  }

  return (
    <>
      <PageHeading title="Pipeline" />
      {error ? <LoadError /> : null}
      {loaded ? <Board deals={deals} today={today} onReload={load} onAdd={(next) => void openAdd(next)} /> : error ? null : <p>Loading records.</p>}
      {stage ? (
        <DealForm
          organizations={organizations}
          contacts={contacts}
          defaultStage={stage}
          onCancel={() => setStage(null)}
          onSaved={() => { setStage(null); void load() }}
        />
      ) : null}
    </>
  )
}
