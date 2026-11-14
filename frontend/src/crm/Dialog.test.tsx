import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { expect, test, vi } from "vitest"
import { ConfirmDialog, Dialog, Field } from "./Dialog"

test("the close control tells the caller", async () => {
  const onClose = vi.fn()
  const user = userEvent.setup()
  render(
    <Dialog title="Add organization" onClose={onClose}>
      <p>Form</p>
    </Dialog>,
  )
  expect(screen.getByRole("dialog", { name: "Add organization" })).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Close" }))
  expect(onClose).toHaveBeenCalledOnce()
})

test("a field shows an error only when it has one", () => {
  render(
    <Field label="Name" error="Name is required">
      <input />
    </Field>,
  )
  expect(screen.getByText("Name is required")).toBeTruthy()
})

test("a quiet field has no error", () => {
  render(
    <Field label="Website">
      <input />
    </Field>,
  )
  expect(screen.getByLabelText("Website")).toBeTruthy()
  expect(screen.queryByText("Name is required")).toBeNull()
})

test("delete asks, then cancels or confirms", async () => {
  const onCancel = vi.fn()
  const onConfirm = vi.fn()
  const user = userEvent.setup()
  const view = render(
    <ConfirmDialog
      title="Delete organization"
      body="Delete Northwind?"
      busy={false}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  )
  expect(screen.getByText("Delete Northwind?")).toBeTruthy()
  await user.click(screen.getByRole("button", { name: "Cancel" }))
  expect(onCancel).toHaveBeenCalledOnce()
  await user.click(screen.getByRole("button", { name: "Delete" }))
  expect(onConfirm).toHaveBeenCalledOnce()
  view.rerender(
    <ConfirmDialog
      title="Delete organization"
      body="Delete Northwind?"
      busy
      onCancel={onCancel}
      onConfirm={onConfirm}
    />,
  )
  expect(screen.getByRole("button", { name: "Delete" })).toHaveProperty("disabled", true)
})
