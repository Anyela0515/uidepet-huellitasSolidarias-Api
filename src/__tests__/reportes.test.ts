import { describe, it, expect, beforeAll, vi } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";
import * as emailService from "../services/email.service.js";

vi.mock("../services/email.service.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../services/email.service.js")>();
  return { ...actual, sendFundacionCredentialsEmail: vi.fn().mockResolvedValue(undefined) };
});

const app = createApp();

const JPEG_1PX = "data:image/jpeg;base64,/9j/2wBDAAoHBwgHBgoICAgLCgoLDhgQDg0NDh0VFhEYIx8lJCIfIiEmKzcvJik0KSEiMEExNDk7Pj4+JS5ESUM8SDc9Pjv/2wBDAQoLCw4NDhwQEBw7KCIoOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozv/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAb/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/ALoAH//Z";

const evidenciaValida = [
  { name: "foto.jpg", type: "image/jpeg", size: 1024, url: JPEG_1PX },
];

async function loginAs(correo: string, password: string) {
  const res = await request(app).post("/auth/login").send({ correo, password });
  return res.body.token as string;
}

describe("Reportes de rescate", () => {
  let adminToken: string;

  beforeAll(async () => {
    adminToken = await loginAs("admin@huellitas.com", "Huellitas123");
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
      .send({ estado: "atendida", evidencias: evidenciaValida });

    expect(actualizado.status).toBe(200);
    expect(actualizado.body.reporte.estado).toBe("atendida");
    expect(actualizado.body.reporte.evidenciasRescate).toHaveLength(1);
  });

  it("filtra reportes por estado", async () => {
    const res = await request(app)
      .get("/reportes?estado=atendida")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.every((r: { estado: string }) => r.estado === "atendida")).toBe(true);
  });

  it("rechaza marcar un reporte como atendida sin evidencia (422)", async () => {
    const creado = await request(app).post("/reportes").send({
      tipoAnimal: "Gato",
      urgencia: "Alta",
      ubicacion: "Sector oeste",
      descripcion: "Gato atrapado en una alcantarilla, se escuchan maullidos.",
      evidencias: evidenciaValida,
    });
    const id = creado.body.reporte.id;

    const res = await request(app)
      .patch(`/reportes/${id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "atendida" });

    expect(res.status).toBe(422);
  });

  it("una fundación reclama el reporte al tocarlo; otra fundación queda bloqueada (409), admin no", async () => {
    const creado = await request(app).post("/reportes").send({
      tipoAnimal: "Perro",
      urgencia: "Crítica",
      ubicacion: "Sector este",
      descripcion: "Perro atropellado, necesita atención veterinaria urgente.",
      evidencias: evidenciaValida,
    });
    const id = creado.body.reporte.id;

    const fundacionToken = await loginAs("fundacion@huellitas.com", "Huellitas123");
    const enRevision = await request(app)
      .patch(`/reportes/${id}/estado`)
      .set("Authorization", `Bearer ${fundacionToken}`)
      .send({ estado: "revision" });
    expect(enRevision.status).toBe(200);
    expect(enRevision.body.reporte.organizacionAtiende?.nombre).toBeTruthy();

    const unique = Date.now();
    const correo = `vitest.fundacion.reportes.${unique}@correo.com`;
    const ruc = `11900${String(unique).slice(-8)}`;
    const solicitud = await request(app).post("/fundaciones").send({
      nombre: "Fundación Rescate Vitest",
      ruc,
      representante: "Rep Vitest",
      correo,
      telefono: "0987654321",
      localidadId: (await request(app).get("/catalogos/provincias")).body.data[0].id,
      descripcion: "Fundación de prueba para el bloqueo de reportes entre organizaciones.",
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

    const bloqueado = await request(app)
      .patch(`/reportes/${id}/estado`)
      .set("Authorization", `Bearer ${otraFundacionToken}`)
      .send({ estado: "atendida", evidencias: evidenciaValida });
    expect(bloqueado.status).toBe(409);

    const adminSiPuede = await request(app)
      .patch(`/reportes/${id}/estado`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ estado: "cerrada" });
    expect(adminSiPuede.status).toBe(200);
  });
});
