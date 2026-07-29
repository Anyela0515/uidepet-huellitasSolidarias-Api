import nodemailer from "nodemailer";

function createTransporter() {
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_APP_PASSWORD;
  if (!user || !pass) {
    throw new Error("EMAIL_USER y EMAIL_APP_PASSWORD no están configurados.");
  }

  return {
    user,
    transporter: nodemailer.createTransport({
      service: "gmail",
      auth: { user, pass },
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 15_000,
    }),
  };
}

export async function sendPasswordResetEmail(correo: string, nombre: string, resetUrl: string) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Recupera tu contraseña de Huellitas Solidarias",
    text: `Hola ${nombre}. Restablece tu contraseña aquí: ${resetUrl}. El enlace vence en 15 minutos.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p><p style="margin:28px 0"><a href="${resetUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Crear nueva contraseña</a></p><p style="font-size:13px;color:#666">Este enlace vence en 15 minutos y solo puede utilizarse una vez. Si no solicitaste el cambio, ignora este mensaje.</p></div>`,
  });
}

export async function sendFundacionCredentialsEmail(
  correo: string,
  nombre: string,
  temporaryPassword: string,
  loginUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Tu fundación fue aprobada en Huellitas Solidarias",
    text: `Hola ${nombre}. Tu fundación fue aprobada. Ingresa en ${loginUrl} con el correo ${correo} y la contraseña temporal ${temporaryPassword}. Deberás cambiarla al iniciar sesión.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>Tu fundación fue aprobada. Ya puedes ingresar al panel con estas credenciales:</p><p style="margin:20px 0"><strong>Correo:</strong> ${escapeHtml(correo)}<br/><strong>Contraseña temporal:</strong> ${escapeHtml(temporaryPassword)}</p><p style="margin:28px 0"><a href="${loginUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ingresar</a></p><p style="font-size:13px;color:#666">Por seguridad, deberás elegir una contraseña nueva la primera vez que inicies sesión.</p></div>`,
  });
}

export async function sendComprobanteDonacionEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  donanteNombre: string,
  donanteCorreo: string,
  cantidadDescripcion: string,
  comprobantePago: string
) {
  const { user, transporter } = createTransporter();

  const match = comprobantePago.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] || "application/octet-stream";
  const base64Data = match?.[2] || "";
  const extension = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "jpg";

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoOrganizacion,
    subject: `Comprobante de aporte económico de ${donanteNombre}`,
    text: `Hola ${nombreOrganizacion}. ${donanteNombre} (${donanteCorreo}) realizó un aporte económico y adjuntó su comprobante de pago.\n\nDescripción: ${cantidadDescripcion}\n\nRevisa el archivo adjunto a este correo.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreOrganizacion)},</p><p><strong>${escapeHtml(donanteNombre)}</strong> (${escapeHtml(donanteCorreo)}) realizó un aporte económico para tu organización y adjuntó su comprobante de pago.</p><p style="margin:20px 0"><strong>Descripción:</strong> ${escapeHtml(cantidadDescripcion)}</p><p style="font-size:13px;color:#666">El comprobante va adjunto a este correo.</p></div>`,
    attachments: [
      {
        filename: `comprobante-pago.${extension}`,
        content: base64Data,
        encoding: "base64",
      },
    ],
  });
}

export async function sendNuevoMensajeNotificationEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  panelUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoOrganizacion,
    subject: "Tienes un nuevo mensaje pendiente en tu panel",
    text: `Hola ${nombreOrganizacion}. Te llegó un nuevo mensaje en tu panel de Huellitas Solidarias. Ingresa a ${panelUrl} para revisarlo.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreOrganizacion)},</p><p>Tienes un nuevo mensaje pendiente en tu panel.</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver mensaje</a></p></div>`,
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}
