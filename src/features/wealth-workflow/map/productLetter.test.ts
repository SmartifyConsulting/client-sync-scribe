import { expect, it } from "vitest";
import { productLetter } from "./productLetter";
it("uses the agreed letters", () => {
  expect(productLetter("Life Cover")).toBe("L");
  expect(productLetter("Dread Disease")).toBe("D");
  expect(productLetter("Income Protection")).toBe("I");
  expect(productLetter("Car Insurance")).toBe("C");
  expect(productLetter("Home Insurance")).toBe("H");
});
