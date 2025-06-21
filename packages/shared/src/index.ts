import type { ApiResponse } from '@altamedica/types';
import { z } from 'zod';

// API Response helpers
export function createSuccessResponse<T>(data: T, meta?: Record<string, unknown>): ApiResponse {
  return {
    success: true,
    data,
    meta,
  };
}

export function createErrorResponse(code: string, message: string, details?: Record<string, unknown>): ApiResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details,
    },
  };
}

// Validation helpers
export function validateSchema<T>(schema: z.ZodSchema<T>, data: unknown): { success: true; data: T } | { success: false; error: string } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      const errorMessage = error.errors.map(err => `${err.path.join('.')}: ${err.message}`).join(', ');
      return { success: false, error: errorMessage };
    }
    return { success: false, error: 'Validation failed' };
  }
}

// Pagination helpers
export interface PaginationParams {
  page?: number;
  limit?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export function validatePagination(params: PaginationParams): { page: number; limit: number } {
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(100, Math.max(1, params.limit || 10));
  return { page, limit };
}

export function createPaginationMeta(page: number, limit: number, total: number): PaginationMeta {
  const totalPages = Math.ceil(total / limit);
  return {
    page,
    limit,
    total,
    totalPages,
  };
}

// Date helpers
export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}

export function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

export function addHours(date: Date, hours: number): Date {
  const result = new Date(date);
  result.setHours(result.getHours() + hours);
  return result;
}

export function addMinutes(date: Date, minutes: number): Date {
  const result = new Date(date);
  result.setMinutes(result.getMinutes() + minutes);
  return result;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  return date1.getFullYear() === date2.getFullYear() &&
         date1.getMonth() === date2.getMonth() &&
         date1.getDate() === date2.getDate();
}

export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

export function isFuture(date: Date): boolean {
  return date.getTime() > Date.now();
}

export function isPast(date: Date): boolean {
  return date.getTime() < Date.now();
}

// String helpers
export function generateId(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w ]+/g, '')
    .replace(/ +/g, '-');
}

export function capitalize(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
}

export function capitalizeWords(text: string): string {
  return text.split(' ').map(capitalize).join(' ');
}

export function truncate(text: string, length: number): string {
  if (text.length <= length) return text;
  return text.substring(0, length) + '...';
}

// Array helpers
export function unique<T>(array: T[]): T[] {
  return [...new Set(array)];
}

export function chunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export function groupBy<T, K extends string | number | symbol>(
  array: T[],
  keyFn: (item: T) => K
): Record<K, T[]> {
  return array.reduce((groups, item) => {
    const key = keyFn(item);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(item);
    return groups;
  }, {} as Record<K, T[]>);
}

// Object helpers
export function omit<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Omit<T, K> {
  const result = { ...obj };
  keys.forEach(key => delete result[key]);
  return result;
}

export function pick<T extends Record<string, unknown>, K extends keyof T>(
  obj: T,
  keys: K[]
): Pick<T, K> {
  const result = {} as Pick<T, K>;
  keys.forEach(key => {
    if (key in obj) {
      result[key] = obj[key];
    }
  });
  return result;
}

// Number helpers
export function formatCurrency(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount);
}

export function formatNumber(num: number): string {
  return new Intl.NumberFormat('en-US').format(num);
}

export function clamp(num: number, min: number, max: number): number {
  return Math.min(Math.max(num, min), max);
}

export function round(num: number, decimals = 2): number {
  return Math.round(num * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

// Async helpers
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  let lastError: Error;
    for (let i = 0; i <= retries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < retries) {
        await delay(delayMs);
      }
    }
  }
  
  throw lastError || new Error('Retry failed');
}

// Error helpers
export class AppError extends Error {
  constructor(
    public code: string,
    message: string,
    public statusCode = 500,
    public details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super('VALIDATION_ERROR', message, 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string) {
    super('NOT_FOUND', `${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized') {
    super('UNAUTHORIZED', message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'Forbidden') {
    super('FORBIDDEN', message, 403);
    this.name = 'ForbiddenError';
  }
}

// Logger
export interface Logger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error | unknown): void;
  debug(message: string, data?: Record<string, unknown>): void;
}

export class ConsoleLogger implements Logger {
  info(message: string, data?: Record<string, unknown>): void {
    console.log(`[INFO] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  warn(message: string, data?: Record<string, unknown>): void {
    console.warn(`[WARN] ${message}`, data ? JSON.stringify(data, null, 2) : '');
  }

  error(message: string, error?: Error | unknown): void {
    console.error(`[ERROR] ${message}`, error);
  }

  debug(message: string, data?: Record<string, unknown>): void {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${message}`, data ? JSON.stringify(data, null, 2) : '');
    }
  }
}

// Authentication helpers
export async function verifyAuthToken(token: string): Promise<{ uid: string; email: string; role?: string } | null> {
  try {
    // Esta función debería implementar la verificación real del token
    // Por ahora, implementamos una verificación mock para desarrollo
    if (!token || token === 'invalid') {
      return null;
    }
    
    // En un entorno real, aquí verificarías el token con Firebase Auth
    // const decodedToken = await admin.auth().verifyIdToken(token);
    // return { uid: decodedToken.uid, email: decodedToken.email };
    
    // Mock implementation para desarrollo
    return {
      uid: 'mock-user-id',
      email: 'test@example.com',
      role: 'doctor'
    };
  } catch (error) {
    logger.error('Error verifying auth token', error);
    return null;
  }
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function authenticateRequest(authHeader: string | null): Promise<{ uid: string; email: string; role?: string } | null> {
  const token = extractBearerToken(authHeader);
  if (!token) {
    return null;
  }
  return verifyAuthToken(token);
}

// Firestore helpers para manejo de documentos con tipos
export interface FirestoreTimestamp {
  toDate(): Date;
}

export interface FirestoreDocumentData {
  [key: string]: unknown;
  createdAt?: FirestoreTimestamp | Date;
  updatedAt?: FirestoreTimestamp | Date;
}

export function convertFirestoreTimestamps<T extends FirestoreDocumentData>(data: T): T {
  const converted = { ...data };
  
  // Convertir timestamps de Firestore a Date objects
  if (converted.createdAt && typeof converted.createdAt === 'object' && 'toDate' in converted.createdAt) {
    converted.createdAt = (converted.createdAt as FirestoreTimestamp).toDate();
  }
  if (converted.updatedAt && typeof converted.updatedAt === 'object' && 'toDate' in converted.updatedAt) {
    converted.updatedAt = (converted.updatedAt as FirestoreTimestamp).toDate();
  }
  
  return converted;
}

export interface FirestoreDocumentSnapshot {
  id: string;
  data(): FirestoreDocumentData;
}

export function processFirestoreDoc<T extends FirestoreDocumentData>(doc: FirestoreDocumentSnapshot): T & { id: string } {
  const data = doc.data() as T;
  return {
    id: doc.id,
    ...convertFirestoreTimestamps(data)
  };
}

export const logger = new ConsoleLogger();
