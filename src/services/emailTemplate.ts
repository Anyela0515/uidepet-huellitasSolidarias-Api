export type EmailBadgeVariant = "success" | "danger" | "warning" | "info" | "neutral";

export interface EmailInfoRow {
  icon: string;
  label: string;
  value: string;
  valueHtml?: string;
}

export interface HuellitasEmailContent {
  preheader?: string;
  webViewUrl?: string;
  badge?: { text: string; variant: EmailBadgeVariant };
  title: string;
  nombre?: string;
  introHtml: string;
  infoCardTitle?: string;
  infoRows?: EmailInfoRow[];
  noteHtml?: string;
  cta?: { url: string; label: string };
  closingHtml?: string;
}

const BRAND = {
  wine: "#800040",
  pink: "#fde8f0",
  pinkSoft: "#fff5f9",
  bg: "#f3f4f6",
  muted: "#666666",
  border: "#f0e4ea",
};

const BADGE_STYLES: Record<EmailBadgeVariant, { bg: string; color: string; border: string }> = {
  success: { bg: "#e8f5e9", color: "#2e7d32", border: "#c8e6c9" },
  danger: { bg: "#ffebee", color: "#c62828", border: "#ffcdd2" },
  warning: { bg: "#fff3e0", color: "#e65100", border: "#ffe0b2" },
  info: { bg: "#e3f2fd", color: "#1565c0", border: "#bbdefb" },
  neutral: { bg: "#f5f5f5", color: "#616161", border: "#e0e0e0" },
};

const BADGE_ICONS: Record<EmailBadgeVariant, string> = {
  success: "✓",
  danger: "✕",
  warning: "!",
  info: "i",
  neutral: "●",
};

export function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[character]!);
}

function renderBadge(badge: { text: string; variant: EmailBadgeVariant }) {
  const style = BADGE_STYLES[badge.variant];
  return `<div style="text-align:center;margin:0 0 18px">
    <span style="display:inline-block;padding:8px 18px;border-radius:999px;background:${style.bg};border:1px solid ${style.border};color:${style.color};font-size:11px;font-weight:800;letter-spacing:0.8px;text-transform:uppercase">
      ${BADGE_ICONS[badge.variant]} ${escapeHtml(badge.text)}
    </span>
  </div>`;
}

function renderInfoCard(title: string, rows: EmailInfoRow[]) {
  const rowsHtml = rows
    .map(
      (row, index) => `<tr>
        <td style="padding:12px 14px;${index < rows.length - 1 ? "border-bottom:1px solid #f3e3ea;" : ""}width:34px;font-size:18px;line-height:1">${row.icon}</td>
        <td style="padding:12px 8px;${index < rows.length - 1 ? "border-bottom:1px solid #f3e3ea;" : ""}font-size:13px;font-weight:700;color:${BRAND.wine};white-space:nowrap">${escapeHtml(row.label)}</td>
        <td style="padding:12px 14px;${index < rows.length - 1 ? "border-bottom:1px solid #f3e3ea;" : ""}font-size:14px;color:#333;text-align:right">${row.valueHtml ?? escapeHtml(row.value)}</td>
      </tr>`
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:22px 0;border:1px solid #f0dbe3;border-radius:14px;overflow:hidden">
    <tr>
      <td style="background:${BRAND.pinkSoft};padding:12px 16px;font-size:14px;font-weight:800;color:${BRAND.wine}">
        📋 ${escapeHtml(title)}
      </td>
    </tr>
    <tr>
      <td style="padding:0">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${rowsHtml}</table>
      </td>
    </tr>
  </table>`;
}

function renderNoteBox(noteHtml: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:20px 0;background:#f1f8f4;border-radius:12px;border-left:4px solid #4caf50">
    <tr>
      <td style="padding:14px 16px;font-size:14px;line-height:1.6;color:#2e5c3e">
        <span style="font-size:18px;margin-right:6px">🤝</span>${noteHtml}
      </td>
    </tr>
  </table>`;
}

function renderCta(url: string, label: string) {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:26px 0 8px">
    <tr>
      <td align="center">
        <a href="${url}" style="display:inline-block;background:${BRAND.wine};color:#ffffff;padding:14px 28px;border-radius:999px;text-decoration:none;font-weight:800;font-size:15px">
          ${escapeHtml(label)} &rsaquo;
        </a>
      </td>
    </tr>
  </table>`;
}

function renderDivider() {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 18px">
    <tr>
      <td style="border-top:1px solid #ececec;height:1px;line-height:1px;font-size:1px">&nbsp;</td>
      <td style="width:34px;text-align:center;color:#e91e63;font-size:16px;line-height:1">♥</td>
      <td style="border-top:1px solid #ececec;height:1px;line-height:1px;font-size:1px">&nbsp;</td>
    </tr>
  </table>`;
}

export function renderHuellitasEmail(content: HuellitasEmailContent): string {
  const webViewUrl = content.webViewUrl || "#";
  const preheader = escapeHtml(content.preheader || content.title);
  const greeting = content.nombre
    ? `<p style="margin:0 0 14px;font-size:15px;color:#333">Hola, <strong style="color:${BRAND.wine}">${escapeHtml(content.nombre)}</strong></p>`
    : "";
  const closing =
    content.closingHtml ??
    `<p style="margin:0;font-size:14px;line-height:1.65;color:#555;text-align:center">Gracias por confiar en Huellitas Solidarias y formar parte de una comunidad que promueve la adopción responsable. 🐾</p>`;

  const bodyParts = [
    content.badge ? renderBadge(content.badge) : "",
    `<h1 style="margin:0 0 16px;font-size:24px;line-height:1.25;color:${BRAND.wine};text-align:center;font-weight:800">${content.title}</h1>`,
    greeting,
    `<div style="font-size:15px;line-height:1.65;color:#444;margin-bottom:8px">${content.introHtml}</div>`,
    content.infoCardTitle && content.infoRows?.length
      ? renderInfoCard(content.infoCardTitle, content.infoRows)
      : "",
    content.noteHtml ? renderNoteBox(content.noteHtml) : "",
    content.cta ? renderCta(content.cta.url, content.cta.label) : "",
    renderDivider(),
    closing,
  ]
    .filter(Boolean)
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.title)}</title>
</head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;color:#333">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0">${preheader}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.bg};padding:28px 12px">
    <tr>
      <td align="center">
        <p style="margin:0 0 14px;font-size:12px;color:#888">
          Si no puedes ver este correo, <a href="${webViewUrl}" style="color:${BRAND.wine};font-weight:700;text-decoration:none">haz clic aquí</a>
        </p>
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid ${BRAND.border};box-shadow:0 8px 28px rgba(128,0,64,0.08)">
          <tr>
            <td style="padding:22px 26px 18px;border-bottom:1px solid ${BRAND.border}">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle" style="padding-right:12px">
                    <table role="presentation" cellpadding="0" cellspacing="0">
                      <tr>
                        <td valign="middle" style="padding-right:12px">
                          <img src="cid:email-logo" alt="Huellitas Solidarias" width="52" height="52" style="display:block;border-radius:50%" />
                        </td>
                        <td valign="middle">
                          <div style="font-size:17px;font-weight:800;color:${BRAND.wine};line-height:1.25">UidePet — Huellitas Solidarias</div>
                          <div style="font-size:11px;color:#888;margin-top:5px;line-height:1.45">Adopción responsable · Bienestar animal · Nuevas oportunidades</div>
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle" align="right" width="96">
                    <img src="cid:henry-mascot" alt="Henry" width="88" style="display:block;margin-left:auto" />
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:28px 30px 22px">${bodyParts}</td>
          </tr>
          <tr>
            <td style="background:${BRAND.pink};padding:20px 26px;text-align:center">
              <div style="font-size:14px;font-weight:800;color:${BRAND.wine};margin-bottom:6px">Huellitas Solidarias UIDE</div>
              <div style="font-size:12px;color:#888;line-height:1.55;margin-bottom:4px">Este correo fue generado automáticamente. Por favor, no respondas directamente a este mensaje.</div>
              <div style="font-size:11px;color:#aaa">© ${new Date().getFullYear()} UidePet — Huellitas Solidarias</div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
