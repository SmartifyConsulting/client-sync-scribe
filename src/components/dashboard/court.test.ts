import { expect, it } from "vitest";
import { courtFor } from "./court";

it("puts the ball in the client's court when they must decide or sign", () => {
  expect(courtFor("client_decision")).toBe("client");
  expect(courtFor("documentation")).toBe("client");
});
it("puts quoting in the broker's court", () => expect(courtFor("research_quotes")).toBe("advisor"));
it("puts underwriting with the insurer", () => expect(courtFor("underwriting")).toBe("insurer"));
