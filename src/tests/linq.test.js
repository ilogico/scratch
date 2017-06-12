const { Enumerable } = require('../linq.js');

test("toArray returns an array", () => {
    const e = Enumerable.from([1, 2, 3, 4]);
    expect(e.toArray()).toBeInstanceOf(Array);
});

test("zip pairs items", () => {
    const e = Enumerable.from([1, 2, 3]).zip([4, 5, 6]);
    expect(e.toArray())
        .toEqual([[1, 4], [2, 5], [3, 6]]);
});

test("where filters items", () => {
    const e = Enumerable.from([1, 2, 3]).where(v => v % 2 !== 0);
    expect(e.toArray())
        .toEqual([1, 3]);
});

test("select maps items", () => {
    const e = Enumerable.from([1, 2, 3]).select(v => v * 2);
    expect(e.toArray())
        .toEqual([2, 4, 6]);
});