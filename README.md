# ArrayQL

A lightweight SQL-like in-memory query engine for arrays of objects written in TypeScript.

ArrayQL allows you to perform filtering, sorting, pagination, distinct selection, and mutation operations using a fluent API.

---

## ✨ Features

- AND / OR condition grouping
- Field-based DISTINCT
- ORDER BY (ASC / DESC)
- LIMIT & OFFSET
- SELECT projection
- INSERT
- UPDATE
- DELETE
- Fully typed with TypeScript generics
- Chainable API

---

## 📦 Installation

```bash
npm install arrayql
```

---

## 🚀 Basic Usage

```ts
import { arrayql } from "arrayql";
```

---

## 📘 Sample Data

```ts
type User = {
  id: number;
  name: string;
  age: number;
  department: string;
};

const users: User[] = [
  { id: 1, name: "Alice", age: 30, department: "IT" },
  { id: 2, name: "Bob", age: 25, department: "HR" },
  { id: 3, name: "Charlie", age: 30, department: "IT" },
  { id: 4, name: "David", age: 35, department: "Finance" }
];
```

---

## 🔎 WHERE (AND Logic)

```ts
const result = arrayql(users)
  .where("age", ">", 28)
  .value();
```

---

## 🔀 OR Logic

```ts
const result = arrayql(users)
  .where("age", ">", 30)
  .orWhere("department", "=", "HR")
  .value();
```

Logical meaning:

```
(age > 30) OR (department = "HR")
```

---

## 🧮 SELECT (Projection)

```ts
const result = arrayql(users)
  .where("age", ">", 25)
  .select(["name", "department"])
  .value();
```

---

## 📊 ORDER BY

```ts
const result = arrayql(users)
  .orderBy("age", "DESC")
  .value();
```

---

## 📄 Pagination

```ts
const result = arrayql(users)
  .orderBy("id")
  .offset(1)
  .limit(2)
  .value();
```

---

## 🧬 DISTINCT (Before SELECT)

```ts
const result = arrayql(users)
  .distinct("department")
  .select(["department"])
  .value();
```

Execution pipeline:

```
WHERE → ORDER BY → OFFSET → LIMIT → DISTINCT → SELECT
```

---

## ➕ INSERT

```ts
arrayql(users).insert({
  id: 5,
  name: "Eve",
  age: 28,
  department: "IT"
});
```

---

## ✏️ UPDATE

```ts
arrayql(users)
  .where("department", "=", "IT")
  .update({ age: 40 });
```

---

## ❌ DELETE

```ts
arrayql(users)
  .where("age", "<", 30)
  .delete();
```

---

## 🧠 Logical Model

ArrayQL models conditions as:

```
OR groups of AND conditions
```

Example:

```ts
.where(A)
.where(B)
.orWhere(C)
```

Is interpreted as:

```
(A AND B) OR (C)
```

---

## 🔧 API Overview

### Filtering
- `where(key, operator, value)`
- `orWhere(key, operator, value)`

### Sorting & Pagination
- `orderBy(key, direction?)`
- `limit(count)`
- `offset(count)`

### Projection
- `select(fields)`

### Uniqueness
- `distinct(key)`

### Mutations
- `insert(record | record[])`
- `update(partialObject)`
- `delete()`

---

## 🏗 Design Philosophy

- Predictable execution pipeline
- Stable DISTINCT behavior
- Type-safe generics
- Fluent API design
- Clean logical grouping model

---

## 📜 License

MIT