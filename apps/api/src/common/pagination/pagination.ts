import { z } from 'zod'

const DEFAULT_PAGE = 1
const DEFAULT_PAGE_SIZE = 10
const MAX_PAGE_SIZE = 100

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(DEFAULT_PAGE),
  pageSize: z.coerce.number().int().min(1).max(MAX_PAGE_SIZE).default(DEFAULT_PAGE_SIZE),
})

export type PaginationQuery = z.infer<typeof paginationQuerySchema>

export type PaginationMeta = {
  page: number
  pageSize: number
  total: number
  pageCount: number
}

export function parsePaginationQuery(query: unknown): PaginationQuery {
  return paginationQuerySchema.parse(query)
}

export function createPaginationMeta(
  pagination: PaginationQuery,
  total: number,
): PaginationMeta {
  return {
    page: pagination.page,
    pageSize: pagination.pageSize,
    total,
    pageCount: Math.ceil(total / pagination.pageSize),
  }
}

export function getPaginationSkipTake(pagination: PaginationQuery) {
  return {
    skip: (pagination.page - 1) * pagination.pageSize,
    take: pagination.pageSize,
  }
}
