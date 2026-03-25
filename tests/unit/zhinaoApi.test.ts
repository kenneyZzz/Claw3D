import { describe, expect, it } from "vitest";
import * as zhinaoApi from "@/lib/zhinao-api";

describe("getZhinaoClientId", () => {
  it("returns a fresh uuid-like client id on each call", () => {
    const getZhinaoClientId = (
      zhinaoApi as typeof zhinaoApi & {
        getZhinaoClientId?: () => string;
      }
    ).getZhinaoClientId;

    expect(typeof getZhinaoClientId).toBe("function");
    if (!getZhinaoClientId) return;

    const first = getZhinaoClientId();
    const second = getZhinaoClientId();

    expect(first).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(second).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
    expect(first).not.toBe(second);
  });
});
