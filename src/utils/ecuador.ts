// Espejo de src/utils/validateForm.js (frontend): antes solo el formulario
// web validaba el dígito verificador de la cédula y el formato del celular;
// el backend aceptaba cualquier string de 10 dígitos. Eso lo salta cualquier
// llamada directa a la API (incluidas las tools MCP), así que se repite aquí.

export function esCedulaEcuatorianaValida(valor: string): boolean {
  if (!/^\d{10}$/.test(valor)) return false;

  const provincia = parseInt(valor.substring(0, 2), 10);
  if (provincia < 1 || provincia > 24) return false;

  const tercerDigito = parseInt(valor[2], 10);
  if (tercerDigito > 5) return false;

  const coeficientes = [2, 1, 2, 1, 2, 1, 2, 1, 2];
  let suma = 0;
  for (let i = 0; i < 9; i++) {
    let resultado = parseInt(valor[i], 10) * coeficientes[i];
    if (resultado >= 10) resultado -= 9;
    suma += resultado;
  }

  const digitoVerificador = parseInt(valor[9], 10);
  const residuo = suma % 10;
  const digitoCalculado = residuo === 0 ? 0 : 10 - residuo;

  return digitoCalculado === digitoVerificador;
}

export function esTelefonoEcuatorianoValido(valor: string): boolean {
  return /^09\d{8}$/.test(valor.trim());
}
