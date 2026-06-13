export type AuthenticatedUser = {
  id: string
  email: string
  fullName: string
}

export type AuthRequestContext = {
  ipAddress?: string
  userAgent?: string
}

export type AccessTokenPayload = {
  sub: string
  email: string
  fullName: string
}

export type TokenPair = {
  accessToken: string
  refreshToken: string
  tokenType: 'Bearer'
  expiresIn: number
  refreshExpiresIn: number
}
