import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { publishingIssue } from "@/components/admin/user-errors";
import { apiError, PublicApiError } from "@/lib/api";

afterEach(() => vi.restoreAllMocks());

describe("user-facing API errors", () => {
  it("hides unexpected technical details behind operation-specific copy", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(
      new Error("Prisma connection failed at localhost with a secret token"),
      { defaultMessage: "We couldn’t save this product. Check its details and try again." },
    );

    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({
      error: "We couldn’t save this product. Check its details and try again.",
    });
  });

  it("keeps explicitly approved customer messages and recovery codes", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const response = apiError(
      new PublicApiError(409, "Choose another available size.", "SIZE_UNAVAILABLE"),
    );

    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "Choose another available size.",
      code: "SIZE_UNAVAILABLE",
    });
  });

  it("turns validation failures into plain form guidance", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    const schema = z.object({ name: z.string().min(1, "Enter a name.") });
    const result = schema.safeParse({ name: "" });
    if (result.success) throw new Error("Expected validation to fail");

    const response = apiError(result.error);
    const body = await response.json();
    expect(response.status).toBe(422);
    expect(body.error).toBe("Some information is missing or invalid. Check the form and try again.");
    expect(body.issues.name).toEqual(["Enter a name."]);
  });
});

describe("publishing error copy", () => {
  it("turns credential failures into a reconnection instruction", () => {
    expect(publishingIssue("Instagram", "OAuth access token expired")).toBe(
      "Instagram needs to be reconnected. Check it under Integrations, then try again.",
    );
  });

  it("does not expose an unknown technical message", () => {
    const copy = publishingIssue("Telegram", "ECONNRESET at 10.0.0.4:5432");
    expect(copy).toContain("Telegram did not respond");
    expect(copy).not.toContain("ECONNRESET");
    expect(copy).not.toContain("5432");
  });
});
