import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { pool } from "../config/database.js";

const router = Router();

router.post("/login", async (req, res) => {
  const { email, password } = req.body as {
    email?: string;
    password?: string;
  };

  if (!email || !password) {
    res.status(400).json({
      error: "Email y contraseña son requeridos.",
    });
    return;
  }

  const [rows] = (await pool.query(
    `
    SELECT
      cu.id_cuenta AS id,
      cu.usuario AS email,
      cu.password_hash AS password,
      r.nombre_rol AS rol,
      COALESCE(CONCAT(p.nombres, ' ', p.apellidos), o.nombre) AS nombre
    FROM cuenta_usuario cu
    JOIN cuenta_rol cr ON cr.fk_cuenta_id = cu.id_cuenta
    JOIN rol r ON r.id_rol = cr.fk_rol_id
    LEFT JOIN persona p ON p.id_persona = cu.fk_persona_id
    LEFT JOIN organizacion o ON o.id_organizacion = cu.fk_organizacion_id
    WHERE cu.usuario = ?
      AND cu.estado = 'ACTIVA'
    LIMIT 1
    `,
    [email]
  )) as [any[], any];

  const usuario = rows[0];

  if (!usuario) {
    res.status(401).json({
      error: "Credenciales inválidas.",
    });
    return;
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);

  if (!passwordValida) {
    res.status(401).json({
      error: "Credenciales inválidas.",
    });
    return;
  }

  const rolNormalizado = String(usuario.rol).toLowerCase();

  const token = jwt.sign(
    {
      sub: usuario.id,
      email: usuario.email,
      rol: rolNormalizado,
    },
    process.env.JWT_SECRET as string,
    {
      expiresIn: "1h",
    }
  );

  res.status(200).json({
    token,
    usuario: {
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      rol: rolNormalizado,
    },
  });
});

export default router;