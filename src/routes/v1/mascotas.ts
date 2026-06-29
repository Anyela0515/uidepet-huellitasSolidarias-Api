import { Router, type Request, type Response } from "express";

const router = Router();

// Datos de prueba para validar el endpoint en Postman.
// En una fase posterior serán reemplazados por consultas a MySQL.
const mascotasPrueba = [
  {
    id_mascota: 1,
    nombre: "Max",
    especie: "Perro",
    edad: "2 años",
    sexo: "Macho",
    tamanio: "Mediano",
    estado: "Disponible",
    ubicacion: "Campus UIDE Quito",
  },
  {
    id_mascota: 2,
    nombre: "Luna",
    especie: "Perro",
    edad: "8 meses",
    sexo: "Hembra",
    tamanio: "Pequeño",
    estado: "Disponible",
    ubicacion: "Clínica Veterinaria Norte",
  },
  {
    id_mascota: 3,
    nombre: "Sombra",
    especie: "Gato",
    edad: "3 años",
    sexo: "Macho",
    tamanio: "Mediano",
    estado: "Disponible",
    ubicacion: "Refugio Patitas Valientes",
  },
];

router.get("/", (_req: Request, res: Response) => {
  return res.status(200).json({
    code: 200,
    version: "v1",
    data: mascotasPrueba,
  });
});

export default router;