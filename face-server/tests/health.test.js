process.env.NODE_ENV = "test";
const request = require("supertest");
const app = require("../src/server");

describe("Face server health", () => {
  it("responds with ok", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
