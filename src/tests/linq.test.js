const { Enumerable } = require('../linq.js');

test("from and toArray work as expected", () => {
    const e = Enumerable.from([1, 2, 3, 4]);
    expect(e.toArray()).toBeInstanceOf(Array);
});

test("range produces sequence of numbers", () => {
    expect(Enumerable.range(3, 6).toArray())
        .toEqual([3, 4, 5]);
});

test("... spreads the enumerable in an array", () => {
    expect([...Enumerable.range(1, 3)])
        .toEqual([1, 2])
});

describe("zip", () => {
    it("zip pairs items", () => {
        const e = Enumerable.from([1, 2, 3]).zip([4, 5, 6]);
        expect([...e])
            .toEqual([[1, 4], [2, 5], [3, 6]]);
    });

    it("uses the selector when provided", () => {
        const e = Enumerable.from([1, 2, 3])
            .zip([4, 5, 6], (left, right) => ({ left, right }));
        expect([...e])
            .toEqual([
                { left: 1, right: 4 },
                { left: 2, right: 5 },
                { left: 3, right: 6 }
            ]);
    });

    it("yields as many items as the shortest iterable", () => {
        expect([...Enumerable.from([1, 2]).zip([3, 4, 5])])
            .toEqual([[1, 3], [2, 4]]);
        expect([...Enumerable.from([1, 2, 3]).zip([4, 5])])
            .toEqual([[1, 4], [2, 5]]);
    });

});

test("where filters items", () => {
    const e = Enumerable.from([1, 2, 3]).where(v => v % 2 !== 0);
    expect([...e])
        .toEqual([1, 3]);
});

test("select maps items", () => {
    const e = Enumerable.from([1, 2, 3]).select(v => v * 2);
    expect([...e])
        .toEqual([2, 4, 6]);
});

test("append adds one more item", () => {
    const e = Enumerable.from([1, 2, 3]).append(4);
    expect([...e])
        .toEqual([1, 2, 3, 4]);
});

test("concat appends all items", () => {
    const e = Enumerable.from([1, 2, 3])
        .concat([4, 5, 6]);
    expect([...e])
        .toEqual([1, 2, 3, 4, 5, 6]);
});

test("prepend adds one item at the front", () => {
    const e = Enumerable.from([1, 2, 3])
        .prepend(0);
    expect([...e])
        .toEqual([0, 1, 2, 3]);
});

test("distinct removes duplicates", () => {
    const e = Enumerable.from([1, 1, 2, 3, 2, 3])
        .distinct();
    expect([...e])
        .toEqual([1, 2, 3]);
});

describe("selectMany", () => {
    it("flattens enumerables", () => {
        const e = Enumerable.from([[1, 2], [3, 4]])
            .selectMany();
        expect([...e])
            .toEqual([1, 2, 3, 4]);
    });

    it("uses the selector and resultSelector", () => {
        const e = Enumerable.from([1, 2, 3])
            .selectMany(
            value => Enumerable.range(0, value),
            (original, generated) => `${generated}/${original}`
            );
        expect([...e])
            .toEqual([
                '0/1',
                '0/2', '1/2',
                '0/3', '1/3', '2/3'
            ]);
    });
});

test("skip does not yield the first n numbers", () => {
    const e = Enumerable.from([1, 2, 3, 4, 5, 6])
        .skip(3);
    expect([...e]).
        toEqual([4, 5, 6]);
});

test("take only yields the first n numbers", () => {
    const e = Enumerable.from([1, 2, 3, 4, 5, 6])
        .take(3);
    expect([...e]).
        toEqual([1, 2, 3]);
});

test("skipWhile only starts yielding when predicate first fails", () => {
    const e = Enumerable.from([1, 2, 3, 4, 3, 2, 1])
        .skipWhile(v => v < 4);
    expect([...e])
        .toEqual([4, 3, 2, 1]);
});

test("takeWhile stops yielding when predicate fails", () => {
    const e = Enumerable.from([1, 2, 3, 4, 3, 2, 1])
        .takeWhile(v => v < 4);
    expect([...e])
        .toEqual([1, 2, 3]);
});

test("union yields both enumerables withour duplicates", () => {
    const e = Enumerable.from([1, 2, 3, 4])
        .union([3, 4, 5, 6]);
    expect([...e])
        .toEqual([1, 2, 3, 4, 5, 6]);
});

describe("except", () => {
    it("excludes the items yielded by the other iterable", () => {
        const e = Enumerable.from([1, 2, 3, 4, 5, 6])
            .except([2, 4, 6]);
        expect([...e])
            .toEqual([1, 3, 5]);
    });

    it("uses the provided keySelector", () => {
        const e = Enumerable.range(1, 7)
            .except([0, 1], v => v % 3);
        expect([...e])
            .toEqual([2, 5]);
    });
});

describe("groupBy", () => {
    it("groups by key", () => {
        const e = Enumerable.range(0, 4)
            .groupBy(v => v % 2);
        expect([...e])
            .toEqual([
                [0, [0, 2]],
                [1, [1, 3]]
            ]);
    });

    it("projects the elements while grouping", () => {
        const e = Enumerable.range(0, 4)
            .groupBy(v => v % 2, v => v * 2);
        expect([...e])
            .toEqual([
                [0, [0, 4]],
                [1, [2, 6]]
            ]);
    });
});

describe("groupJoin", () => {
    const outer = [{ key: 1, value: 'a' }, { key: 2, value: 'b' }, { key: 1, value: 'c' }];
    const inner = [{ id: 1, value: 'aa' }, { id: 2, value: 'bb' }, { id: 1, value: 'cc' }];

    it("groups elements by key", () => {
        const e = Enumerable.from(outer)
            .groupJoin(
            inner,
            o => o.key,
            i => i.id
            );
        expect([...e])
            .toEqual([
                [{ key: 1, value: 'a' }, [{ id: 1, value: 'aa' }, { id: 1, value: 'cc' }]],
                [{ key: 2, value: 'b' }, [{ id: 2, value: 'bb' }]],
                [{ key: 1, value: 'c' }, [{ id: 1, value: 'aa' }, { id: 1, value: 'cc' }]]
            ]);
    });

    it("supports a custom selector", () => {
        const e = Enumerable.from(outer)
            .groupJoin(
            inner,
            o => o.key,
            i => i.id,
            (o, is, k) => [o.value, is.select(i => i.value).toArray(), k]
            );
        expect([...e])
            .toEqual([
                ['a', ['aa', 'cc'], 1],
                ['b', ['bb'], 2],
                ['c', ['aa', 'cc'], 1]
            ]);
    });

    it("has default innerKeySelector equal to outerKeySelector", () => {
        const e = Enumerable.from(outer)
            .groupJoin(outer, v => v.key);
        expect([...e])
            .toEqual([
                [{ key: 1, value: 'a' }, [{ key: 1, value: 'a' }, { key: 1, value: 'c' }]],
                [{ key: 2, value: 'b' }, [{ key: 2, value: 'b' }]],
                [{ key: 1, value: 'c' }, [{ key: 1, value: 'a' }, { key: 1, value: 'c' }]]
            ]);
    });

    it("yields empty groups when key doesn't exist on inner", () => {
        const e = Enumerable.from([0, 1, 2])
            .groupJoin([0, 1], v => v);
        expect([...e])
            .toEqual([
                [0, [0]],
                [1, [1]],
                [2, []]
            ]);
    });
});

describe("intersect", () => {
    it("only yields distinct elements that exist on both collections", () => {
        const e = Enumerable.from([1, 2, 3, 1, 2])
            .intersect([1, 2]);
        expect([...e])
            .toEqual([1, 2]);
    });

    it("supports keySelector for the outer collection", () => {
        const e = Enumerable.from([1, 2, 3, 1, 2])
            .intersect([2, 4], v => v * 2);
        expect([...e])
            .toEqual([1, 2]);
    });
});

describe("join", () => {
    it("performs an inner join", () => {
        const e = Enumerable.from([1, 2, 3])
            .join([2, 3, 4], v => v);console.log([...e])
        expect([...e])
            .toEqual([
                [2, 2],
                [3, 3]
            ]);
    });
});