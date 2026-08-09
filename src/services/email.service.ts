import nodemailer from "nodemailer";
import path from "node:path";

function henryEmailAsset(filename: string): string {
  const baseDirectory = process.env.NODE_ENV === "production" ? "assets" : "src/assets";
  return path.join(process.cwd(), baseDirectory, "email", filename);
}

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

// =============================================================================
// Marca visual compartida de los correos: patitas, silueta de perro y de
// gato, en SVG inline (sin archivos externos que alojar). Se degradan con
// gracia en clientes que no soportan SVG en el cuerpo del correo (queda el
// texto sin la ilustración, nunca un ícono roto).
// =============================================================================

function pawIcon(color: string, opacity: number, size = 18) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 40 40" style="display:inline-block;vertical-align:middle" role="img" aria-hidden="true"><ellipse cx="20" cy="26" rx="9" ry="7" fill="${color}" fill-opacity="${opacity}"/><circle cx="9" cy="15" r="3.2" fill="${color}" fill-opacity="${opacity}"/><circle cx="16" cy="8" r="3.2" fill="${color}" fill-opacity="${opacity}"/><circle cx="24" cy="8" r="3.2" fill="${color}" fill-opacity="${opacity}"/><circle cx="31" cy="15" r="3.2" fill="${color}" fill-opacity="${opacity}"/></svg>`;
}

/**
 * Envuelve el contenido propio de cada correo en una cabecera institucional
 * limpia y un pie compartido. Henry aparece dentro del mensaje cuando aporta
 * contexto emocional, sin repetirse como imagen circular en la cabecera.
 */
function renderEmailShell(bodyHtml: string): string {
  const pawRowHeader = [0, 1, 2].map(() => pawIcon("#ffffff", 0.5, 16)).join("");
  const pawRowFooter = [0, 1, 2, 3].map(() => pawIcon("#800040", 0.28, 14)).join("");

  return `<div style="background:#f4eef1;padding:28px 12px;font-family:Arial,Helvetica,sans-serif">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #f0dbe3">
      <tr>
        <td style="background:#ffffff;padding:20px 20px 6px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#800040;border-radius:14px">
            <tr>
              <td style="padding:20px;text-align:center">
                <div style="margin-bottom:8px">${pawRowHeader}</div>
                <div style="color:#ffffff;font-size:19px;font-weight:bold;letter-spacing:0.3px">Huellitas Solidarias</div>
              </td>
            </tr>
          </table>
        </td>
      </tr>
      <tr>
        <td style="padding:24px 28px 6px;color:#292329;font-size:15px;line-height:1.6">
          ${bodyHtml}
        </td>
      </tr>
      <tr>
        <td style="padding:20px 28px 26px;text-align:center;color:#9c8a92;font-size:12px;line-height:1.6">
          <div style="margin-bottom:10px">${pawRowFooter}</div>
          Huellitas Solidarias — adopción responsable<br/>Universidad Internacional del Ecuador
        </td>
      </tr>
    </table>
  </div>`;
}

function button(url: string, label: string) {
  return `<p style="margin:26px 0;text-align:left"><a href="${url}" style="background:#800040;color:#ffffff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">${escapeHtml(label)}</a></p>`;
}

function infoBox(innerHtml: string) {
  return `<div style="margin:16px 0;padding:14px 18px;background:#faf5f7;border-radius:10px;border:1px solid #f3e3ea">${innerHtml}</div>`;
}

export async function sendPasswordResetEmail(correo: string, nombre: string, resetUrl: string) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Recupera tu contraseña de Huellitas Solidarias",
    text: `Hola ${nombre}. Restablece tu contraseña aquí: ${resetUrl}. El enlace vence en 15 minutos.`,
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombre)},</p><p>Recibimos una solicitud para restablecer tu contraseña.</p>${button(resetUrl, "Crear nueva contraseña")}<p style="font-size:13px;color:#666">Este enlace vence en 15 minutos y solo puede utilizarse una vez. Si no solicitaste el cambio, ignora este mensaje.</p>`
    ),
  });
}

export async function sendEmailVerificationEmail(correo: string, nombre: string, verificationUrl: string) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Verifica tu cuenta en Huellitas Solidarias",
    text: `Hola ${nombre}. Verifica tu cuenta aquí: ${verificationUrl}. El enlace vence en 15 minutos.`,
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombre)},</p><p>Confirma que este correo te pertenece para activar tu cuenta.</p>${button(verificationUrl, "Verificar mi correo")}<p style="font-size:13px;color:#666">Este enlace vence en 15 minutos. Si no creaste esta cuenta, ignora el mensaje.</p>`
    ),
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombre)},</p><p>Tu fundación fue aprobada. Ya puedes ingresar al panel con estas credenciales:</p>${infoBox(`<strong>Correo:</strong> ${escapeHtml(correo)}<br/><strong>Contraseña temporal:</strong> ${escapeHtml(temporaryPassword)}`)}${button(loginUrl, "Ingresar")}<p style="font-size:13px;color:#666">Por seguridad, deberás elegir una contraseña nueva la primera vez que inicies sesión.</p>`
    ),
  });
}

export async function sendFundacionRechazadaEmail(correo: string, nombre: string) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: "Tu solicitud de registro de fundación no fue aprobada",
    text: `Hola ${nombre}. Revisamos tu solicitud de registro como fundación aliada en Huellitas Solidarias y, por ahora, no fue aprobada. Si crees que fue un error o quieres más información, puedes escribirnos respondiendo este correo.`,
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombre)},</p><p>Revisamos tu solicitud de registro como fundación aliada y, por ahora, no fue aprobada.</p><p style="font-size:13px;color:#666">Si crees que fue un error o quieres más información, puedes escribirnos respondiendo este correo.</p>`
    ),
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombreOrganizacion)},</p><p><strong>${escapeHtml(donanteNombre)}</strong> (${escapeHtml(donanteCorreo)}) realizó un aporte económico para tu organización y adjuntó su comprobante de pago.</p>${infoBox(`<strong>Descripción:</strong> ${escapeHtml(cantidadDescripcion)}`)}<p style="font-size:13px;color:#666">El comprobante va adjunto a este correo.</p>`
    ),
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
    html: renderEmailShell(
      `<div style="text-align:center;margin:-4px 0 10px"><img src="cid:henry-rechazada" alt="Henry, un poco triste, sosteniendo un sobre" width="130" style="display:block;margin:0 auto"/></div><p>Hola ${escapeHtml(nombre)},</p><p>Tu solicitud para adoptar a <strong>${escapeHtml(mascotaNombre)}</strong> fue rechazada.</p>${infoBox(`<strong>Motivo:</strong><br/>${escapeHtml(motivo)}`)}<p style="font-size:13px;color:#666">Puedes postular por otra mascota disponible cuando quieras.</p>`
    ),
    attachments: [
      {
        filename: "henry-rechazada.png",
        path: henryEmailAsset("henry-rechazada.png"),
        cid: "henry-rechazada",
      },
    ]
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
    html: renderEmailShell(
      `<div style="text-align:center;margin:-4px 0 10px"><img src="cid:henry-aprobada" alt="Henry feliz sosteniendo un sobre aprobado" width="150" style="display:block;margin:0 auto"/></div><p>Hola ${escapeHtml(nombre)},</p><p>🐾 ¡Tu solicitud de adopción para <strong>${escapeHtml(mascotaNombre)}</strong> fue aprobada por <strong>${escapeHtml(fundacionNombre)}</strong>!</p>${button(panelUrl, "Revisar mi panel")}`
    ),
    attachments: [
      {
        filename: "henry-aprobada.png",
        path: henryEmailAsset("henry-aprobada.png"),
        cid: "henry-aprobada",
      },
    ]
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombre)},</p><p>La fecha de entrega de <strong>${escapeHtml(mascotaNombre)}</strong> fue reagendada:</p>${infoBox(`<strong>${escapeHtml(fecha)}</strong> a las <strong>${escapeHtml(hora)}</strong><br/>${escapeHtml(lugar)}`)}${button(panelUrl, "Ver mi solicitud")}`
    ),
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombreOrganizacion)},</p><p><strong>${escapeHtml(deNombre)}</strong> te escribió:</p>${infoBox(`<span style="font-weight:700">${escapeHtml(asunto)}</span>`)}${button(panelUrl, "Ver mensaje")}`
    ),
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombreFundacion)},</p><p>Se acaba de actualizar el seguimiento de <strong>${escapeHtml(mascotaNombre)}</strong>, enviado por <strong>${escapeHtml(adoptanteNombre)}</strong>.</p>${button(panelUrl, "Ver seguimiento")}`
    ),
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
    html: renderEmailShell(
      `<p>Hola ${escapeHtml(nombreOrganizacion)},</p><p>Un ciudadano reportó un animal en situación de rescate:</p>${infoBox(`<strong>${escapeHtml(reporte.tipoAnimal)}</strong> — urgencia <strong>${escapeHtml(reporte.urgencia)}</strong><br/>${escapeHtml(reporte.ubicacion)}<br/><span style="color:#666">${escapeHtml(reporte.descripcion)}</span>`)}${button(panelUrl, "Ver reporte")}`
    ),
  });
}

const ESTADO_DENUNCIA_LABEL: Record<string, string> = {
  recibida: "Recibido",
  revision: "En revisión",
  atendida: "Atendido",
  cerrada: "Cerrado",
};

export async function sendReporteConfirmacionEmail(
  correo: string,
  codigo: string,
  seguimientoUrl: string,
  reporte: { tipoAnimal: string; ubicacion: string }
) {
  const { user, transporter } = createTransporter();

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: `Recibimos tu reporte de rescate — código ${codigo}`,
    text: `Gracias por reportar a un ${reporte.tipoAnimal} en ${reporte.ubicacion}.\n\nTu código de seguimiento es: ${codigo}\n\nPuedes consultar el estado de tu reporte cuando quieras en: ${seguimientoUrl}\n\nTe avisaremos por este correo cuando haya una actualización.`,
    html: renderEmailShell(
      `<p>Gracias por reportar a un <strong>${escapeHtml(reporte.tipoAnimal)}</strong> en <strong>${escapeHtml(reporte.ubicacion)}</strong>.</p>${infoBox(`<div style="text-align:center"><span style="font-size:13px;color:#666">Tu código de seguimiento</span><br/><strong style="font-size:20px;letter-spacing:1px;color:#800040">${escapeHtml(codigo)}</strong></div>`)}${button(seguimientoUrl, "Consultar estado")}<p style="font-size:13px;color:#666">También te avisaremos por este correo cuando haya una actualización.</p>`
    ),
  });
}

export async function sendReporteEstadoActualizadoEmail(
  correo: string,
  codigo: string,
  estado: string,
  seguimientoUrl: string,
  reporte: { tipoAnimal: string; ubicacion: string }
) {
  const { user, transporter } = createTransporter();
  const estadoLabel = ESTADO_DENUNCIA_LABEL[estado] || estado;

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: correo,
    subject: `Actualización de tu reporte ${codigo}: ${estadoLabel}`,
    text: `Tu reporte del ${reporte.tipoAnimal} en ${reporte.ubicacion} (código ${codigo}) ahora está: ${estadoLabel}.\n\nConsulta los detalles en: ${seguimientoUrl}`,
    html: renderEmailShell(
      `<p>Tu reporte del <strong>${escapeHtml(reporte.tipoAnimal)}</strong> en <strong>${escapeHtml(reporte.ubicacion)}</strong> (código <strong>${escapeHtml(codigo)}</strong>) ahora está:</p>${infoBox(`<div style="text-align:center"><strong style="font-size:18px;color:#800040">${escapeHtml(estadoLabel)}</strong></div>`)}${button(seguimientoUrl, "Ver detalles")}`
    ),
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
