function bellwrightLoadOrderToPriorityOrder(entries = []) {
  return [...entries].reverse();
}

function bellwrightPriorityOrderToLoadOrder(entries = []) {
  return [...entries].reverse();
}

function warhammer3LoadOrderToPriorityOrder(entries = []) {
  return [...entries];
}

function warhammer3PriorityOrderToLoadOrder(entries = []) {
  return [...entries];
}

function selectHighestPriorityMod(left, right) {
  if (
    !Number.isFinite(left?.loadOrderIndex) ||
    !Number.isFinite(right?.loadOrderIndex) ||
    left.loadOrderIndex === right.loadOrderIndex
  ) {
    return null;
  }
  return left.loadOrderIndex < right.loadOrderIndex ? left : right;
}

module.exports = {
  bellwrightLoadOrderToPriorityOrder,
  bellwrightPriorityOrderToLoadOrder,
  warhammer3LoadOrderToPriorityOrder,
  warhammer3PriorityOrderToLoadOrder,
  selectHighestPriorityMod
};
