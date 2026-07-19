import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// Pruebas de integración: requieren la base de datos real de desarrollo
// migrada y sembrada (npm run db:schema && npm run db:migrate && npm run seed).
// No existe una BD de pruebas descartable: el estado de favoritos persiste
// entre corridas, por lo que cada test normaliza su propio punto de partida
// (DELETE es idempotente) en vez de asumir "nunca fue favorito antes".
const app = createApp();

describe("Favoritos", () => {
  let token: string;
  let mascotaId: number;

  beforeAll(async () => {
    const login = await request(app).post("/auth/login").send({
      correo: "maria.torres@correo.com",
      password: "Huellitas123",
    });
    token = login.body.token;

    const listado = await request(app).get("/mascotas/publicas?limit=1");
    mascotaId = listado.body.data[0].id;

    // Normaliza el punto de partida: sin favorito, sin importar corridas previas.
    await request(app)
      .delete(`/favoritos/${mascotaId}`)
      .set("Authorization", `Bearer ${token}`);
  });

  it("agrega una mascota a favoritos (POST idempotente)", async () => {
    const res = await request(app)
      .post(`/favoritos/${mascotaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);
  });

  it("agregar dos veces la misma mascota no falla ni duplica (PK compuesta)", async () => {
    const res = await request(app)
      .post(`/favoritos/${mascotaId}`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(201);

    const listado = await request(app).get("/favoritos").set("Authorization", `Bearer ${token}`);
    const repetidos = listado.body.data.filter((m: { id: number }) => m.id === mascotaId);
    expect(repetidos.length).toBe(1);
  });

  it("verifica que la mascota quedó marcada como favorita", async () => {
    const res = await request(app)
      .get(`/favoritos/${mascotaId}/verificar`)
      .set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.isFavorite).toBe(true);
  });

  it("la lista de favoritos incluye la mascota agregada", async () => {
    const res = await request(app).get("/favoritos").set("Authorization", `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.some((m: { id: number }) => m.id === mascotaId)).toBe(true);
  });

  it("elimina la mascota de favoritos (DELETE)", async () => {
    const res = await request(app)
      .delete(`/favoritos/${mascotaId}`)
      .set("Authorization", `Bearer ${token}`);
    expect(res.status).toBe(204);

    const verificar = await request(app)
      .get(`/favoritos/${mascotaId}/verificar`)
      .set("Authorization", `Bearer ${token}`);
    expect(verificar.body.isFavorite).toBe(false);
  });

  it("el toggle alterna el estado partiendo de 'no favorito'", async () => {
    const activa = await request(app)
      .post(`/favoritos/${mascotaId}/toggle`)
      .set("Authorization", `Bearer ${token}`);
    expect(activa.body.isFavorite).toBe(true);

    const desactiva = await request(app)
      .post(`/favoritos/${mascotaId}/toggle`)
      .set("Authorization", `Bearer ${token}`);
    expect(desactiva.body.isFavorite).toBe(false);
  });

  it("una fundación no puede usar el módulo de favoritos (403)", async () => {
    const login = await request(app).post("/auth/login").send({
      correo: "fundacion@huellitas.com",
      password: "Huellitas123",
    });
    const fundacionToken = login.body.token;

    const res = await request(app)
      .get("/favoritos")
      .set("Authorization", `Bearer ${fundacionToken}`);

    expect(res.status).toBe(403);
  });
});
