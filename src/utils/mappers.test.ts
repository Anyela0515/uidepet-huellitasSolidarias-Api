import { describe, it, expect } from "vitest";
import { mapMascota, mapUsuario } from "./mappers.js";

describe("mapMascota", () => {
  it("mapea una fila SQL snake_case al contrato camelCase del frontend", () => {
    const row = {
      id: 1,
      nombre: "Rocky",
      edad_valor: 3,
      unidad_edad: "Años",
      historia: "h",
      requisitos: "r",
      publicada_en: new Date("2026-01-01"),
      oculto: 0,
      especie: "Perro",
      raza: "Mestizo",
      sexo: "Macho",
      tamano: "Grande",
      ubicacion: "Loja",
      estado_codigo: "Disponible",
      fundacion: "Fundación X",
      fundacion_email: "f@x.com",
      imagen: "img",
      tags: "Vacunado,Esterilizado",
    };

    const mascota = mapMascota(row);

    expect(mascota.id).toBe(1);
    expect(mascota.edad).toBe("3 Años");
    expect(mascota.edadGrupo).toBe("Adulto");
    expect(mascota.tags).toEqual(["Vacunado", "Esterilizado"]);
    expect(mascota.hidden).toBe(false);
    expect(mascota.estado).toBe("Disponible");
  });
});

describe("mapUsuario", () => {
  it("nunca expone el hash de contraseña", () => {
    const row = {
      id: 1,
      nombre: "A",
      correo: "a@x.com",
      cedula: "1",
      telefono: "1",
      direccion: "d",
      rol_codigo: "usuario",
      estado_codigo: "Activo",
      creado_en: new Date(),
      password: "hash-secreto-no-debe-salir",
    };

    const usuario = mapUsuario(row) as unknown as Record<string, unknown>;

    expect(usuario).not.toHaveProperty("password");
    expect(usuario).not.toHaveProperty("password_hash");
    expect(JSON.stringify(usuario)).not.toContain("hash-secreto-no-debe-salir");
  });
});
