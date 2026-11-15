import { describe, expect, it } from "vitest";
import { answerVoltaHelp } from "@/lib/support-help";

describe("Volta help answers", () => {
  it("explains plan pricing and that payment is not available yet", () => {
    expect(answerVoltaHelp("How much are the plans and how do I pay?")).toContain(
      "In-app payments are coming soon",
    );
  });

  it("routes unsupported questions to human support", () => {
    expect(answerVoltaHelp("Can you help me with something unusual?")).toContain(
      "Contact Volta Support",
    );
  });
});
