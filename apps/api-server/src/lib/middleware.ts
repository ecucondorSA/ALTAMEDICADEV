import { AppError, createErrorResponse, logger, validateSchema } from '@altamedica/shared';
import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';

export function withValidation<T>(schema: ZodSchema<T>) {
  return function (handler: (request: NextRequest, validatedData: T) => Promise<Response>) {
    return async (request: NextRequest) => {
      try {
        const body = await request.json();
        const validation = validateSchema(schema, body);

        if (!validation.success) {
          return NextResponse.json(
            createErrorResponse('VALIDATION_ERROR', validation.error),
            { status: 400 }
          );
        }

        return await handler(request, validation.data);
      } catch (error) {
        if (error instanceof SyntaxError) {
          return NextResponse.json(
            createErrorResponse('INVALID_JSON', 'Invalid JSON in request body'),
            { status: 400 }
          );
        }

        logger.error('Request validation error', error);
        return NextResponse.json(
          createErrorResponse('INTERNAL_ERROR', 'Internal server error'),
          { status: 500 }
        );
      }
    };
  };
}

export function withErrorHandling(handler: (request: NextRequest, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    try {
      return await handler(request, ...args);
    } catch (error) {
      logger.error('API error', error);

      if (error instanceof AppError) {
        return NextResponse.json(
          createErrorResponse(error.code, error.message, error.details),
          { status: error.statusCode }
        );
      }

      // Unexpected error
      return NextResponse.json(
        createErrorResponse('INTERNAL_ERROR', 'Internal server error'),
        { status: 500 }
      );
    }
  };
}

export function withLogging(handler: (request: NextRequest, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    const start = Date.now();
    const { method, url } = request;

    logger.info(`${method} ${url} - Started`);

    try {
      const response = await handler(request, ...args);
      const duration = Date.now() - start;
      
      logger.info(`${method} ${url} - ${response.status} (${duration}ms)`);
      
      return response;
    } catch (error) {
      const duration = Date.now() - start;
      logger.error(`${method} ${url} - Error (${duration}ms)`, error);
      throw error;
    }
  };
}

export function withCORS(handler: (request: NextRequest, ...args: any[]) => Promise<Response>) {
  return async (request: NextRequest, ...args: any[]) => {
    // Handle preflight requests
    if (request.method === 'OPTIONS') {
      return new NextResponse(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    const response = await handler(request, ...args);

    // Add CORS headers to response
    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  };
}

export function compose(...middlewares: Array<(handler: any) => any>) {
  return (handler: any) => {
    return middlewares.reduceRight((acc, middleware) => middleware(acc), handler);
  };
}
