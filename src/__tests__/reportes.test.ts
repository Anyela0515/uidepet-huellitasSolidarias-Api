import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// Pruebas de integración contra la base de datos real de desarrollo.
const app = createApp();

const evidenciaValida = [
  { name: "foto.jpg", type: "image/jpeg", size: 1024, url: "data:image/jpeg;base64,abc123" },
];

describe("Reportes de rescate", () => {
  let adminToken: string;

  beforeAll(async () => {
    const login = await request(app).post("/auth/login").send({
      correo: "admin@huellitas.com",
      password: "Huellitas123",
    });
    adminToken = login.body.token;
  });

  it("crea un reporte anónimo (sin cuenta, sin contacto) y devuelve un código", async () => {
    const res = await request(app).post("/reportes").send({
      tipoAnimal: "Perro",
      urgencia: "Crítica",
      ubicacion: "Av. Simón Bolívar, sector El Troje",
      descripcion: "Perro herido en la vía, no puede caminar y hay tráfico cerca.",
      evidencias: evidenciaValida,
    });

    expect(res.status).toBe(201);
    expect(res.body.reporte.codigo).toBeTruthy();
    expect(res.body.reporte.estado).toBe("recibida");
    expect(res.body.reporte.contacto).toBeNull();
    expect(res.body.reporte.evidencias).toHaveLength(1);
  });

  it("acepta coordenadas GPS opcionales", async () => {
    const res = await request(app)
      .post("/reportes")
      .send({
        tipoAnimal: "Gato",
        urgencia: "Moderada",
        ubicacion: "Parque central",
        descripcion: "Gatito abandonado hace varios días cerca del parque.",
        coordenadas: { latitud: -3.99313, longitud: -79.20422 },
        evidencias: evidenciaValida,
      });

    expect(res.status).toBe(201);
    expect(res.body.reporte.coordenadas).toEqual({ latitud: -3.99313, longitud: -79.20422 });
  });

  it("rechaza un reporte sin evidencias (422)", async () => {
    const res = await request(app).post("/reportes").send({
      tipoAnimal: "Perro",
      urgencia: "Alta",
      ubicacion: "Sector norte",
      descripcion: "Perro abandonado, se ve desnutrido y asustado.",
      evidencias: [],
    });

    expect(res.status).toBe(422);
  });

  it("rechaza una descripción demasiado corta (422)", async () => {
    const res = await request(app).post("/reportes").send({
      tipoAnimal: "Perro",
      urgencia: "Alta",
      ubicacion: "Sector norte",
      descripcion: "muy corto",
      evidencias: evidenciaValida,
    });

    expect(res.status).toBe(422);
  });

  it("rechaza listar sin token (401)", async () => {
    const res = await request(app).get("/reportes");
    expect(res.status).toBe(401);
  });

  it("un usuario adoptante no puede listar reportes (403)", async () => {
    const login = await request(app).post("/auth/login").send({
      correo: "maria.torres@correo.com",
      password: "Huellitas123",
    });
    const res = await request(app)
      .get("/reportes")
      .set("Authorization", `Bearer ${login.body.token}`);
    expect(res.status).toBe(403);
  });

  it("admin lista los reportes y puede cambiar el estado", async () => {
    const creado = await request(app).post("/reportes").send({
      tipoAnimal: "Otro",
      urgencia: "Moderada",
      ubicacion: "Sector sur",
      descripcion: "Conejo suelto cerca de una avenida transitada, en riesgo.",
      evidencias: evidenciaValida,
    });
    const id = creado.body.reporte.id;

    const listado = await request(app)
      .get("/reportes")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(listado.status).toBe(200);
    expect(listado.body.data.some((r: { id: string }) => r.id === id)).toBe(true);

    const actualizado = await request(app)
      .patch(`/reportes/${id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "atendida" });

    expect(actualizado.status).toBe(200);
    expect(actualizado.body.reporte.estado).toBe("atendida");
  });

  it("filtra reportes por estado", async () => {
    const res = await request(app)
      .get("/reportes?estado=atendida")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((r: { estado: string }) => r.estado === "atendida")).toBe(true);
  });
});
