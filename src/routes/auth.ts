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
      id,
      nombre,
      email,
      password,
      rol
    FROM usuarios
    WHERE email = ?
    LIMIT 1
    `,
    [email]
  )) as [any[], any];

  const usuario = rows[0];
  console.log("Usuario encontrado:", usuario);
  console.log("Password enviada:", password);
  console.log("Hash BD:", usuario?.password);

  if (!usuario) {
    res.status(401).json({
      error: "Credenciales inválidas.",
    });
    return;
  }

  const passwordValida = await bcrypt.compare(password, usuario.password);
  console.log("Password válida:", passwordValida);

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
      expiresIn: process.env.JWT_EXPIRES_IN || "1h",
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