import { Injectable } from '@nestjs/common'
import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from 'node:crypto'

const KEY_LENGTH = 64
const SCRYPT_PARAMS = {
  cost: 16_384,
  blockSize: 8,
  parallelization: 1,
}

@Injectable()
export class PasswordService {
  async hash(password: string): Promise<string> {
    const salt = randomBytes(16)
    const key = (await scryptAsync(password, salt, KEY_LENGTH, SCRYPT_PARAMS)) as Buffer

    return [
      'scrypt',
      SCRYPT_PARAMS.cost,
      SCRYPT_PARAMS.blockSize,
      SCRYPT_PARAMS.parallelization,
      salt.toString('base64url'),
      key.toString('base64url'),
    ].join('$')
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    const [algorithm, cost, blockSize, parallelization, salt, storedKey] =
      passwordHash.split('$')

    if (
      algorithm !== 'scrypt' ||
      !cost ||
      !blockSize ||
      !parallelization ||
      !salt ||
      !storedKey
    ) {
      return false
    }

    const key = (await scryptAsync(password, Buffer.from(salt, 'base64url'), KEY_LENGTH, {
      cost: Number(cost),
      blockSize: Number(blockSize),
      parallelization: Number(parallelization),
    })) as Buffer
    const stored = Buffer.from(storedKey, 'base64url')

    return stored.length === key.length && timingSafeEqual(stored, key)
  }
}

function scryptAsync(
  password: string,
  salt: Buffer,
  keyLength: number,
  options: ScryptOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, keyLength, options, (error, derivedKey) => {
      if (error) {
        reject(error)
        return
      }

      resolve(derivedKey)
    })
  })
}
