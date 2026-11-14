import { render } from "@testing-library/react"
import type { ReactElement } from "react"
import { MemoryRouter, Route, Routes } from "react-router-dom"

export function renderRoute(path: string, pattern: string, page: ReactElement) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path={pattern} element={page} />
        <Route path="/organizations" element={<h1>Organizations home</h1>} />
        <Route path="/contacts" element={<h1>Contacts home</h1>} />
        <Route path="/deals" element={<h1>Deals home</h1>} />
      </Routes>
    </MemoryRouter>,
  )
}
