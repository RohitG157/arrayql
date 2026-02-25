type Operator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'IN';
type SortOption = 'DESC' | 'ASC';

/**
 * Represents a WHERE condition in the query.
 */
type Condition<T> = {
  key: keyof T;
  operator: Operator;
  value: any;
};

/**
 * Represents sorting configuration.
 */
type SortConfig<T> = {
  key: keyof T;
  direction: SortOption;
};

/**
 * QueryBuilder provides a SQL-like query interface
 * for arrays of objects.
 */
export class QueryBuilder<T extends Record<string, any>> {
  private data: T[];
  private conditions: Condition<T>[] = [];
  private fields: (keyof T)[] = [];
  private sortConfig: SortConfig<T> | null = null;
  private limitCount: number | null = null;
  private offsetCount: number = 0;

  /**
   * Initializes the QueryBuilder with data.
   * @param data Array of objects to query.
   */
  constructor(data: T[]) {
    this.data = data;
  }

  /**
   * Adds a WHERE condition.
   * Multiple calls are combined using AND logic.
   * 
   * Example:
   * .where("age", ">", 25)
   */
  where(key: keyof T, operator: Operator, value: any) {
    this.conditions.push({ key, operator, value });
    return this;
  }

  /**
   * Evaluates a single condition against an item.
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
   * Executes the query and returns the final result.
   * 
   * Execution order:
   * WHERE → ORDER BY → OFFSET → LIMIT → SELECT
   */
  value() {
    // Apply WHERE conditions
    let filtered = this.data.filter((item) =>
      this.conditions.every((cond) => this.evaluate(item, cond)),
    );

    // Apply ORDER BY
    if (this.sortConfig) {
      filtered = this.sort(filtered);
    }

    // Apply OFFSET
    if (this.offsetCount > 0) {
      filtered = filtered.slice(this.offsetCount);
    }

    // Apply LIMIT
    if (this.limitCount !== null) {
      filtered = filtered.slice(0, this.limitCount);
    }

    // If no SELECT fields specified, return full objects
    if (this.fields.length === 0) return filtered;

    // Apply SELECT projection
    return filtered.map((item) => {
      const selected: Partial<T> = {};
      for (const field of this.fields) {
        selected[field] = item[field];
      }
      return selected as T;
    });
  }

  /**
   * Select specific fields (projection).
   * 
   * Example:
   * .select(["name", "age"])
   */
  select(fields: (keyof T)[]) {
    if (fields && fields.length) {
      this.fields = fields;
    }
    return this;
  }

  /**
   * Internal sorting logic.
   * Creates a new sorted array without mutating original data.
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

      return direction === "ASC" ? comparison : -comparison;
    });
  }

  /**
   * Adds ORDER BY clause.
   * Default direction is ASC.
   * 
   * Example:
   * .orderBy("age", "DESC")
   */
  orderBy(key: keyof T, direction: SortOption = "ASC") {
    this.sortConfig = { key, direction };
    return this;
  }

  /**
   * Limits the number of returned records.
   * 
   * Example:
   * .limit(10)
   */
  limit(count: number) {
    if (count < 0) {
      throw new Error("Limit must be non-negative");
    }
    this.limitCount = count;
    return this;
  }

  /**
   * Skips the first N records.
   * 
   * Example:
   * .offset(20)
   */
  offset(count: number) {
    if (count < 0) {
      throw new Error("Offset must be non-negative");
    }
    this.offsetCount = count;
    return this;
  }
}