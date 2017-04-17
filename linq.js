'use strict';
const pair = (first, second) => [first, second];
class Enumerable {
    constructor(iterator) {
        this[Symbol.iterator] = iterator;
    }

    concat(other) {
        const self = this;
        return new Enumerable(function* () {
            yield* self;
            yield* other;
        });
    }

    select(selector) {
        const self = this;
        return new Enumerable(function* () {
            let index = 0;
            for (const value of self) {
                yield selector(value, index++);
            }
        });
    }

    selectMany(selector, resultSelector = undefined) {
        const target = resultSelector
            ? this.select(function* (item, idx) {
                const collection = selector(item, idx);
                for (const value of collection) {
                    yield resultSelector(item, value);
                }
            })
            : this.select(selector);

        return new Enumerable(function* () {
            for (const collection of target) {
                yield* collection;
            }
        });
    }

    skip(count) {
        const self = this;
        return new Enumerable(function* () {
            let i = count, done, value;
            const iterator = self[Symbol.iterator]();
            while (i-- > 0 && ({ done, value } = iterator.next(), !done));
            yield* iterator;
        });
    }

    skipWhile(predicate) {
        const self = this;
        return new Enumerable(function* () {
            let i = 0, done, value;
            const iterator = self[Symbol.iterator]();
            while ({ done, value } = iterator.next(), !done && predicate(value, i++));
            if (!done) {
                yield value;
                yield* iterator;
            }
        });
    }

    take(count) {
        const self = this;
        return new Enumerable(function* () {
            let i = count, done, value;
            const iterator = self[Symbol.iterator]();
            while (i > 0 && ({done, value} = iterator.next(), !done)) {
                yield value;
            }
        });
    }

    takeWhile(predicate) {
        const self = this;
        return new Enumerable(function* () {
            let i = 0, done, value;
            const iterator = self[Symbol.iterator]();
            while ({done, value} = iterator.next(), !done && predicate(value, i++)) {
                yield value;
            }
        });
    }

    where(predicate) {
        const self = this;
        return new Enumerable(function* () {
            let i = 0;
            for (const value of self) {
                if (predicate(value, i++)) {
                    yield value;
                }
            }
        });
    }

    zip(other, selector = pair) {
        const self = this;
        return new Enumerable(function* () {
            const iterator = other[Symbol.iterator]();
            let idx = 0, value, done;
            for (const firstValue of self) {
                if ({done, value} = iterator.next(), !done) {
                    yield selector(first, value, idx++);
                } else {
                    return;
                }
            }
        });
    }



    static from(iterable) {
        return new Enumerable(() => iterable[Symbol.iterator]());
    }

    static range(start, end) {
        return new Enumerable(function* () {
            for (let i = start; i < end; i++) {
                yield i;
            }
        });
    }
}
