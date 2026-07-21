import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// Pruebas de integración: requieren la base de datos real de desarrollo
// migrada y sembrada (npm run db:schema && npm run db:migrate && npm run seed).
const app = createApp();

function randomEmail() {
  return `vitest.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@correo.com`;
}

// Cédula única por corrida: es un UNIQUE real en BD (perfiles_usuario.cedula)
// y no hay BD de pruebas descartable, así que un valor fijo colisionaría con
// corridas anteriores contra la misma base de desarrollo.
function randomCedula() {
  return String(Date.now()).slice(-10);
}

describe("Auth", () => {
  const correo = randomEmail();
  const password = "ClaveSegura123";
  const cedula = randomCedula();

  it("registra un usuario nuevo como rol 'usuario'", async () => {
    const res = await request(app).post("/auth/register").send({
      nombre: "Test Usuario Vitest",
      correo,
      password,
      cedula,
      telefono: "0999999999",
      direccion: "Dirección de prueba",
    });

    expect(res.status).toBe(201);
    expect(res.body.usuario.correo).toBe(correo.toLowerCase());
    expect(res.body.usuario.rol).toBe("usuario");
    expect(res.body.usuario).not.toHaveProperty("password");
  });

  it("rechaza un registro con correo duplicado (409)", async () => {
    const res = await request(app).post("/auth/register").send({
      nombre: "Test Usuario Duplicado",
      correo,
      password,
      cedula: "1000000001",
      telefono: "0999999999",
      direccion: "Dirección de prueba",
    });

    expect(res.status).toBe(409);
  });

  it("permite login con credenciales válidas", async () => {
    const res = await request(app).post("/auth/login").send({ correo, password });

    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe("string");
  });

  it("rechaza login con contraseña incorrecta (401)", async () => {
    const res = await request(app)
      .post("/auth/login")
      .send({ correo, password: "incorrecta123" });

    expect(res.status).toBe(401);
  });

  it("rechaza el acceso a una ruta protegida sin token (401)", async () => {
    const res = await request(app).get("/auth/usuarios");
    expect(res.status).toBe(401);
  });

  it("rechaza un rol insuficiente en una ruta exclusiva de admin (403)", async () => {
    const login = await request(app).post("/auth/login").send({ correo, password });
    const token = login.body.token as string;

    const res = await request(app)
      .get("/auth/usuarios")
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it("rechaza el login de una cuenta suspendida (403)", async () => {
    const adminLogin = await request(app).post("/auth/login").send({
      correo: "admin@huellitas.com",
      password: "Huellitas123",
    });
    const adminToken = adminLogin.body.token as string;
    expect(typeof adminToken).toBe("string");

    await request(app)
      .patch(`/auth/usuarios/${correo}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "Suspendido" });

    const res = await request(app).post("/auth/login").send({ correo, password });
    expect(res.status).toBe(403);

    // Se revierte para no dejar el dato de prueba en un estado inconsistente.
    await request(app)
      .patch(`/auth/usuarios/${correo}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "Activo" });
  });

  it("PATCH /auth/password exige la contraseña actual correcta", async () => {
    const login = await request(app).post("/auth/login").send({ correo, password });
    const token = login.body.token as string;

    const wrong = await request(app)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "incorrecta123", newPassword: "OtraClave456" });
    expect(wrong.status).toBe(401);

    const ok = await request(app)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: password, newPassword: "OtraClave456" });
    expect(ok.status).toBe(200);

    // revertir
    await request(app)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${token}`)
      .send({ currentPassword: "OtraClave456", newPassword: password });
  });

  it("recupera la contraseña con un token de un solo uso", async () => {
    const requestReset = await request(app)
      .post("/auth/forgot-password")
      .send({ correo });

    expect(requestReset.status).toBe(202);
    expect(typeof requestReset.body.token).toBe("string");

    const newPassword = "Recuperada789";
    const reset = await request(app)
      .post("/auth/reset-password")
      .send({ token: requestReset.body.token, newPassword });
    expect(reset.status).toBe(200);

    const reused = await request(app)
      .post("/auth/reset-password")
      .send({ token: requestReset.body.token, newPassword: password });
    expect(reused.status).toBe(400);

    const login = await request(app)
      .post("/auth/login")
      .send({ correo, password: newPassword });
    expect(login.status).toBe(200);

    await request(app)
      .patch("/auth/password")
      .set("Authorization", `Bearer ${login.body.token}`)
      .send({ currentPassword: newPassword, newPassword: password });
  });
});
