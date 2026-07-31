import { describe, it, expect } from "vitest";
import { matchesUserSearch, getUserDisplayName, type UserSearchFields } from "@/lib/user-search";

const users: UserSearchFields[] = [
  { displayName: "Alice Tan", email: "alice@example.com", phone: "+65 8123 4567" },
  { name: "Bob Lee", email: "bob.lee@gmail.com", phone: "91234567" },
  { email: "carol@shop.sg", phone: "80009999" }, // no name
];

const filter = (q: string) => users.filter((u) => matchesUserSearch(u, q));

describe("matchesUserSearch", () => {
  it("returns all users for an empty query", () => {
    expect(filter("").length).toBe(3);
    expect(filter("   ").length).toBe(3);
  });

  it("matches by name (displayName or name), case-insensitively", () => {
    expect(filter("alice")).toEqual([users[0]]);
    expect(filter("BOB")).toEqual([users[1]]);
    expect(filter("tan")).toEqual([users[0]]);
  });

  it("matches by email", () => {
    expect(filter("bob.lee@gmail")).toEqual([users[1]]);
    expect(filter("shop.sg")).toEqual([users[2]]);
  });

  it("matches by mobile number, ignoring formatting", () => {
    // Alice's phone is "+65 8123 4567" — a bare-digit query should still find her
    expect(filter("81234567")).toEqual([users[0]]);
    expect(filter("8123")).toEqual([users[0]]);
    expect(filter("9123")).toEqual([users[1]]);
    expect(filter("8000")).toEqual([users[2]]);
  });

  it("returns nothing when there is no match", () => {
    expect(filter("nobody@nowhere")).toEqual([]);
    expect(filter("00000")).toEqual([]);
  });

  it("getUserDisplayName falls back across fields", () => {
    expect(getUserDisplayName({ name: "X" })).toBe("X");
    expect(getUserDisplayName({ displayName: "Y" })).toBe("Y");
    expect(getUserDisplayName({})).toBe("");
  });
});
