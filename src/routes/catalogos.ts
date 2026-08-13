import { Router } from "express";
import * as controller from "../controllers/catalogo.controller.js";

const router = Router();

router.get("/roles", controller.roles);
router.get("/estados-cuenta", controller.estadosCuenta);
router.get("/especies", controller.especies);
router.get("/razas", controller.razas);
router.get("/sexos", controller.sexos);
router.get("/tamanos", controller.tamanos);
router.get("/unidades-edad", controller.unidadesEdad);
router.get("/estados-mascota", controller.estadosMascota);

router.get("/provincias", controller.provincias);
router.get("/cantones", controller.cantones);
router.get("/parroquias", controller.parroquias);
router.get("/tags", controller.tags);
router.get("/estados-solicitud-adopcion", controller.estadosSolicitudAdopcion);
router.get(
  "/estados-solicitud-organizacion",
  controller.estadosSolicitudOrganizacion
);
router.get("/tipos-vivienda", controller.tiposVivienda);
router.get("/tipos-donacion", controller.tiposDonacion);
router.get("/estados-donacion", controller.estadosDonacion);
router.get("/tipos-medio", controller.tiposMedio);

export default router;
