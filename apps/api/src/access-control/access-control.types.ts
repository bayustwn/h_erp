export type TenantContext = {
  companyId: string
  branchId?: string
}

export type TenantRequirement = {
  branch?: 'optional' | 'required'
}

export type RequestWithAccessContext = {
  headers: {
    'x-company-id'?: string
    'x-branch-id'?: string
  }
  user?: {
    id: string
    email: string
    fullName: string
  }
  tenant?: TenantContext
}
