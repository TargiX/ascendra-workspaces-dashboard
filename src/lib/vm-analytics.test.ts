import { describe, expect, it } from "vitest";
import { getFleetAttention, getVmHealth } from "./vm-analytics";
import type { VM } from "../domain/types";

const baseVm: VM = {
  id: "vm_test",
  name: "test-vm",
  ownerId: "usr_1",
  templateId: "tpl_1",
  status: "running",
  region: "us-east-1",
  createdAt: "2026-06-24T10:00:00.000Z",
  startedAt: "2026-06-24T10:00:00.000Z",
  lastActiveAt: "2026-06-24T10:30:00.000Z",
  cpuUsagePercent: 25,
  memoryUsagePercent: 50,
  diskUsagePercent: 45,
  hourlyCost: 0.42,
};

describe("vm analytics", () => {
  it("marks a running low-usage VM as idle after one hour", () => {
    const now = new Date("2026-06-24T12:00:00.000Z");
    expect(
      getVmHealth(
        {
          ...baseVm,
          cpuUsagePercent: 4,
          memoryUsagePercent: 12,
          lastActiveAt: "2026-06-24T10:30:00.000Z",
        },
        now,
      ),
    ).toBe("idle");
  });

  it("surfaces possible daily savings for idle machines", () => {
    const attention = getFleetAttention([
      { ...baseVm, cpuUsagePercent: 3, memoryUsagePercent: 11, lastActiveAt: "2026-06-23T10:00:00.000Z" },
    ]);

    expect(attention.idleCount).toBe(1);
    expect(attention.possibleDailySavings).toBeCloseTo(10.08);
  });
});
