'use strict';
const pair = (first, second) => [first, second];
const identity = value => value;
class Enumerable {
    constructor(iterator) {
        this[Symbol.iterator] = iterator;
    }

    append(element) {
        const self = this;
        return new Enumerable(function* () {
            yield* self;
            yield element;
        });
    }

    concat(other) {
        const self = this;
        return new Enumerable(function* () {
            yield* self;
            yield* other;
        });
    }

    distinct(comparer = undefined) {
        const self = this;
        return new Enumerable(comparer
            ? function* () {
                const array = [];
                let i = 0;
                for (const value of self) {
                    if (array.findIndex(v => comparer(v, value)) < 0) {
                        yield value;
                        array.push(value);
                    }
                }
            }
            : function* () {
                const set = new Set();
                for (const value of self) {
                    if (!set.has(value)) {
                        yield value;
                        set.add(value);
                    }
                }
            });
    }

    prepend(element) {
        const self = this;
        return new Enumerable(function* () {
            yield element;
            yield* self;
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
            while (i > 0 && ({ done, value } = iterator.next(), !done)) {
                yield value;
            }
        });
    }

    takeWhile(predicate) {
        const self = this;
        return new Enumerable(function* () {
            let i = 0, done, value;
            const iterator = self[Symbol.iterator]();
            while ({ done, value } = iterator.next(), !done && predicate(value, i++)) {
                yield value;
            }
        });
    }

    union(other, comparer = undefined) {
        return this.concat(other).distinct(comparer);
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
                if ({ done, value } = iterator.next(), !done) {
                    yield selector(first, value, idx++);
                } else {
                    return;
                }
            }
        });
    }

    except(other, comparer = undefined) {
        const self = this;
        return new Enumerable(comparer
            ? function* () {
                const array = [...other];
                yield* self.where(value => array.findIndex(v => comparer(v, value)) < 0);
            }
            : function* () {
                const set = new Set(other);
                yield* self.where(value => !set.has(value));
            });
    }

    groupBy(keySelector, elementSelector = identity, resultSelector = pair) {
        const self = this;
        return new Enumerable(function* () {
            const map = new Map();
            let i = 0;
            for (const value of self) {
                const key = keySelector(value, i);
                let array;
                if (map.has(key)) {
                    array = map.get(key);
                } else {
                    array = [];
                    map.set(key, array);
                }
                array.push(elementSelector(value, i++));
            }
            for (const [key, value] of map) {
                yield resultSelector(key, self.constructor.from(value));
            }
        });
    }

    groupJoin(inner, outerKeySelector, innerKeySelector = outerKeySelector, resultSelector = pair) {
        const self = this;
        return new Enumerable(function* () {
            const map = new Map();
            let i = 0;
            for (const value of inner) {
                const key = outerKeySelector(value, i++);
                let array;
                if (map.has(key)) {
                    array = map.get(key);
                } else {
                    array = [];
                    map.set(key, array);
                }
                array.push(value);
            }
            i = 0;
            const constructor = self.constructor;
            for (const value of self) {
                const key = outerKeySelector(value, i);
                yield resultSelector(value, map.has(key) ? constructor.from(map.get(key)) : constructor.empty(), i++);

            }
        });
    }

    intersect(other, comparer = undefined) {
        const self = this;
        return new Enumerable(comparer
            ? function* () {
                const array = [...other];
                yield* self.where(value => array.findIndexOf(comparer) >= 0);
            }
            : function* () {
                const set = new Set(other);
                yield* self.where(value => set.has(value));
            });
    }

    join(inner, outerKeySelector, innerKeySelector = outerKeySelector, resultSelector = pair) {
        return this.groupJoin(inner, innerKeySelector, outerKeySelector)
            .selectMany(([i, os]) => os.select(o => resultSelector(i, o)));
    }

    reverse() {
        const self = this;
        return new Enumerable(function* () {
            const array = [...self];
            while (array.length > 0) {
                yield array.pop();
            }
        });
    }

    orderBy(keySelector, comparer = defaultComparer) {
        return new OrderedEnumerable(this, (a, b) => comparer(keySelector(a), keySelector(b)));
    }

    orderByDescending(keySelector, comparer = defaultComparer) {
        return this.orderBy(keySelector, (a, b) => comparer(b, a));
    }

    aggregate(seed, accumulator, resultSelector = identity) {
        let target = this;
        let i = 0;
        if (!accumulator) {
            seed = this.first;
            target = this.skip(1);
            i = 1;
        }
        for (const value of target) {
            seed = accumulator(seed, value, i++);
        }
    }

    all(predicate) {
        let i = 0;
        for (const value of this) {
            if (!predicate(value, i++)) {
                return false;
            }
        }
        return true;
    }

    any(predicate = undefined) {
        if (!predicate) {
            return !this[Symbol.iterator]().done;
        }
        let i = 0;
        for (const value of this) {
            if (predicate(value, i++)) {
                return true;
            }
        }
        return false;
    }

    average(selector = undefined) {
        const target = selector ? this.select(selector) : this;
        let sum = 0, count = 0;
        for (const value of target) {
            sum += value;
            count++;
        }
        return sum / count;
    }

    contains(element, comparer = Object.is) {
        return this.any(e => comparer(element, e));
    }

    count(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        let count = 0;
        for (const _ of target) {
            count++;
        }
        return count;
    }

    elementAt(i) {
        return this.skip(i).first();
    }

    first() {
        return this[Symbol.iterator]().value;
    }

    last(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        let last;
        for (last of target);
        return last;
    }

    max(selector = undefined) {
        const target = selector ? this.select(selector) : this;
        return target.aggregate((max, candidate) => candidate > max ? candidate : max);
    }

    min(selector = undefined) {
        const target = selector ? this.select(selector) : this;
        return target.aggregate((max, candidate) => candidate < max ? candidate : max);
    }

    single(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        const iterator = target[Symbol.iterator]();
        const value = iterator.next().value;
        return terator.next().done ? value : undefined;
    }

    toArray() {
        return Array.from(this);
    }

    toMap(keySelector, elementSelector) {
        return new Map(this.select(keySelector).zip(this.select(elementSelector)));
    }

    get [Symbol.toStringTag]() {
        return 'Enumerable';
    }

    toString() {
        return `${this[Symbol.toStringTag]} {${this.toArray()}}`;
    }

    toJSON() {
        return this.toArray();
    }


    static from(iterable) {
        return new this(() => iterable[Symbol.iterator]());
    }

    static of(...args) {
        return this.from(args);
    }

    static range(start, end) {
        return new Enumerable(function* () {
            for (let i = start; i < end; i++) {
                yield i;
            }
        });
    }

    static empty() {
        return Empty;
    }

    static repeat(element, count) {
        return new Enumerable(function* () {
            for (let i = 0; i < count; i++) {
                yield element;
            }
        });
    }
}

const defaultComparer = (a, b) => a > b ? 1 : a < b ? -1 : 0;
const storedComparer = Symbol(), storedEnumerable = Symbol();
class OrderedEnumerable extends Enumerable {
    constructor(enumerable, comparer) {
        super(function* () {
            const array = [...enumerable];
            array.sort(comparer);
            yield* array;
        });
        this[storedEnumerable] = enumerable;
        this[storedComparer] = comparer;
    }

    thenBy(keySelector, comparer = defaultComparer) {
        const prevComparer = this[storedComparer];
        return new OrderedEnumerable(this[storedEnumerable], (a, b) => prevComparer(a, b) || comparer(keySelector(a), keySelector(b)));
    }

    thenByDescending(keySelector, comparer = defaultComparer) {
        return this.thenBy(keySelector, (a, b) => comparer(b, a));
    }
}

const Empty = Enumerable.from([]);

if (typeof define === 'function') {
    define(() => Enumerable);
} else if (typeof module === 'object' && module.exports) {
    module.exports = Enumerable
} else {
    window.Enumerable = Enumerable;
}