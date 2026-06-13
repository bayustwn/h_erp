import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common'

type RequestLike = {
  url?: string
}

type ResponseLike = {
  status: (statusCode: number) => ResponseLike
  json: (body: unknown) => void
}

type ErrorBody = {
  message?: unknown
  error?: unknown
  statusCode?: unknown
}

export type ApiErrorResponse = {
  success: false
  error: {
    code: string
    message: string
    details?: unknown
  }
  path: string
  timestamp: string
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name)

  catch(exception: unknown, host: ArgumentsHost) {
    const http = host.switchToHttp()
    const request = http.getRequest<RequestLike>()
    const response = http.getResponse<ResponseLike>()

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR

    const errorBody =
      exception instanceof HttpException
        ? this.normalizeHttpError(exception.getResponse())
        : {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Internal server error',
          }

    if (!(exception instanceof HttpException)) {
      this.logger.error(exception)
    }

    response.status(status).json({
      success: false,
      error: errorBody,
      path: request.url ?? '',
      timestamp: new Date().toISOString(),
    } satisfies ApiErrorResponse)
  }

  private normalizeHttpError(error: string | object) {
    if (typeof error === 'string') {
      return {
        code: 'HTTP_ERROR',
        message: error,
      }
    }

    const body = error as ErrorBody
    const message = Array.isArray(body.message)
      ? body.message.join(', ')
      : typeof body.message === 'string'
        ? body.message
        : 'Request failed'

    return {
      code:
        typeof body.error === 'string'
          ? body.error.toUpperCase().replaceAll(' ', '_')
          : 'HTTP_ERROR',
      message,
      details: body.message,
    }
  }
}
