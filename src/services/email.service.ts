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

export async function sendEmailVerificationEmail(correo: string, nombre: string, verificationUrl: string) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Verifica tu cuenta en Huellitas Solidarias",
    text: `Hola ${nombre}. Verifica tu cuenta aquí: ${verificationUrl}. El enlace vence en 15 minutos.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>Confirma que este correo te pertenece para activar tu cuenta.</p><p style="margin:28px 0"><a href="${verificationUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Verificar mi correo</a></p><p style="font-size:13px;color:#666">Este enlace vence en 15 minutos. Si no creaste esta cuenta, ignora el mensaje.</p></div>`,
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

export async function sendSolicitudRechazadaEmail(
  correo: string,
  nombre: string,
  mascotaNombre: string,
  motivo: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: `Tu solicitud de adopción para ${mascotaNombre} fue rechazada`,
    text: `Hola ${nombre}. Tu solicitud para adoptar a ${mascotaNombre} fue rechazada.\n\nMotivo: ${motivo}\n\nPuedes postular por otra mascota disponible.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>Tu solicitud para adoptar a <strong>${escapeHtml(mascotaNombre)}</strong> fue rechazada.</p><p style="margin:20px 0"><strong>Motivo:</strong><br/>${escapeHtml(motivo)}</p><p style="font-size:13px;color:#666">Puedes postular por otra mascota disponible cuando quieras.</p></div>`,
  });
}

export async function sendSolicitudAprobadaEmail(
  correo: string,
  nombre: string,
  mascotaNombre: string,
  fundacionNombre: string,
  panelUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: `Tu solicitud de adopción para ${mascotaNombre} fue aprobada`,
    text: `Hola ${nombre}. Tu solicitud de adopción para ${mascotaNombre} fue aprobada por ${fundacionNombre}. Revisa tu panel en ${panelUrl} para ver los próximos pasos.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>Tu solicitud de adopción para <strong>${escapeHtml(mascotaNombre)}</strong> fue aprobada por <strong>${escapeHtml(fundacionNombre)}</strong>.</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Revisar mi panel</a></p></div>`,
  });
}

export async function sendEntregaReagendadaEmail(
  correo: string,
  nombre: string,
  mascotaNombre: string,
  fecha: string,
  hora: string,
  lugar: string,
  panelUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: `Nueva fecha de entrega para ${mascotaNombre}`,
    text: `Hola ${nombre}. La fecha de entrega de ${mascotaNombre} fue reagendada para el ${fecha} a las ${hora}, en ${lugar}. Revisa tu panel en ${panelUrl}.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombre)},</p><p>La fecha de entrega de <strong>${escapeHtml(mascotaNombre)}</strong> fue reagendada:</p><p style="margin:12px 0;padding:12px 16px;background:#faf5f7;border-radius:8px"><strong>${escapeHtml(fecha)}</strong> a las <strong>${escapeHtml(hora)}</strong><br/>${escapeHtml(lugar)}</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver mi solicitud</a></p></div>`,
  });
}

export async function sendNuevoMensajeNotificationEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  panelUrl: string,
  deNombre: string,
  asunto: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoOrganizacion,
    subject: `Nuevo mensaje de ${deNombre}: ${asunto}`,
    text: `Hola ${nombreOrganizacion}. ${deNombre} te escribió: "${asunto}". Ingresa a ${panelUrl} para revisarlo.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreOrganizacion)},</p><p><strong>${escapeHtml(deNombre)}</strong> te escribió:</p><p style="margin:12px 0;padding:12px 16px;background:#faf5f7;border-radius:8px;font-weight:700">${escapeHtml(asunto)}</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver mensaje</a></p></div>`,
  });
}

export async function sendSeguimientoActualizadoEmail(
  correoFundacion: string,
  nombreFundacion: string,
  mascotaNombre: string,
  adoptanteNombre: string,
  panelUrl: string
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoFundacion,
    subject: `Seguimiento actualizado: ${mascotaNombre}`,
    text: `Hola ${nombreFundacion}. Se acaba de actualizar el seguimiento de ${mascotaNombre} (adoptante: ${adoptanteNombre}). Ingresa a ${panelUrl} para revisarlo.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreFundacion)},</p><p>Se acaba de actualizar el seguimiento de <strong>${escapeHtml(mascotaNombre)}</strong>, enviado por <strong>${escapeHtml(adoptanteNombre)}</strong>.</p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver seguimiento</a></p></div>`,
  });
}

export async function sendNuevoReporteRescateEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  panelUrl: string,
  reporte: { tipoAnimal: string; urgencia: string; ubicacion: string; descripcion: string }
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correoOrganizacion,
    subject: `Nuevo reporte de rescate (${reporte.urgencia}): ${reporte.tipoAnimal} en ${reporte.ubicacion}`,
    text: `Hola ${nombreOrganizacion}. Un ciudadano reportó un rescate.\n\nAnimal: ${reporte.tipoAnimal}\nUrgencia: ${reporte.urgencia}\nLugar: ${reporte.ubicacion}\n\n${reporte.descripcion}\n\nIngresa a ${panelUrl} para ver los detalles y evidencias.`,
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:24px;color:#292329"><h2 style="color:#800040">Huellitas Solidarias</h2><p>Hola ${escapeHtml(nombreOrganizacion)},</p><p>Un ciudadano reportó un animal en situación de rescate:</p><p style="margin:12px 0;padding:12px 16px;background:#faf5f7;border-radius:8px"><strong>${escapeHtml(reporte.tipoAnimal)}</strong> — urgencia <strong>${escapeHtml(reporte.urgencia)}</strong><br/>${escapeHtml(reporte.ubicacion)}<br/><span style="color:#666">${escapeHtml(reporte.descripcion)}</span></p><p style="margin:28px 0"><a href="${panelUrl}" style="background:#800040;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold">Ver reporte</a></p></div>`,
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
