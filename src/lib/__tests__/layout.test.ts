import { test } from "node:test";
import assert from "node:assert/strict";
import { layoutColumns } from "../layout";

type Item = { id: string; s: number; e: number };
const place = (items: Item[]) =>
  Object.fromEntries(layoutColumns(items, (i) => i.s, (i) => i.e).map((p) => [p.item.id, [p.col, p.cols]]));

test("items that do not overlap each take the full width", () => {
  assert.deepEqual(place([{ id: "a", s: 0, e: 10 }, { id: "b", s: 10, e: 20 }]), { a: [0, 1], b: [0, 1] });
});

test("overlapping items share the width", () => {
  assert.deepEqual(place([{ id: "a", s: 0, e: 10 }, { id: "b", s: 5, e: 15 }]), { a: [0, 2], b: [1, 2] });
});

test("a freed column is reused inside the same group", () => {
  const r = place([
    { id: "long", s: 0, e: 30 },
    { id: "first", s: 0, e: 10 },
    { id: "second", s: 12, e: 20 },
  ]);
  assert.deepEqual(r, { long: [0, 2], first: [1, 2], second: [1, 2] });
});

test("separate groups are sized independently", () => {
  const r = place([
    { id: "a", s: 0, e: 10 },
    { id: "b", s: 0, e: 10 },
    { id: "c", s: 20, e: 30 },
  ]);
  assert.deepEqual(r.c, [0, 1]);
  assert.equal(r.a[1], 2);
});
