const URL = "http://localhost:3000/mascotas/publicas";
const TOKEN = process.env.API_TOKEN;

// Tu API permite 10 solicitudes cada 15 minutos.
// Usaremos 8 mediciones y 1 calentamiento.
const TOTAL = 8;

if (!TOKEN) {
  console.error("Falta la variable API_TOKEN");
  process.exit(1);
}

function percentile(values, percent) {
  const sorted = [...values].sort((a, b) => a - b);
  const position = Math.ceil((percent / 100) * sorted.length) - 1;

  return sorted[Math.max(0, position)];
}

async function makeRequest() {
  const start = performance.now();

  const response = await fetch(URL, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
    },
  });

  const body = await response.text();
  const end = performance.now();

  if (!response.ok) {
    const retryAfter = response.headers.get("retry-after");

    throw new Error(
      `HTTP ${response.status}: ${body}` +
        (retryAfter ? ` | Reintentar en ${retryAfter} segundos` : "")
    );
  }

  return {
    duration: end - start,
    size: Buffer.byteLength(body, "utf8"),
  };
}

async function main() {
  const times = [];
  const sizes = [];

  console.log("=== BENCHMARK GET /mascotas/publicas ===");
  console.log(`Endpoint: ${URL}`);
  console.log(`Solicitudes medidas: ${TOTAL}`);

  // Una sola petición de calentamiento.
  await makeRequest();

  for (let i = 0; i < TOTAL; i++) {
    const result = await makeRequest();

    times.push(result.duration);
    sizes.push(result.size);

    console.log(
      `Petición ${i + 1}: ${result.duration.toFixed(2)} ms`
    );
  }

  const average =
    times.reduce((sum, value) => sum + value, 0) / times.length;

  const averageSize =
    sizes.reduce((sum, value) => sum + value, 0) / sizes.length;

  console.log("\n=== MÉTRICAS DESPUÉS DE LA OPTIMIZACIÓN ===");
  console.log(`P50: ${percentile(times, 50).toFixed(2)} ms`);
  console.log(`P95: ${percentile(times, 95).toFixed(2)} ms`);
  console.log(`P99: ${percentile(times, 99).toFixed(2)} ms`);
  console.log(`Promedio: ${average.toFixed(2)} ms`);
  console.log(`Tamaño promedio: ${Math.round(averageSize)} bytes`);
  console.log(`Mínimo: ${Math.min(...times).toFixed(2)} ms`);
  console.log(`Máximo: ${Math.max(...times).toFixed(2)} ms`);
}

main().catch((error) => {
  console.error("Error:", error.message);
  process.exit(1);
});