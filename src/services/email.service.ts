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

export async function sendMensajeOrganizacionEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  remitenteNombre: string,
  remitenteCorreo: string,
  asunto: string,
  mensaje: string,
  panelUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoOrganizacion,
    subject: `Nuevo mensaje para ${nombreOrganizacion}: ${asunto}`,
    text: `Hola ${nombreOrganizacion}. ${remitenteNombre} (${remitenteCorreo}) te envió un mensaje a través de Huellitas Solidarias.\n\nAsunto: ${asunto}\n\n${mensaje}\n\nIngresa a ${panelUrl} para responder.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreOrganizacion)},</p><p><strong>${escapeHtml(remitenteNombre)}</strong> (${escapeHtml(remitenteCorreo)}) te envió un mensaje a través de la plataforma.</p><p style="margin:20px 0"><strong>Asunto:</strong> ${escapeHtml(asunto)}<br/><strong>Mensaje:</strong><br/>${escapeHtml(mensaje).replace(/\n/g, "<br/>")}</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver e ingresar al panel</a></p></div>`,
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
