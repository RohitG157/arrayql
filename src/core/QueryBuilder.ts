type Operator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'IN';
type SortOption = 'DESC' | 'ASC';

type Condition<T> = {
  key: keyof T;
  operator: Operator;
  value: any;
};

type SortConfig<T> = {
  key: keyof T;
  direction: SortOption;
};

export class QueryBuilder<T extends Record<string, any>> {
  private data: T[];
  private conditions: Condition<T>[] = [];
  private fields: (keyof T)[] = [];
  private sortConfig: SortConfig<T> | null = null;
	private limitCount: number | null = null;
	private offsetCount: number = 0;

  constructor(data: T[]) {
    this.data = data;
  }

  where(key: keyof T, operator: Operator, value: any) {
    this.conditions.push({ key, operator, value });
    return this;
  }

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

  value() {
    let filtered = this.data.filter((item) =>
      this.conditions.every((cond) => this.evaluate(item, cond)),
    );

		if (this.sortConfig) {
			filtered = this.sort(filtered);
		}

		if (this.offsetCount > 0) {
			filtered = filtered.slice(this.offsetCount);
		}

		if (this.limitCount !== null) {
			filtered = filtered.slice(0, this.limitCount);
		}

    if (this.fields.length === 0) return filtered;

    return filtered.map((item) => {
      const selected: Partial<T> = {};
      for (const field of this.fields) {
        if (field in item) {
          selected[field] = item[field];
        }
      }
      return selected as T;
    });
  }

  select(fields: (keyof T)[]) {
    if (fields && fields.length) {
      this.fields = fields;
    }
    return this;
  }

	sort(data: T[]) {
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

  orderBy(key: keyof T, direction: SortOption = "ASC") {
    this.sortConfig = { key, direction };
		return this;
  }

	limit(count: number) {
		if (count < 0) {
			throw new Error("Limit must be non-negative");
		}
		this.limitCount = count;
		return this;
	}

	offset(count: number) {
		if (count < 0) {
			throw new Error("Offset must be non-negative");
		}
		this.offsetCount = count;
		return this;
	}
}
