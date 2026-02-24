import { QueryBuilder } from './core/QueryBuilder';

export function arrayql<T extends Record<string, any>>(data: T[]) {
  return new QueryBuilder(data);
}