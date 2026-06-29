import { describe, expect, it } from "vitest";
import { getActionBusyLabel, getTransitionStatus } from "./vm-actions";

describe("vm actions", () => {
  it("maps lifecycle actions to transition statuses", () => {
    expect(getTransitionStatus("start")).toBe("starting");
    expect(getTransitionStatus("restart")).toBe("starting");
    expect(getTransitionStatus("stop")).toBe("stopping");
  });

  it("does not let a stale start action override stopping state", () => {
    expect(getActionBusyLabel("start", "stopping")).toBe("Stopping...");
    expect(getActionBusyLabel(undefined, "stopping")).toBe("Stopping...");
  });

  it("keeps restart distinguishable while the local mutation is pending", () => {
    expect(getActionBusyLabel("restart", "starting")).toBe("Restarting...");
    expect(getActionBusyLabel(undefined, "starting")).toBe("Starting...");
  });

  it("keeps stopping authoritative over stale transition intent", () => {
    expect(getActionBusyLabel("restart", "stopping")).toBe("Stopping...");
  });
});
