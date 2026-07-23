import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

// Pruebas de integración: requieren la base de datos real de desarrollo
// migrada y sembrada (npm run db:schema && npm run db:migrate && npm run seed).
const app = createApp();

function randomEmail(tag: string) {
  return `vitest.${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@correo.com`;
}

function randomCedula() {
  return String(Date.now()).slice(-10);
}

async function loginAs(correo: string, password: string) {
  const res = await request(app).post("/auth/login").send({ correo, password });
  return res.body.token as string;
}

function formularioValido(overrides: Record<string, unknown> = {}) {
  return {
    nombre: "Adoptante Vitest",
    cedula: randomCedula(),
    telefono: "0991234567",
    correo: "adoptante.vitest@correo.com",
    direccion: "Calle de prueba 123",
    ciudad: "Loja",
    tipoVivienda: "Casa",
    personasHogar: "3",
    acuerdoHogar: "Si",
    permanenciaAnimal: "En el patio trasero techado, con acceso a la sala durante las noches.",
    lugarDormir: "En una cama propia dentro de la sala, cerca del resto de la familia.",
    tieneMascotas: "No",
    responsableCuidado: "Adoptante Vitest",
    responsableGastos: "Adoptante Vitest",
    seguimiento: "Si",
    contrato: "Si",
    declaracion: true,
    ...overrides,
  };
}

describe("Solicitudes", () => {
  it("crea una solicitud y solo el adoptante dueño, su fundación o un admin pueden verla", async () => {
    const fundacionToken = await loginAs("fundacion@huellitas.com", "Huellitas123");

    const mascota = await request(app)
      .post("/mascotas")
      .set("Authorization", `Bearer ${fundacionToken}`)
      .send({
        nombre: "Mascota Solicitud Vitest",
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
    expect(mascota.status).toBe(201);
    const mascotaId = mascota.body.mascota.id;

    const adoptanteCorreo = randomEmail("adoptante");
    const adoptantePassword = "ClaveSegura123";
    const registro = await request(app).post("/auth/register").send({
      nombre: "Adoptante Vitest",
      correo: adoptanteCorreo,
      password: adoptantePassword,
      cedula: randomCedula(),
      telefono: "0991234567",
      direccion: "Dirección de prueba",
    });
    expect(registro.status).toBe(201);
    const adoptanteToken = await loginAs(adoptanteCorreo, adoptantePassword);

    const solicitud = await request(app)
      .post("/solicitudes")
      .set("Authorization", `Bearer ${adoptanteToken}`)
      .send({ petId: mascotaId, form: formularioValido() });
    expect(solicitud.status).toBe(201);
    const solicitudId = solicitud.body.solicitud.id;

    // El adoptante dueño sí puede verla.
    const propia = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${adoptanteToken}`);
    expect(propia.status).toBe(200);

    // La fundación dueña de la mascota sí puede verla.
    const vistaFundacion = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${fundacionToken}`);
    expect(vistaFundacion.status).toBe(200);

    // El admin siempre puede verla.
    const adminToken = await loginAs("admin@huellitas.com", "Huellitas123");
    const vistaAdmin = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(vistaAdmin.status).toBe(200);

    // Un usuario ajeno NO puede ver los datos personales de esta solicitud.
    const otroCorreo = randomEmail("ajeno");
    const otroPassword = "ClaveSegura123";
    await request(app).post("/auth/register").send({
      nombre: "Usuario Ajeno Vitest",
      correo: otroCorreo,
      password: otroPassword,
      cedula: randomCedula(),
      telefono: "0991234567",
      direccion: "Dirección de prueba",
    });
    const otroToken = await loginAs(otroCorreo, otroPassword);

    const vistaAjena = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${otroToken}`);
    expect(vistaAjena.status).toBe(403);

    // limpieza: borrado lógico de la mascota creada para esta prueba.
    await request(app)
      .delete(`/mascotas/${mascotaId}`)
      .set("Authorization", `Bearer ${fundacionToken}`);
  });

  it("rechaza un formulario de adopción incompleto (422)", async () => {
    const visibles = await request(app).get("/mascotas/publicas?limit=1");
    const mascotaId = visibles.body.data[0]?.id;

    const adoptanteCorreo = randomEmail("incompleto");
    const adoptantePassword = "ClaveSegura123";
    await request(app).post("/auth/register").send({
      nombre: "Adoptante Incompleto",
      correo: adoptanteCorreo,
      password: adoptantePassword,
      cedula: randomCedula(),
      telefono: "0991234567",
      direccion: "Dirección de prueba",
    });
    const adoptanteToken = await loginAs(adoptanteCorreo, adoptantePassword);

    const res = await request(app)
      .post("/solicitudes")
      .set("Authorization", `Bearer ${adoptanteToken}`)
      .send({ petId: mascotaId, form: { nombre: "Solo nombre" } });

    expect(res.status).toBe(422);
  });
});
