import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { RouterProvider, createBrowserRouter } from "react-router-dom"
import { ContactPage } from "./crm/pages/ContactPage"
import { ContactsPage } from "./crm/pages/ContactsPage"
import { DashboardPage } from "./crm/pages/DashboardPage"
import { DealPage } from "./crm/pages/DealPage"
import { DealsPage } from "./crm/pages/DealsPage"
import { OrganizationPage } from "./crm/pages/OrganizationPage"
import { OrganizationsPage } from "./crm/pages/OrganizationsPage"
import { PipelinePage } from "./crm/pages/PipelinePage"
import { Missing, Shell } from "./shell/Shell"
import { SignIn } from "./shell/SignIn"
import { SessionProvider, useSession } from "./shell/session"
import { applyTheme, readTheme } from "./shell/theme"
import "./styles.css"

applyTheme(readTheme())

const router = createBrowserRouter([
  {
    path: "/",
    element: <Shell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: "organizations", element: <OrganizationsPage /> },
      { path: "organizations/:id", element: <OrganizationPage /> },
      { path: "contacts", element: <ContactsPage /> },
      { path: "contacts/:id", element: <ContactPage /> },
      { path: "deals", element: <DealsPage /> },
      { path: "deals/:id", element: <DealPage /> },
      { path: "pipeline", element: <PipelinePage /> },
      { path: "*", element: <Missing /> },
    ],
  },
])

function Gate() {
  const { user } = useSession()
  if (!user) return <SignIn />
  return <RouterProvider router={router} />
}

export function App() {
  return (
    <StrictMode>
      <SessionProvider>
        <Gate />
      </SessionProvider>
    </StrictMode>
  )
}

const root = document.getElementById("root")
if (root) createRoot(root).render(<App />)
