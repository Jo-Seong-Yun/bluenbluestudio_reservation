import { describe, expect, it } from "vitest";
import { phoneField, phoneLookupSchema } from "./validation/reservation";

describe("Korean phone autofill", () => {
  it.each([
    "01040948731",
    "010-4094-8731",
    "8201040948731",
    "821040948731",
    "+821040948731",
    "+82 (0)10 4094 8731",
  ])("normalizes %s for submission and lookup", (value) => {
    expect(phoneField.parse(value)).toBe("01040948731");
    expect(phoneLookupSchema.parse({ phone: value }).phone).toBe("01040948731");
  });
  it.each(["+82104094873199", "010409487319", "+120240948731", "8210"])(
    "rejects malformed numbers without truncating: %s",
    (value) => {
      expect(phoneField.safeParse(value).success).toBe(false);
    },
  );
});
