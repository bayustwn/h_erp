export type PutObjectInput = {
  objectPath: string
  contentType: string
  body: Buffer
  checksum?: string
}

export type PutObjectResult = {
  bucket: string
  objectPath: string
  publicUrl?: string
}

export type SignedUrlInput = {
  objectPath: string
  expiresInSeconds?: number
}

