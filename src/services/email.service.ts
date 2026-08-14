import nodemailer from "nodemailer";
import type { Attachment } from "nodemailer/lib/mailer/index.js";
import path from "node:path";
import {
  escapeHtml,
  renderHuellitasEmail,
  type EmailBadgeVariant,
  type EmailInfoRow,
  type HuellitasEmailContent,
} from "./emailTemplate.js";

type HenryVariant = "aprobada" | "rechazada";

function emailAsset(filename: string): string {
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

function defaultFrontendUrl() {
  return (process.env.FRONTEND_URL || "http://localhost:5173").replace(/\/$/, "");
}

function baseAttachments(henryVariant: HenryVariant = "aprobada"): Attachment[] {
  return [
    {
      filename: "logo-huellitas.png",
      path: emailAsset("logo-huellitas.png"),
      cid: "email-logo",
    },
    {
      filename: `henry-${henryVariant}.png`,
      path: emailAsset(`henry-${henryVariant}.png`),
      cid: "henry-mascot",
    },
  ];
}

async function deliverMail(options: {
  to: string;
  subject: string;
  text: string;
  content: HuellitasEmailContent;
  henryVariant?: HenryVariant;
  extraAttachments?: Attachment[];
}) {
  const { user, transporter } = createTransporter();
  const html = renderHuellitasEmail({
    webViewUrl: options.content.webViewUrl || defaultFrontendUrl(),
    ...options.content,
  });

  await transporter.sendMail({
    from: `"Huellitas Solidarias" <${user}>`,
    to: options.to,
    subject: options.subject,
    text: options.text,
    html,
    attachments: [...baseAttachments(options.henryVariant), ...(options.extraAttachments ?? [])],
  });
}

function estadoRow(label: string, variant: EmailBadgeVariant = "success"): EmailInfoRow {
  const colors: Record<EmailBadgeVariant, string> = {
    success: "#2e7d32",
    danger: "#c62828",
    warning: "#e65100",
    info: "#1565c0",
    neutral: "#616161",
  };
  return {
    icon: "🏁",
    label: "Estado",
    value: label,
    valueHtml: `<span style="color:${colors[variant]};font-weight:700">✓ ${escapeHtml(label)}</span>`,
  };
}

export async function sendPasswordResetEmail(correo: string, nombre: string, resetUrl: string) {
  await deliverMail({
    to: correo,
    subject: "Recupera tu contraseña de Huellitas Solidarias",
    text: `Hola ${nombre}. Restablece tu contraseña aquí: ${resetUrl}. El enlace vence en 15 minutos.`,
    content: {
      preheader: "Restablece tu contraseña de Huellitas Solidarias",
      webViewUrl: resetUrl,
      badge: { text: "Recuperación de acceso", variant: "info" },
      title: "Restablece tu contraseña 🔐",
      nombre,
      introHtml: `<p style="margin:0 0 12px">Recibimos una solicitud para restablecer la contraseña de tu cuenta en Huellitas Solidarias.</p><p style="margin:0;font-size:13px;color:#666">Este enlace vence en <strong>15 minutos</strong> y solo puede utilizarse una vez. Si no solicitaste el cambio, ignora este mensaje.</p>`,
      infoCardTitle: "Información de la solicitud",
      infoRows: [
        { icon: "👤", label: "Cuenta", value: correo },
        { icon: "⏱", label: "Validez", value: "15 minutos" },
        estadoRow("Enlace de recuperación", "info"),
      ],
      noteHtml: "Por seguridad, nadie del equipo te pedirá esta contraseña por correo o teléfono.",
      cta: { url: resetUrl, label: "Crear nueva contraseña" },
    },
  });
}

export async function sendEmailVerificationEmail(correo: string, nombre: string, verificationUrl: string) {
  await deliverMail({
    to: correo,
    subject: "Verifica tu cuenta en Huellitas Solidarias",
    text: `Hola ${nombre}. Verifica tu cuenta aquí: ${verificationUrl}. El enlace vence en 15 minutos.`,
    content: {
      preheader: "Confirma tu correo para activar tu cuenta",
      webViewUrl: verificationUrl,
      badge: { text: "Verificación de cuenta", variant: "info" },
      title: "Verifica tu correo electrónico ✉️",
      nombre,
      introHtml: `<p style="margin:0 0 12px">Confirma que este correo te pertenece para activar tu cuenta en Huellitas Solidarias.</p><p style="margin:0;font-size:13px;color:#666">El enlace vence en <strong>15 minutos</strong>. Si no creaste esta cuenta, ignora el mensaje.</p>`,
      infoCardTitle: "Información de la solicitud",
      infoRows: [
        { icon: "📧", label: "Correo", value: correo },
        { icon: "⏱", label: "Validez", value: "15 minutos" },
        estadoRow("Pendiente de verificación", "info"),
      ],
      cta: { url: verificationUrl, label: "Verificar mi correo" },
    },
  });
}

export async function sendFundacionCredentialsEmail(
  correo: string,
  nombre: string,
  temporaryPassword: string,
  loginUrl: string
) {
  await deliverMail({
    to: correo,
    subject: "Tu fundación fue aprobada en Huellitas Solidarias",
    text: `Hola ${nombre}. Tu fundación fue aprobada. Ingresa en ${loginUrl} con el correo ${correo} y la contraseña temporal ${temporaryPassword}. Deberás cambiarla al iniciar sesión.`,
    content: {
      preheader: "Tu fundación fue aprobada en Huellitas Solidarias",
      webViewUrl: loginUrl,
      badge: { text: "Fundación aprobada", variant: "success" },
      title: "¡Tu fundación fue aprobada! 🎉",
      nombre,
      introHtml: `<p style="margin:0">Tu organización ya forma parte de la red de aliados de Huellitas Solidarias. Usa las credenciales temporales para ingresar al panel.</p>`,
      infoCardTitle: "Información de acceso",
      infoRows: [
        { icon: "🏢", label: "Organización", value: nombre },
        { icon: "📧", label: "Correo", value: correo },
        { icon: "🔑", label: "Contraseña temporal", value: temporaryPassword },
        estadoRow("Fundación aprobada", "success"),
      ],
      noteHtml: "Por seguridad, deberás elegir una contraseña nueva la primera vez que inicies sesión.",
      cta: { url: loginUrl, label: "Ingresar al panel" },
    },
  });
}

export async function sendFundacionRechazadaEmail(correo: string, nombre: string) {
  await deliverMail({
    to: correo,
    subject: "Tu solicitud de registro de fundación no fue aprobada",
    text: `Hola ${nombre}. Revisamos tu solicitud de registro como fundación aliada en Huellitas Solidarias y, por ahora, no fue aprobada. Si crees que fue un error o quieres más información, puedes escribirnos respondiendo este correo.`,
    henryVariant: "rechazada",
    content: {
      preheader: "Actualización sobre tu solicitud de fundación",
      badge: { text: "Solicitud no aprobada", variant: "danger" },
      title: "Tu solicitud no fue aprobada",
      nombre,
      introHtml: `<p style="margin:0">Revisamos tu solicitud de registro como fundación aliada y, por ahora, <strong>no fue aprobada</strong>.</p>`,
      infoCardTitle: "Información de la solicitud",
      infoRows: [
        { icon: "🏢", label: "Organización", value: nombre },
        { icon: "📧", label: "Correo", value: correo },
        estadoRow("No aprobada", "danger"),
      ],
      noteHtml: "Si crees que fue un error o quieres más información, puedes escribirnos respondiendo este correo.",
      closingHtml: `<p style="margin:0;font-size:14px;line-height:1.65;color:#555;text-align:center">Gracias por tu interés en colaborar con Huellitas Solidarias. 🐾</p>`,
    },
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
  const match = comprobantePago.match(/^data:([^;]+);base64,(.+)$/);
  const mime = match?.[1] || "application/octet-stream";
  const base64Data = match?.[2] || "";
  const extension = mime === "application/pdf" ? "pdf" : mime.split("/")[1] || "jpg";

  await deliverMail({
    to: correoOrganizacion,
    subject: `Comprobante de aporte económico de ${donanteNombre}`,
    text: `Hola ${nombreOrganizacion}. ${donanteNombre} (${donanteCorreo}) realizó un aporte económico y adjuntó su comprobante de pago.\n\nDescripción: ${cantidadDescripcion}\n\nRevisa el archivo adjunto a este correo.`,
    content: {
      preheader: `Nuevo comprobante de donación de ${donanteNombre}`,
      badge: { text: "Nueva donación", variant: "info" },
      title: "Comprobante de aporte recibido 💝",
      nombre: nombreOrganizacion,
      introHtml: `<p style="margin:0"><strong>${escapeHtml(donanteNombre)}</strong> (${escapeHtml(donanteCorreo)}) realizó un aporte económico para tu organización y adjuntó su comprobante de pago.</p>`,
      infoCardTitle: "Información de la donación",
      infoRows: [
        { icon: "👤", label: "Donante", value: donanteNombre },
        { icon: "📧", label: "Correo", value: donanteCorreo },
        { icon: "📦", label: "Descripción", value: cantidadDescripcion },
        estadoRow("Comprobante adjunto", "info"),
      ],
      noteHtml: "El comprobante de pago va adjunto a este correo para tu revisión.",
    },
    extraAttachments: [
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
  motivo: string,
  solicitudId?: string
) {
  await deliverMail({
    to: correo,
    subject: `Tu solicitud de adopción para ${mascotaNombre} fue rechazada`,
    text: `Hola ${nombre}. Tu solicitud para adoptar a ${mascotaNombre} fue rechazada.\n\nMotivo: ${motivo}\n\nPuedes postular por otra mascota disponible.`,
    henryVariant: "rechazada",
    content: {
      preheader: `Tu solicitud de adopción para ${mascotaNombre} fue rechazada`,
      badge: { text: "Solicitud rechazada", variant: "danger" },
      title: "Tu solicitud fue rechazada",
      nombre,
      introHtml: `<p style="margin:0">Lamentamos informarte que tu solicitud para adoptar a <strong>${escapeHtml(mascotaNombre)}</strong> <strong>no fue aprobada</strong> en esta ocasión.</p>`,
      infoCardTitle: "Información de la solicitud",
      infoRows: [
        { icon: "🐾", label: "Mascota", value: mascotaNombre },
        ...(solicitudId ? [{ icon: "📋", label: "Solicitud", value: `#${solicitudId}` }] : []),
        { icon: "💬", label: "Motivo", value: motivo },
        estadoRow("Solicitud rechazada", "danger"),
      ],
      noteHtml: "Puedes postular por otra mascota disponible cuando quieras. Cada organización evalúa las solicitudes con responsabilidad.",
      cta: { url: `${defaultFrontendUrl()}/mascotas`, label: "Explorar mascotas" },
    },
  });
}

export async function sendSolicitudAprobadaEmail(
  correo: string,
  nombre: string,
  mascotaNombre: string,
  fundacionNombre: string,
  panelUrl: string,
  solicitudId?: string
) {
  await deliverMail({
    to: correo,
    subject: `Tu solicitud de adopción para ${mascotaNombre} fue aprobada`,
    text: `Hola ${nombre}. Tu solicitud de adopción para ${mascotaNombre} fue aprobada por ${fundacionNombre}. Revisa tu panel en ${panelUrl} para ver los próximos pasos.`,
    content: {
      preheader: `¡Tu solicitud de adopción para ${mascotaNombre} fue aprobada!`,
      webViewUrl: panelUrl,
      badge: { text: "Solicitud aprobada", variant: "success" },
      title: "¡Tu solicitud fue aprobada! 💖",
      nombre,
      introHtml: `<p style="margin:0 0 12px">Nos complace informarte que tu solicitud de adopción para <strong>${escapeHtml(mascotaNombre)}</strong> ha sido <strong>aprobada</strong> por <strong>${escapeHtml(fundacionNombre)}</strong>.</p><p style="margin:0">Estamos muy felices de que des un paso más hacia darle un hogar lleno de amor.</p>`,
      infoCardTitle: "Información de la solicitud",
      infoRows: [
        { icon: "🐾", label: "Mascota", value: mascotaNombre },
        ...(solicitudId ? [{ icon: "📋", label: "Solicitud", value: `#${solicitudId}` }] : []),
        { icon: "🏢", label: "Organización", value: fundacionNombre },
        estadoRow("Solicitud aprobada", "success"),
      ],
      noteHtml: "El siguiente paso será coordinar con la organización responsable la entrega de la mascota y completar el proceso de adopción.",
      cta: { url: panelUrl, label: "Continuar con mi adopción" },
    },
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
  await deliverMail({
    to: correo,
    subject: `Nueva fecha de entrega para ${mascotaNombre}`,
    text: `Hola ${nombre}. La fecha de entrega de ${mascotaNombre} fue reagendada para el ${fecha} a las ${hora}, en ${lugar}. Revisa tu panel en ${panelUrl}.`,
    content: {
      preheader: `Nueva fecha de entrega para ${mascotaNombre}`,
      webViewUrl: panelUrl,
      badge: { text: "Entrega reagendada", variant: "warning" },
      title: "Nueva fecha de entrega 📅",
      nombre,
      introHtml: `<p style="margin:0">La fecha de entrega de <strong>${escapeHtml(mascotaNombre)}</strong> fue <strong>reagendada</strong>. Revisa los detalles a continuación.</p>`,
      infoCardTitle: "Información de la entrega",
      infoRows: [
        { icon: "🐾", label: "Mascota", value: mascotaNombre },
        { icon: "📅", label: "Fecha", value: fecha },
        { icon: "🕐", label: "Hora", value: hora },
        { icon: "📍", label: "Lugar", value: lugar },
        estadoRow("Entrega reagendada", "warning"),
      ],
      noteHtml: "Si tienes alguna inquietud sobre la nueva fecha, contacta a la organización responsable desde tu panel.",
      cta: { url: panelUrl, label: "Ver mi solicitud" },
    },
  });
}

export async function sendNuevoMensajeNotificationEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  panelUrl: string,
  deNombre: string,
  asunto: string
) {
  await deliverMail({
    to: correoOrganizacion,
    subject: `Nuevo mensaje de ${deNombre}: ${asunto}`,
    text: `Hola ${nombreOrganizacion}. ${deNombre} te escribió: "${asunto}". Ingresa a ${panelUrl} para revisarlo.`,
    content: {
      preheader: `Nuevo mensaje de ${deNombre}`,
      webViewUrl: panelUrl,
      badge: { text: "Nuevo mensaje", variant: "info" },
      title: "Tienes un nuevo mensaje 💌",
      nombre: nombreOrganizacion,
      introHtml: `<p style="margin:0"><strong>${escapeHtml(deNombre)}</strong> te escribió a través de Huellitas Solidarias.</p>`,
      infoCardTitle: "Información del mensaje",
      infoRows: [
        { icon: "👤", label: "De", value: deNombre },
        { icon: "📝", label: "Asunto", value: asunto },
        estadoRow("Mensaje recibido", "info"),
      ],
      noteHtml: "Ingresa al panel para leer el mensaje completo y responder si corresponde.",
      cta: { url: panelUrl, label: "Ver mensaje" },
    },
  });
}

export async function sendSeguimientoActualizadoEmail(
  correoFundacion: string,
  nombreFundacion: string,
  mascotaNombre: string,
  adoptanteNombre: string,
  panelUrl: string
) {
  await deliverMail({
    to: correoFundacion,
    subject: `Seguimiento actualizado: ${mascotaNombre}`,
    text: `Hola ${nombreFundacion}. Se acaba de actualizar el seguimiento de ${mascotaNombre} (adoptante: ${adoptanteNombre}). Ingresa a ${panelUrl} para revisarlo.`,
    content: {
      preheader: `Seguimiento actualizado de ${mascotaNombre}`,
      webViewUrl: panelUrl,
      badge: { text: "Seguimiento actualizado", variant: "info" },
      title: "Nuevo seguimiento post-adopción 📸",
      nombre: nombreFundacion,
      introHtml: `<p style="margin:0">Se acaba de actualizar el seguimiento de <strong>${escapeHtml(mascotaNombre)}</strong>, enviado por <strong>${escapeHtml(adoptanteNombre)}</strong>.</p>`,
      infoCardTitle: "Información del seguimiento",
      infoRows: [
        { icon: "🐾", label: "Mascota", value: mascotaNombre },
        { icon: "👤", label: "Adoptante", value: adoptanteNombre },
        estadoRow("Seguimiento recibido", "info"),
      ],
      noteHtml: "Revisa las evidencias y comentarios en el panel para confirmar el bienestar del animal.",
      cta: { url: panelUrl, label: "Ver seguimiento" },
    },
  });
}

export async function sendNuevoReporteRescateEmail(
  correoOrganizacion: string,
  nombreOrganizacion: string,
  panelUrl: string,
  reporte: { tipoAnimal: string; urgencia: string; ubicacion: string; descripcion: string }
) {
  const urgenciaVariant: EmailBadgeVariant =
    reporte.urgencia.toLowerCase().includes("alta") ? "danger" : "warning";

  await deliverMail({
    to: correoOrganizacion,
    subject: `Nuevo reporte de rescate (${reporte.urgencia}): ${reporte.tipoAnimal} en ${reporte.ubicacion}`,
    text: `Hola ${nombreOrganizacion}. Un ciudadano reportó un rescate.\n\nAnimal: ${reporte.tipoAnimal}\nUrgencia: ${reporte.urgencia}\nLugar: ${reporte.ubicacion}\n\n${reporte.descripcion}\n\nIngresa a ${panelUrl} para ver los detalles y evidencias.`,
    content: {
      preheader: `Nuevo reporte de rescate: ${reporte.tipoAnimal}`,
      webViewUrl: panelUrl,
      badge: { text: "Reporte de rescate", variant: urgenciaVariant },
      title: "Nuevo reporte de rescate 🆘",
      nombre: nombreOrganizacion,
      introHtml: `<p style="margin:0">Un ciudadano reportó un animal en situación de rescate que requiere atención.</p>`,
      infoCardTitle: "Información del reporte",
      infoRows: [
        { icon: "🐾", label: "Animal", value: reporte.tipoAnimal },
        { icon: "⚠️", label: "Urgencia", value: reporte.urgencia },
        { icon: "📍", label: "Ubicación", value: reporte.ubicacion },
        { icon: "📝", label: "Descripción", value: reporte.descripcion },
        estadoRow("Reporte recibido", urgenciaVariant),
      ],
      noteHtml: "Ingresa al panel para revisar las evidencias y coordinar la atención del caso.",
      cta: { url: panelUrl, label: "Ver reporte" },
    },
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
  await deliverMail({
    to: correo,
    subject: `Recibimos tu reporte de rescate — código ${codigo}`,
    text: `Gracias por reportar a un ${reporte.tipoAnimal} en ${reporte.ubicacion}.\n\nTu código de seguimiento es: ${codigo}\n\nPuedes consultar el estado de tu reporte cuando quieras en: ${seguimientoUrl}\n\nTe avisaremos por este correo cuando haya una actualización.`,
    content: {
      preheader: `Tu reporte fue recibido — código ${codigo}`,
      webViewUrl: seguimientoUrl,
      badge: { text: "Reporte recibido", variant: "success" },
      title: "¡Recibimos tu reporte! 🐾",
      introHtml: `<p style="margin:0">Gracias por reportar a un <strong>${escapeHtml(reporte.tipoAnimal)}</strong> en <strong>${escapeHtml(reporte.ubicacion)}</strong>. Las organizaciones aliadas revisarán el caso.</p>`,
      infoCardTitle: "Información del reporte",
      infoRows: [
        { icon: "🐾", label: "Animal", value: reporte.tipoAnimal },
        { icon: "📍", label: "Ubicación", value: reporte.ubicacion },
        {
          icon: "🔖",
          label: "Código",
          value: codigo,
          valueHtml: `<strong style="color:#800040;letter-spacing:1px">${escapeHtml(codigo)}</strong>`,
        },
        estadoRow("Reporte recibido", "success"),
      ],
      noteHtml: "Guarda tu código de seguimiento. También te avisaremos por este correo cuando haya una actualización.",
      cta: { url: seguimientoUrl, label: "Consultar estado" },
    },
  });
}

export async function sendReporteEstadoActualizadoEmail(
  correo: string,
  codigo: string,
  estado: string,
  seguimientoUrl: string,
  reporte: { tipoAnimal: string; ubicacion: string }
) {
  const estadoLabel = ESTADO_DENUNCIA_LABEL[estado] || estado;
  const variant: EmailBadgeVariant =
    estado === "atendida" || estado === "cerrada" ? "success" : estado === "revision" ? "warning" : "info";

  await deliverMail({
    to: correo,
    subject: `Actualización de tu reporte ${codigo}: ${estadoLabel}`,
    text: `Tu reporte del ${reporte.tipoAnimal} en ${reporte.ubicacion} (código ${codigo}) ahora está: ${estadoLabel}.\n\nConsulta los detalles en: ${seguimientoUrl}`,
    content: {
      preheader: `Tu reporte ${codigo} ahora está: ${estadoLabel}`,
      webViewUrl: seguimientoUrl,
      badge: { text: "Actualización de reporte", variant },
      title: "Actualización de tu reporte 📋",
      introHtml: `<p style="margin:0">Tu reporte del <strong>${escapeHtml(reporte.tipoAnimal)}</strong> en <strong>${escapeHtml(reporte.ubicacion)}</strong> tiene una nueva actualización.</p>`,
      infoCardTitle: "Información del reporte",
      infoRows: [
        { icon: "🔖", label: "Código", value: codigo },
        { icon: "🐾", label: "Animal", value: reporte.tipoAnimal },
        { icon: "📍", label: "Ubicación", value: reporte.ubicacion },
        estadoRow(estadoLabel, variant),
      ],
      cta: { url: seguimientoUrl, label: "Ver detalles" },
    },
  });
}

export async function sendReporteRescatadoEmail(
  correo: string,
  codigo: string,
  seguimientoUrl: string,
  reporte: { tipoAnimal: string; ubicacion: string; organizacionAtiende?: string | null }
) {
  const porOrganizacion = reporte.organizacionAtiende
    ? ` por ${reporte.organizacionAtiende}`
    : "";

  await deliverMail({
    to: correo,
    subject: `¡Buenas noticias! Tu reporte ${codigo} fue atendido 🎉`,
    text: `¡Buenas noticias! El ${reporte.tipoAnimal} que reportaste en ${reporte.ubicacion} (código ${codigo}) fue rescatado${porOrganizacion}.\n\nYa puedes ver las fotos que confirman el rescate en: ${seguimientoUrl}`,
    content: {
      preheader: `Tu reporte ${codigo} fue atendido: el animal ya fue rescatado`,
      webViewUrl: seguimientoUrl,
      badge: { text: "Animal rescatado", variant: "success" },
      title: "¡Tu reporte fue atendido! 🎉",
      introHtml: `<p style="margin:0">El <strong>${escapeHtml(reporte.tipoAnimal)}</strong> que reportaste en <strong>${escapeHtml(reporte.ubicacion)}</strong> fue rescatado${
        reporte.organizacionAtiende ? ` por <strong>${escapeHtml(reporte.organizacionAtiende)}</strong>` : ""
      }. Subimos fotos como evidencia del rescate.</p>`,
      infoCardTitle: "Información del reporte",
      infoRows: [
        { icon: "🔖", label: "Código", value: codigo },
        { icon: "🐾", label: "Animal", value: reporte.tipoAnimal },
        { icon: "📍", label: "Ubicación", value: reporte.ubicacion },
        estadoRow("Atendido", "success"),
      ],
      noteHtml: "Ingresa con tu código de seguimiento para ver las fotos que confirman el rescate.",
      cta: { url: seguimientoUrl, label: "Ver evidencia del rescate" },
    },
  });
}
