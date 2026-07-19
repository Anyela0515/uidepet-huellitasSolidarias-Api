export interface PaginationParams {
  page: number;
  limit: number;
  offset: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MIN_LIMIT = 1;
const MAX_LIMIT = 100;

/** Normaliza page/limit desde query params sin confiar en el valor del cliente. */
export function parsePagination(query: Record<string, unknown>): PaginationParams {
  const rawPage = Number(query.page);
  const rawLimit = Number(query.limit);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : DEFAULT_PAGE;

  const limitCandidate = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.floor(rawLimit)
    : DEFAULT_LIMIT;
  const limit = Math.min(Math.max(limitCandidate, MIN_LIMIT), MAX_LIMIT);

  const offset = (page - 1) * limit;

  return { page, limit, offset };
}

export function buildPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 0;
  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPreviousPage: page > 1,
  };
}

/**
 * Construye una cláusula ORDER BY segura a partir de una lista blanca de campos.
 * `allowedFields` mapea claves públicas (query param) a expresiones SQL reales.
 */
export function buildSortClause(
  sortBy: unknown,
  sortOrder: unknown,
  allowedFields: Record<string, string>,
  defaultKey: string
): string {
  const key =
    typeof sortBy === "string" && Object.prototype.hasOwnProperty.call(allowedFields, sortBy)
      ? sortBy
      : defaultKey;
  const column = allowedFields[key] ?? allowedFields[defaultKey];
  const order = String(sortOrder ?? "").toLowerCase() === "asc" ? "ASC" : "DESC";
  return `${column} ${order}`;
}
