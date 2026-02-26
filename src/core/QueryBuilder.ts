type Operator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'IN';
type SortOption = 'DESC' | 'ASC';

/**
 * Represents a single WHERE condition.
 * Example: { key: "age", operator: ">", value: 25 }
 */
type Condition<T> = {
  key: keyof T;
  operator: Operator;
  value: any;
};

/**
 * Represents ORDER BY configuration.
 */
type SortConfig<T> = {
  key: keyof T;
  direction: SortOption;
};

/**
 * QueryBuilder provides a SQL-like in-memory query engine
 * for arrays of objects.
 *
 * Internal logical model:
 * - conditionGroups: OR groups of AND conditions (DNF form)
 * - DISTINCT is applied before SELECT
 * - Mutation operations (update/delete) reuse same condition logic
 */
export class QueryBuilder<T extends Record<string, any>> {
  private data: T[];

  /**
   * conditionGroups structure:
   * [
   *   [A, B],   // A AND B
   *   [C]       // OR C
   * ]
   *
   * Logical meaning:
   * (A AND B) OR (C)
   */
  private conditionGroups: Condition<T>[][] = [[]];

  private fields: (keyof T)[] = [];
  private sortConfig: SortConfig<T> | null = null;
  private limitCount: number | null = null;
  private offsetCount: number = 0;

  /**
   * DISTINCT is field-based.
   * Null means no distinct applied.
   */
  private distinctField: keyof T | null = null;

  constructor(data: T[]) {
    this.data = data;
  }

  /**
   * Adds condition to the current AND group.
   */
  where(key: keyof T, operator: Operator, value: any) {
    const currentGroup =
      this.conditionGroups[this.conditionGroups.length - 1];

    currentGroup?.push({ key, operator, value });
    return this;
  }

  /**
   * Starts a new OR group.
   * If called first, behaves like where().
   */
  orWhere(key: keyof T, operator: Operator, value: any) {
    if (
      this.conditionGroups.length === 1 &&
      this.conditionGroups[0]?.length === 0
    ) {
      return this.where(key, operator, value);
    }

    this.conditionGroups.push([{ key, operator, value }]);
    return this;
  }

  /**
   * Evaluates a single condition.
   */
  private evaluate(item: T, cond: Condition<T>) {
    const val = item[cond.key];

    switch (cond.operator) {
      case '=':
        return val === cond.value;
      case '>':
        return val > cond.value;
      case '<':
        return val < cond.value;
      case '>=':
        return val >= cond.value;
      case '<=':
        return val <= cond.value;
      case '!=':
        return val !== cond.value;
      case 'IN':
        return Array.isArray(cond.value) && cond.value.includes(val);
      default:
        return false;
    }
  }

  /**
   * Executes the query.
   *
   * Execution pipeline:
   * WHERE → ORDER BY → OFFSET → LIMIT → DISTINCT → SELECT
   */
  value() {
    let filtered = this.data;

    /**
     * Apply WHERE logic using Disjunctive Normal Form:
     * OR groups of AND conditions.
     */
    const hasConditions = this.conditionGroups.some(
      group => group.length > 0
    );

    if (hasConditions) {
      filtered = this.data.filter(item =>
        this.conditionGroups.some(group =>
          group.length > 0 &&
          group.every(cond => this.evaluate(item, cond))
        )
      );
    }

    /**
     * ORDER BY does not mutate original dataset.
     */
    if (this.sortConfig) {
      filtered = this.sort(filtered);
    }

    /**
     * OFFSET removes first N rows.
     */
    if (this.offsetCount > 0) {
      filtered = filtered.slice(this.offsetCount);
    }

    /**
     * LIMIT restricts result size.
     */
    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    /**
     * DISTINCT (field-based).
     * Keeps first occurrence of each unique field value.
     * Stable order is preserved.
     */
    if (this.distinctField !== null) {
      const seen = new Set<any>();

      filtered = filtered.filter(item => {
        const value = item[this.distinctField!];

        if (seen.has(value)) return false;

        seen.add(value);
        return true;
      });
    }

    /**
     * If no projection requested, return full objects.
     */
    if (this.fields.length === 0) return filtered;

    /**
     * SELECT projection (output shaping).
     */
    return filtered.map(item => {
      const selected: Partial<T> = {};

      for (const field of this.fields) {
        selected[field] = item[field];
      }

      return selected as T;
    });
  }

  /**
   * Specifies projection fields.
   */
  select(fields: (keyof T)[]) {
    if (fields?.length) {
      this.fields = fields;
    }
    return this;
  }

  /**
   * Internal sorting implementation.
   */
  private sort(data: T[]) {
    if (!this.sortConfig) return data;

    const { key, direction } = this.sortConfig;

    return [...data].sort((a, b) => {
      const valA = a[key];
      const valB = b[key];

      if (valA == null) return 1;
      if (valB == null) return -1;
      if (valA === valB) return 0;

      const comparison = valA < valB ? -1 : 1;

      return direction === 'ASC' ? comparison : -comparison;
    });
  }

  orderBy(key: keyof T, direction: SortOption = 'ASC') {
    this.sortConfig = { key, direction };
    return this;
  }

  limit(count: number) {
    if (count < 0) {
      throw new Error('Limit must be non-negative');
    }
    this.limitCount = count;
    return this;
  }

  offset(count: number) {
    if (count < 0) {
      throw new Error('Offset must be non-negative');
    }
    this.offsetCount = count;
    return this;
  }

  /**
   * Inserts one or multiple records.
   */
  insert(record: T | T[]) {
    if (Array.isArray(record)) {
      this.data.push(...record);
    } else {
      this.data.push(record);
    }
    return this;
  }

  /**
   * Updates records matching condition logic.
   */
  update(updates: Partial<T>) {
    this.data = this.data.map(item => {
      const matches = this.conditionGroups.some(group =>
        group.length > 0 &&
        group.every(cond => this.evaluate(item, cond))
      );

      return matches ? { ...item, ...updates } : item;
    });

    this.reset();
    return this;
  }

  /**
   * Deletes records matching condition logic.
   */
  delete() {
    this.data = this.data.filter(item => {
      const matches = this.conditionGroups.some(group =>
        group.length > 0 &&
        group.every(cond => this.evaluate(item, cond))
      );

      return !matches;
    });

    this.reset();
    return this;
  }

  /**
   * Enables field-based DISTINCT.
   */
  distinct(key: keyof T) {
    this.distinctField = key;
    return this;
  }

  /**
   * Resets query state (not data).
   * Maintains invariant: always one empty condition group.
   */
  reset() {
    this.conditionGroups = [[]];
    this.fields = [];
    this.sortConfig = null;
    this.limitCount = null;
    this.offsetCount = 0;
    this.distinctField = null;
  }
}