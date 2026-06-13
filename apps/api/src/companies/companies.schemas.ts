import { z } from 'zod'

const optionalString = z.preprocess(
  (value) => (value === '' ? undefined : value),
  z.string().trim().optional(),
)

const currencyCodeSchema = z.enum(['IDR', 'USD'])

export const companiesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(10),
  search: optionalString,
})

export const updateCompanySchema = z
  .object({
    name: z.string().trim().min(1).max(255).optional(),
    legalName: optionalString,
    taxNumber: optionalString,
    baseCurrencyCode: currencyCodeSchema.optional(),
    email: z
      .email()
      .optional()
      .or(z.literal('').transform(() => undefined)),
    phone: optionalString,
    address: optionalString,
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })

export type CompaniesQuery = z.infer<typeof companiesQuerySchema>
export type UpdateCompanyInput = z.infer<typeof updateCompanySchema>
