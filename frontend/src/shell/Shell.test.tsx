import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Route, Routes } from "react-router-dom"
import { afterEach, expect, test } from "vitest"
import { LoadError, Missing, PageHeading, Shell } from "./Shell"

afterEach(() => {
  localStorage.clear()
  delete document.documentElement.dataset.theme
})

test("the shell shows the product name and the current page", () => {
  render(
    <MemoryRouter initialEntries={["/contacts"]}>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route path="contacts" element={<p>Inside contacts</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  expect(screen.getByText("Accountable")).toBeTruthy()
  expect(screen.getByRole("link", { name: "Dashboard" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Organizations" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Contacts" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Deals" })).toBeTruthy()
  expect(screen.getByRole("link", { name: "Pipeline" })).toBeTruthy()
  expect(screen.getByText("Inside contacts")).toBeTruthy()
})

test("the dark mode control turns the page dark and then light", async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter>
      <Routes>
        <Route path="/" element={<Shell />}>
          <Route index element={<p>Inside</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )
  const toggle = screen.getByRole("button", { name: "Dark mode" })
  expect(toggle).toHaveProperty("ariaPressed", "false")
  await user.click(toggle)
  expect(document.documentElement.dataset.theme).toBe("dark")
  expect(toggle).toHaveProperty("ariaPressed", "true")
  await user.click(toggle)
  expect(document.documentElement.dataset.theme).toBe("light")
  expect(toggle).toHaveProperty("ariaPressed", "false")
})

test("a page heading can carry actions", () => {
  render(<PageHeading title="Contacts" />)
  expect(screen.getByRole("heading", { name: "Contacts" })).toBeTruthy()
  render(
    <PageHeading title="Deals">
      <button type="button">Add deal</button>
    </PageHeading>,
  )
  expect(screen.getByRole("button", { name: "Add deal" })).toBeTruthy()
})

test("missing and failed loads say so", () => {
  render(
    <>
      <Missing />
      <LoadError />
    </>,
  )
  expect(screen.getByText("This record is not here.")).toBeTruthy()
  expect(screen.getByText("Could not load records.")).toBeTruthy()
})
