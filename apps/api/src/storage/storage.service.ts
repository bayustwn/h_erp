import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { Inject, Injectable } from '@nestjs/common'
import { ConfigService, ConfigType } from '@nestjs/config'
import { loadAppConfig } from '../config/env.config.js'
import type { PutObjectInput, PutObjectResult, SignedUrlInput } from './storage.types.js'

const DEFAULT_SIGNED_URL_TTL_SECONDS = 300

@Injectable()
export class StorageService {
  private readonly appConfig: ConfigType<typeof loadAppConfig>
  private readonly client: S3Client

  constructor(@Inject(ConfigService) configService: ConfigService) {
    this.appConfig = configService.getOrThrow<ConfigType<typeof loadAppConfig>>('app')
    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${this.appConfig.r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: this.appConfig.r2AccessKeyId,
        secretAccessKey: this.appConfig.r2SecretAccessKey,
      },
    })
  }

  get bucket() {
    return this.appConfig.storageBucket
  }

  async putObject(input: PutObjectInput): Promise<PutObjectResult> {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.objectPath,
        Body: input.body,
        ContentType: input.contentType,
        ChecksumSHA256: input.checksum,
      }),
    )

    return {
      bucket: this.bucket,
      objectPath: input.objectPath,
      publicUrl: this.createPublicUrl(input.objectPath),
    }
  }

  createPublicUrl(objectPath: string) {
    if (!this.appConfig.r2PublicBaseUrl) return undefined
    return `${this.appConfig.r2PublicBaseUrl.replace(/\/$/, '')}/${objectPath}`
  }

  createSignedGetUrl(input: SignedUrlInput) {
    return getSignedUrl(
      this.client,
      new GetObjectCommand({
        Bucket: this.bucket,
        Key: input.objectPath,
      }),
      {
        expiresIn: input.expiresInSeconds ?? DEFAULT_SIGNED_URL_TTL_SECONDS,
      },
    )
  }
}

