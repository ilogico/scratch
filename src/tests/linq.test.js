const { Enumerable } = require('../linq.js');

test("toArray returns an array", () => {
    const e = Enumerable.from([1, 2, 3, 4]);

    expect(e.toArray()).toBeInstanceOf(Array);
});