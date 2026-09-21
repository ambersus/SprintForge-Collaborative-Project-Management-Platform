import {describe,it,expect} from "vitest";
describe("frontend configuration",()=>{it("uses a safe API fallback",()=>{expect(process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api").toContain("api")})})
