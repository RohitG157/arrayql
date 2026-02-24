type Operator = '=' | '>' | '<' | '>=' | '<=' | '!=' | 'IN';

type Condition<T> = {
  key: keyof T;
  operator: Operator;
  value: any;
};

export class QueryBuilder<T extends Record<string, any>> {
  private data: T[];
  private conditions: Condition<T>[] = [];
  private fields: (keyof T)[] = [];

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
    let result = this.data.filter((item) =>
      this.conditions.every((cond) => this.evaluate(item, cond)),
    );

    if (this.fields.length === 0) {
      return result;
    }

    result = result.map((item) => {
      const newItem: Partial<T> = {};
      this.fields.forEach((field) => {
        if (field in item) {
          newItem[field] = item[field];
        }
      });
      return newItem as T;
    });
    return result;
  }

  select(fields: (keyof T)[]) {
    if (fields && fields.length) {
      this.fields = fields;
    }
    return this;
  }
}
