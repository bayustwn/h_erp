import { Injectable, Logger, NestMiddleware } from '@nestjs/common'

type RequestLike = {
  method?: string
  originalUrl?: string
  url?: string
}

type ResponseLike = {
  statusCode: number
  on: (event: 'finish', listener: () => void) => void
}

type NextFunctionLike = () => void

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP')

  use(req: RequestLike, res: ResponseLike, next: NextFunctionLike) {
    const startedAt = Date.now()
    const method = req.method ?? 'UNKNOWN'
    const url = req.originalUrl ?? req.url ?? ''

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt
      this.logger.log(`${method} ${url} ${res.statusCode} ${durationMs}ms`)
    })

    next()
  }
}
