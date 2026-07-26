const assert = require("node:assert/strict");
const test = require("node:test");
const {
  bellwrightLoadOrderToPriorityOrder,
  bellwrightPriorityOrderToLoadOrder,
  warhammer3LoadOrderToPriorityOrder,
  warhammer3PriorityOrderToLoadOrder,
  selectHighestPriorityMod
} = require("../priority-order");

test("Bellwright reverses its later-wins engine order for the priority-first UI", () => {
  const gameOrder = ["low", "middle", "high"];
  const priorityOrder = bellwrightLoadOrderToPriorityOrder(gameOrder);

  assert.deepEqual(priorityOrder, ["high", "middle", "low"]);
  assert.deepEqual(bellwrightPriorityOrderToLoadOrder(priorityOrder), gameOrder);
  assert.deepEqual(gameOrder, ["low", "middle", "high"]);
});

test("WH3 preserves its first-is-highest used_mods order", () => {
  const gameOrder = ["high", "middle", "low"];
  const priorityOrder = warhammer3LoadOrderToPriorityOrder(gameOrder);

  assert.deepEqual(priorityOrder, gameOrder);
  assert.notEqual(priorityOrder, gameOrder);
  assert.deepEqual(warhammer3PriorityOrderToLoadOrder(priorityOrder), gameOrder);
});

test("visible priority number one wins a detected overlap", () => {
  const first = { title: "Priority one", loadOrderIndex: 0 };
  const second = { title: "Priority two", loadOrderIndex: 1 };

  assert.equal(selectHighestPriorityMod(first, second), first);
  assert.equal(selectHighestPriorityMod(second, first), first);
  assert.equal(selectHighestPriorityMod(first, { loadOrderIndex: 0 }), null);
});
