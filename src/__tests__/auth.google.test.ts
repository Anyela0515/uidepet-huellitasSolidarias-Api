import { describe, it, expect, vi, beforeEach } from "vitest";
import request from "supertest";

// google-auth-library hace una llamada de red real para verificar el ID
// token; se mockea para poder controlar el payload devuelto en cada caso
// sin depender de credenciales de Google reales.
const verifyIdToken = vi.fn();
vi.mock("google-auth-library", () => ({
  OAuth2Client: vi.fn().mockImplementation(() => ({ verifyIdToken })),
}));

const { createApp } = await import("../app.js");
const app = createApp();

const FAKE_CREDENTIAL = "x".repeat(150);

function randomEmail() {
  return `vitest.google.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@correo.com`;
}

function mockPayload(payload: Record<string, unknown>) {
  verifyIdToken.mockResolvedValueOnce({ getPayload: () => payload });
}

describe("Auth Google", () => {
  beforeEach(() => {
    verifyIdToken.mockReset();
  });

  it("rechaza una credencial cuyo correo Google no verificó (401)", async () => {
    mockPayload({ email: randomEmail(), email_verified: false });

    const res = await request(app)
      .post("/auth/google")
      .send({ credential: FAKE_CREDENTIAL });

    expect(res.status).toBe(401);
  });

  it("crea una cuenta nueva con rol 'usuario' cuando el correo no existía", async () => {
    const correo = randomEmail();
    mockPayload({ email: correo, email_verified: true, name: "Nuevo Vía Google" });

    const res = await request(app)
      .post("/auth/google")
      .send({ credential: FAKE_CREDENTIAL });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
    expect(res.body.usuario.correo).toBe(correo);
    expect(res.body.usuario.rol).toBe("usuario");
  });

  it("hace login con una cuenta existente en vez de duplicarla", async () => {
    mockPayload({
      email: "maria.torres@correo.com",
      email_verified: true,
      name: "María Torres",
    });

    const res = await request(app)
      .post("/auth/google")
      .send({ credential: FAKE_CREDENTIAL });

    expect(res.status).toBe(200);
    expect(res.body.usuario.correo).toBe("maria.torres@correo.com");
  });

  it("rechaza el login de una cuenta suspendida (403)", async () => {
    const adminLogin = await request(app).post("/auth/login").send({
      correo: "admin@huellitas.com",
      password: "Huellitas123",
    });
    const adminToken = adminLogin.body.token as string;

    const correo = randomEmail();
    mockPayload({ email: correo, email_verified: true, name: "Suspendido Google" });
    const creacion = await request(app)
      .post("/auth/google")
      .send({ credential: FAKE_CREDENTIAL });
    expect(creacion.status).toBe(200);

    await request(app)
      .patch(`/auth/usuarios/${correo}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "Suspendido" });

    mockPayload({ email: correo, email_verified: true, name: "Suspendido Google" });
    const res = await request(app)
      .post("/auth/google")
      .send({ credential: FAKE_CREDENTIAL });

    expect(res.status).toBe(403);
  });
});
