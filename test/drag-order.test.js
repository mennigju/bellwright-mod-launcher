const assert = require("node:assert/strict");
const test = require("node:test");
const { reorderKeys } = require("../renderer/drag-order");

test("filtered drop inserts immediately after the visible anchor in the complete order", () => {
  const completeOrder = ["visible-one", "hidden-a", "visible-two", "hidden-b", "dragged", "visible-three"];
  assert.deepEqual(
    reorderKeys(completeOrder, "dragged", { referenceKey: "visible-two", position: "after" }),
    ["visible-one", "hidden-a", "visible-two", "dragged", "hidden-b", "visible-three"]
  );
});

test("filtered drop inserts before the visible anchor without disturbing hidden mods", () => {
  const completeOrder = ["hidden-a", "visible-one", "hidden-b", "dragged", "visible-two"];
  assert.deepEqual(
    reorderKeys(completeOrder, "dragged", { referenceKey: "visible-one", position: "before" }),
    ["hidden-a", "dragged", "visible-one", "hidden-b", "visible-two"]
  );
});

test("dropping on the dragged card is stable and a blank-area drop moves it to the end", () => {
  const completeOrder = ["one", "dragged", "two"];
  assert.deepEqual(
    reorderKeys(completeOrder, "dragged", { referenceKey: "dragged", position: "after" }),
    completeOrder
  );
  assert.deepEqual(reorderKeys(completeOrder, "dragged"), ["one", "two", "dragged"]);
});
