(function exposeDragOrder(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  } else {
    root.dragOrder = api;
  }
})(typeof window === "object" ? window : globalThis, () => {
  function reorderKeys(keys, draggedKey, placement = null) {
    const original = [...keys];
    if (!original.includes(draggedKey)) {
      return original;
    }
    if (placement?.referenceKey === draggedKey) {
      return original;
    }

    const next = original.filter((key) => key !== draggedKey);
    const referenceIndex = placement?.referenceKey ? next.indexOf(placement.referenceKey) : -1;
    const insertionIndex =
      referenceIndex < 0
        ? next.length
        : placement.position === "before"
          ? referenceIndex
          : referenceIndex + 1;
    next.splice(insertionIndex, 0, draggedKey);
    return next;
  }

  return { reorderKeys };
});
