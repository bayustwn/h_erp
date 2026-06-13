import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common'
import { Observable, map } from 'rxjs'

type RequestLike = {
  url?: string
}

export type ApiSuccessResponse<T> = {
  success: true
  data: T
  path: string
  timestamp: string
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiSuccessResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    const request = context.switchToHttp().getRequest<RequestLike>()
    const path = request.url ?? ''

    return next.handle().pipe(
      map((data) => ({
        success: true as const,
        data,
        path,
        timestamp: new Date().toISOString(),
      })),
    )
  }
}
