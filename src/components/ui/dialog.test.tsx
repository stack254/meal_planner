// @vitest-environment jsdom
import { expect, it, vi } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import { afterEach } from "vitest";
import { Modal } from "./dialog";
afterEach(cleanup);
it("gives the dialog a name and closes with Escape", () => {
  const close = vi.fn();
  render(
    <Modal title="Edit meal" onClose={close}>
      <button>Save</button>
    </Modal>,
  );
  expect(screen.getByRole("dialog", { name: "Edit meal" })).toBeTruthy();
  fireEvent.keyDown(document, { key: "Escape" });
  expect(close).toHaveBeenCalled();
});
