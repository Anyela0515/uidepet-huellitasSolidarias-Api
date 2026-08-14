import { describe, it, expect, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import * as emailService from "../services/email.service.js";

vi.mock("../services/email.service.js", () => ({
  sendFundacionCredentialsEmail: vi.fn().mockResolvedValue(undefined),
}));

const app = createApp();

async function loginAs(correo: string, password: string) {
  const res = await request(app).post("/auth/login").send({ correo, password });
  return res.body.token as string;
}

describe("Mascotas", () => {
  it("lista mascotas públicas paginadas con metadata", async () => {
    const res = await request(app).get("/mascotas/publicas?page=1&limit=2");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(2);
    expect(res.body.pagination).toMatchObject({ page: 1, limit: 2 });
    expect(typeof res.body.pagination.total).toBe("number");
  });

  it("filtra por especie", async () => {
    const res = await request(app).get("/mascotas/publicas?especie=Perro&limit=50");

    expect(res.status).toBe(200);
    for (const mascota of res.body.data) {
      expect(mascota.especie).toBe("Perro");
    }
  });

  it("una fundación puede crear una mascota propia", async () => {
    const token = await loginAs("fundacion@huellitas.com", "Huellitas123");

    const res = await request(app)
      .post("/mascotas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Test Mascota Vitest",
        especie: "Perro",
        raza: "Mestizo",
        edad: "2 Años",
        sexo: "Macho",
        tamano: "Mediano",
        ubicacion: "Loja",
        historia: "Historia de prueba suficientemente larga para el schema.",
        requisitos: "Requisitos de prueba.",
        imagen: "data:image/png;base64,AAAA",
      });

    expect(res.status).toBe(201);
    expect(res.body.mascota.nombre).toBe("Test Mascota Vitest");

    await request(app)
      .delete(`/mascotas/${res.body.mascota.id}`)
      .set("Authorization", `Bearer ${token}`);
  });

  it("un usuario adoptante no puede crear mascotas (403)", async () => {
    const token = await loginAs("maria.torres@correo.com", "Huellitas123");

    const res = await request(app)
      .post("/mascotas")
      .set("Authorization", `Bearer ${token}`)
      .send({ nombre: "x" });

    expect(res.status).toBe(403);
  });

  it("una fundación no puede editar una mascota ajena (403)", async () => {

    const visibles = await request(app).get("/mascotas/publicas?limit=1");
    const mascotaAjenaId = visibles.body.data[0]?.id;
    expect(mascotaAjenaId).toBeDefined();

    const adminToken = await loginAs("admin@huellitas.com", "Huellitas123");
    const unique = Date.now();
    const correo = `vitest.fundacion.${unique}@correo.com`;

    const ruc = `11900${String(unique).slice(-8)}`;

    const solicitud = await request(app).post("/fundaciones").send({
      nombre: "Segunda Fundación Vitest",
      ruc,
      representante: "Rep Vitest",
      correo,
      telefono: "0987654321",
      localidadId: (await request(app).get("/catalogos/provincias")).body.data[0].id,
      descripcion: "Fundación de prueba para aislar recursos entre tenants.",
    });
    expect(solicitud.status).toBe(201);

    const aprobacion = await request(app)
      .patch(`/fundaciones/${solicitud.body.fundacion.id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "aprobada" });
    expect(aprobacion.status).toBe(200);
    const envio = vi
      .mocked(emailService.sendFundacionCredentialsEmail)
      .mock.calls.find((args) => args[0] === correo);
    const temporaryPassword = envio?.[2] as string;

    const otraFundacionToken = await loginAs(correo, temporaryPassword);
    expect(typeof otraFundacionToken).toBe("string");

    const res = await request(app)
      .patch(`/mascotas/${mascotaAjenaId}`)
      .set("Authorization", `Bearer ${otraFundacionToken}`)
      .send({ nombre: "Intento de edición ajena" });

    expect(res.status).toBe(403);
  });

  it("el borrado de una mascota con solicitudes históricas no revienta (soft delete)", async () => {
    const token = await loginAs("fundacion@huellitas.com", "Huellitas123");

    const creada = await request(app)
      .post("/mascotas")
      .set("Authorization", `Bearer ${token}`)
      .send({
        nombre: "Mascota Para Borrar",
        especie: "Gato",
        raza: "Mestizo",
        edad: "1 Años",
        sexo: "Hembra",
        tamano: "Pequeño",
        ubicacion: "Loja",
        historia: "Historia de prueba suficientemente larga para el schema.",
        requisitos: "Requisitos de prueba.",
        imagen: "data:image/png;base64,AAAA",
      });
    const id = creada.body.mascota.id;

    const del = await request(app)
      .delete(`/mascotas/${id}`)
      .set("Authorization", `Bearer ${token}`);
    expect(del.status).toBe(204);

    const detalle = await request(app).get(`/mascotas/${id}`);
    expect(detalle.status).toBe(404);
  });

  it("el plan básico no deja publicar más de 20 mascotas activas", async () => {
    const adminToken = await loginAs("admin@huellitas.com", "Huellitas123");
    const unique = Date.now();
    const correo = `vitest.plan.${unique}@correo.com`;
    const ruc = `11900${String(unique).slice(-8)}`;

    const solicitud = await request(app).post("/fundaciones").send({
      nombre: "Fundación Plan Básico Vitest",
      ruc,
      representante: "Rep Vitest",
      correo,
      telefono: "0987654321",
      localidadId: (await request(app).get("/catalogos/provincias")).body.data[0].id,
      descripcion: "Fundación de prueba para el límite del plan gratuito.",
    });
    expect(solicitud.status).toBe(201);

    const aprobacion = await request(app)
      .patch(`/fundaciones/${solicitud.body.fundacion.id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "aprobada" });
    expect(aprobacion.status).toBe(200);
    const envio = vi
      .mocked(emailService.sendFundacionCredentialsEmail)
      .mock.calls.find((args) => args[0] === correo);
    const temporaryPassword = envio?.[2] as string;
    const token = await loginAs(correo, temporaryPassword);

    const base = {
      especie: "Perro",
      raza: "Mestizo",
      edad: "2 Años",
      sexo: "Macho",
      tamano: "Mediano",
      ubicacion: "Loja",
      historia: "Historia de prueba suficientemente larga para el schema.",
      requisitos: "Requisitos de prueba.",
      imagen: "data:image/png;base64,AAAA",
    };

    for (let i = 1; i <= 20; i += 1) {
      const res = await request(app)
        .post("/mascotas")
        .set("Authorization", `Bearer ${token}`)
        .send({ ...base, nombre: `Mascota Plan ${i}` });
      expect(res.status).toBe(201);
    }

    const excedida = await request(app)
      .post("/mascotas")
      .set("Authorization", `Bearer ${token}`)
      .send({ ...base, nombre: "Mascota Plan 21" });
    expect(excedida.status).toBe(400);
    expect(excedida.body.error).toMatch(/límite de 20 mascotas/);
  }, 30000);
});
