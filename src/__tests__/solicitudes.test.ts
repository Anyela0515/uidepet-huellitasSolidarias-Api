import { describe, it, expect } from "vitest";
import request from "supertest";
import { createApp } from "../app.js";

const app = createApp();

function randomEmail(tag: string) {
  return `vitest.${tag}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}@correo.com`;
}

function randomCedula() {
  const base = String(Date.now()).slice(-9);
  const cuerpo = "17" + Math.min(Number(base[2]), 5) + base.slice(3);
  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let resultado = Number(cuerpo[i]) * coeficientes[i];
    if (resultado >= 10) resultado -= 9;
    suma += resultado;
  }
  const residuo = suma % 10;
  const verificador = residuo === 0 ? 0 : 10 - residuo;
  return cuerpo + verificador;
}

async function loginAs(correo: string, password: string) {
  const res = await request(app).post("/auth/login").send({ correo, password });
  return res.body.token as string;
}

async function primeraParroquiaId(): Promise<number> {
  const provincias = await request(app).get("/catalogos/provincias");
  const provinciaId = provincias.body.data[0].id;
  const cantones = await request(app).get(`/catalogos/cantones?provinciaId=${provinciaId}`);
  const cantonId = cantones.body.data[0].id;
  const parroquias = await request(app).get(`/catalogos/parroquias?cantonId=${cantonId}`);
  return parroquias.body.data[0].id as number;
}

function formularioValido(localidadId: number, overrides: Record<string, unknown> = {}) {
  return {
    nombre: "Adoptante Vitest",
    cedula: randomCedula(),
    telefono: "0991234567",
    correo: "adoptante.vitest@correo.com",
    direccion: "Calle de prueba 123",
    localidadId,
    tipoVivienda: "Casa propia",
    personasHogar: "3",
    acuerdoHogar: "si",
    permanenciaAnimal: "En el patio trasero techado, con acceso a la sala durante las noches.",
    lugarDormir: "En una cama propia dentro de la sala, cerca del resto de la familia.",
    tieneMascotas: "no",
    responsableCuidado: "Adoptante Vitest",
    responsableGastos: "Adoptante Vitest",
    seguimiento: "si",
    contrato: "si",
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
    const adoptantePassword = "Clave123!";
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
      .send({ petId: mascotaId, form: formularioValido(await primeraParroquiaId()) });
    expect(solicitud.status).toBe(201);
    const solicitudId = solicitud.body.solicitud.id;

    const propia = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${adoptanteToken}`);
    expect(propia.status).toBe(200);

    const vistaFundacion = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${fundacionToken}`);
    expect(vistaFundacion.status).toBe(200);

    const adminToken = await loginAs("admin@huellitas.com", "Huellitas123");
    const vistaAdmin = await request(app)
      .get(`/solicitudes/${solicitudId}`)
      .set("Authorization", `Bearer ${adminToken}`);
    expect(vistaAdmin.status).toBe(200);

    const otroCorreo = randomEmail("ajeno");
    const otroPassword = "Clave123!";
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

    await request(app)
      .delete(`/mascotas/${mascotaId}`)
      .set("Authorization", `Bearer ${fundacionToken}`);
  });

  it("rechaza un formulario de adopción incompleto (422)", async () => {
    const visibles = await request(app).get("/mascotas/publicas?limit=1");
    const mascotaId = visibles.body.data[0]?.id;

    const adoptanteCorreo = randomEmail("incompleto");
    const adoptantePassword = "Clave123!";
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
