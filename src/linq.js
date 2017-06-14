'use strict';

 
const pair = (first, second) => [first, second];

const identity = value => value;
const defaultGrouper = (key, values) => [key, [...values]];

/**
 * Base class containing the combinator methods.
 * Methods that return an Enumerable are lazy,
 * but can sometimes completely evaluate an Enumerable before returnin the first element.
 * For example: reverse() must traverse through all the elements before returning the first one.
 * @implements Iterable
 */
class Enumerable {
    /**
     * The constructor is meant to be called internally or by sub-classes.
     * However it's reasonable to call it with a generator function, or any function that returns an iterator.
     * @protected
     * @param {function(): Iterator} iterator 
     */
    constructor(iterator) {
        this[Symbol.iterator] = iterator;
    }

    /**
     * @returns {Iterator}
     */
    * [Symbol.iterator]() {}

    /**
     * Returns a new Enumerable with the element appended.
     * @param {any} element
     * @returns {Enumerable}
     */
    append(element) {
        const self = this;
        return new Enumerable(function* () {
            yield* self;
            yield element;
        });
    }

    /**
     * Returns a new Enumerable wich yields all elements of this one and then all elements of the other.
     * @param {Iterable} other
     * @returns {Enumerable}
     */
    concat(other) {
        const self = this;
        return new Enumerable(function* () {
            yield* self;
            yield* other;
        });
    }

    /**
     * Returns a new Enumerable without duplicates.
     * If an equality comparer is supplied, it will be used to determine if the elements are equal.
     * Otherwise, a Set will be used to track duplicates, which should be more efficient. Sets use Object.is for comparison.
     * @param {function(any): any} [keySelector]
     * @returns {Enumerable}
     */
    distinct(keySelector = identity) {
        const self = this;
        return new Enumerable(function* () {
                const set = new Set();
                for (const value of self) {
                    const key = keySelector(value);
                    if (!set.has(key)) {
                        yield value;
                        set.add(key);
                    }
                }
            });
    }

    /**
     * Returns a new Enumerable that yields element and then all the elements of this Enumerable.
     * @param {any} element 
     * @returns {Enumerable}
     */
    prepend(element) {
        const self = this;
        return new Enumerable(function* () {
            yield element;
            yield* self;
        });
    }

    /**
     * Returns a new Enumerable that yields all the elements of this Enumerable projected (ie. transformed) by the selector function.
     * @param {function(any, number): any} selector
     * @returns {Enumerable}
     */
    select(selector) {
        const self = this;
        return new Enumerable(function* () {
            let index = 0;
            for (const value of self) {
                yield selector(value, index++);
            }
        });
    }

    /**
     * Given a selector that returns an Iterable object, selectMany returns an Enumerable that maps the elements of this Enumerable using that selector and flattens the result.
     * The resultSelector can be used to map the resulting elements when knowledge of the originating item is required (which wouldn't be possible by chaining another select, for example).
     * @param {function(any, number): any} selector 
     * @param {function(any, any): any} resultSelector 
     * @returns {Enumerable}
     */
    selectMany(selector = identity, resultSelector = undefined) {
        const target = resultSelector
            ? this.select(function* (item, idx) {
                for (const value of selector(item, idx)) {
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

    /**
     * Returns a new Enumerable that skips an amount of items and yields the remaining ones.
     * @param {number} count
     * @returns {Enumerable}
     */
    skip(count) {
        const self = this;
        return new Enumerable(function* () {
            let i = count, done, value;
            const iterator = self[Symbol.iterator]();
            while (i-- > 0 && ({ done, value } = iterator.next(), !done));
            while(({ done, value } = iterator.next(), !done)) {
                yield value;
            }
            return value;
        });
    }

    /**
     * Returns a new Enumerable that skips elements while predicate returns true.
     * @param {function(any, number): any} predicate 
     * @returns {Enumerable}
     */
    skipWhile(predicate) {
        const self = this;
        return new Enumerable(function* () {
            let i = 0, done, value;
            const iterator = self[Symbol.iterator]();
            while ({ done, value } = iterator.next(), !done && predicate(value, i++));
            while (!done) {
                yield value;
                ({ done, value } = iterator.next()); 
            }
            return value;
        });
    }

    /**
     * Returns a new Enumerable that yields the first 'count' elements of this Enumerable, if they exist.
     * @param {number} count
     * @returns {Enumerable}
     */
    take(count) {
        const self = this;
        return new Enumerable(function* () {
            let i = count, done, value;
            const iterator = self[Symbol.iterator]();
            while (i-- > 0 && ({ done, value } = iterator.next(), !done)) {
                yield value;
            }
        });
    }

    /**
     * Returns a new Enumerable that yields the elements of this Enumerable until the predicate returns false.
     * @param {function(any, number): any} predicate
     * @returns {Enumerable}
     */
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

    /**
     * This method is the equivalent of calling {@linkcode Enumerable#concat concat}(other).{@linkcode Enumerable#distinct distinct}(comparer)
     * @param {Iterable} other 
     * @param {function(any): any} comparer
     * @returns {Enumerable}
     */
    union(other, comparer = undefined) {
        return this.concat(other).distinct(comparer);
    }

    /**
     * Returns a new Enumerable that only yields the elements approved by the predicate.
     * @param {function(any, number): any} predicate
     * @returns {Enumerable}
     */
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

    /**
     * Returns a new Enumerable that combines the elements of this Enumerable with the elements the other Iterable using the selector.
     * If no selector is provided, the elements will be combined in and array of two elements.
     * The length of the returning Enumerable will be the length of the smallest of the zipped enumerables.
     * @param {Iterable} other 
      @param {function(any, any, number):} [selector=pair]
     * @returns {Enumerable}
     */
    zip(other, selector = pair) {
        const self = this;
        return new Enumerable(function* () {
            const iterator = other[Symbol.iterator]();
            let idx = 0, value, done;
            for (const first of self) {
                if ({ done, value } = iterator.next(), !done) {
                    yield selector(first, value, idx++);
                } else {
                    return;
                }
            }
        });
    }

    /**
     * Returns an Enumerable that yields the elements of this Enumerable whose keys aren't contained in the other Iterable.
     * This means the second Enumerable must be completely traversed before the first element is yielded.
     * @param {Iterable} other 
     * @param {function(any): any} [select] 
     * @returns {Enumerable}
     */
    except(other, keySelect = identity) {
        const self = this;
        return new Enumerable(function* () {
                const set = new Set(other);
                yield* self.where(value => !set.has(keySelect(value)));
            });
    }

    /**
     * Returns an Enumerable that yields groups of elements of this Enumerable.
     * The keySelector is used to generate a key for each element.
     * The optional elementSelector is used to project the elements before grouping.
     * The groups are constructed in the form [key, [...values]]
     * @param {function(any): any} keySelector 
     * @param {function(any, number): any} [elementSelector=identity] 
     * @param {function(any, any): any} [resultSelector=pair] 
     * @returns {Enumerable}
     */
    groupBy(keySelector, elementSelector = identity) {
        const self = this;
        return new Enumerable(function* () {
            const map = new Map();
            let i = 0;
            for (const value of self) {
                const key = keySelector(value);
                let array;
                if (map.has(key)) {
                    array = map.get(key);
                } else {
                    array = [];
                    map.set(key, array);
                }
                array.push(elementSelector(value, i++));
            }
            yield* map;
        });
    }

    /**
     * Returns an Enumerable that groups the inner Iterable using the innerKeySelector and then, for each element of this Enumerable, yields that element combined with a group generated from the inner Enumerable.
     * The elements of this Enumerable are matched with the (possibly empy) group from the inner Enumerable comparing the key generated with outerKeySelector(outerElement) with the key generated with innerKeySelector(innerElement).
     * The element is then combined with the group using the resultSelector.
     * The resultSelector will receive the element as its first argument, an Enumerable that yields the elements of the group as the second argument, and the key as the the third argument.
     * @param {Iterable} inner 
     * @param {function(any): any} outerKeySelector 
     * @param {function(any): any} [innerKeySelector=outerKeySelector] 
     * @param {function(any, Enumerable, any): any} [resultSelector=pair]
     */
    groupJoin(inner, outerKeySelector, innerKeySelector = outerKeySelector, resultSelector = defaultGrouper) {
        const self = this;
        return new Enumerable(function* () {
            const map = new Map();
            for (const value of inner) {
                const key = innerKeySelector(value);
                let array;
                if (map.has(key)) {
                    array = map.get(key);
                } else {
                    array = [];
                    map.set(key, array);
                }
                array.push(value);
            }

            for (const value of self) {
                const key = outerKeySelector(value);
                yield resultSelector(value, map.has(key) ? Enumerable.from(map.get(key)) : Enumerable.empty(), key);

            }
        });
    }

    /**
     * Returns an Enumerable that yields the elements of this Enumerable whose keys exist in the other Iterable.
     * @param {Iterable} other 
     * @param {function(any): any} [keySelect] 
     * @returns {Enumerable}
     */
    intersect(other, keySelect = identity) {
        const self = this;
        return new Enumerable(function* () {
                const set = new Set(other);
                yield* self.where(value => set.has(keySelect(value))).distinct(keySelect);
            });
    }

    /**
     * Returns an Enumerable that, for each element 'inner' of this Enumerable, for each element 'outer' of the other Iterable where outerKeySelector(outer) equals innerKeySelector(inner), yields a value produced by resultSelector(outer, inner).
     * In other words, this produces a Left Inner Join.
     * @param {Iterable} inner 
     * @param {function(any): any} outerKeySelector 
     * @param {function(any): any} [innerKeySelector=outerKeySelector] 
     * @param {function(any, any): any} [resultSelector=pair] 
     * @returns {Enumerable}
     */
    join(inner, outerKeySelector, innerKeySelector = outerKeySelector, resultSelector = pair) {
        return this.groupJoin(inner, outerKeySelector, innerKeySelector, identity)
            .selectMany(([o, is]) => is.select(i => resultSelector(o, i)));
    }

    /**
     * Returns an Enumerable that yields all the elements of this Enumerable in reverse order.
     * @returns {Enumerable}
     */
    reverse() {
        const self = this;
        return new Enumerable(function* () {
            const array = [...self];
            while (array.length > 0) {
                yield array.pop();
            }
        });
    }

    /**
     * Returns an {@link OrderedEnumerable} that yields the elements of this Enumerable ordered by the key selected by keySelector.
     * A custom comparer can be supplied.
     * The custom comparer should be supplied whenever the keys selected by keySelector or not numbers or strings, since no other JavaScript values produce useful results when compared with > and <.
     * @param {function(any): any} keySelector 
     * @param {function(any, any): number} [comparer=defaultComparer] 
     * @returns {OrderedEnumerable}
     */
    orderBy(keySelector, comparer = defaultComparer) {
        return new OrderedEnumerable(this, (a, b) => comparer(keySelector(a), keySelector(b)));
    }

    /**
     * Like {@link Enumerable#orderBy orderBy} but with the result of the comparisons reversed.
     * @param {function(any): any} keySelector 
     * @param {function(any, any): number} [comparer=defaultComparer]
     * @returns {OrderedEnumerable}
     */
    orderByDescending(keySelector, comparer = defaultComparer) {
        return this.orderBy(keySelector, (a, b) => comparer(b, a));
    }

    /**
     * Applies an accumulator to all the elements yielded by this Enumerable and returns the result.
     * The accumulator is a function that receives the previous state and the current element and returns a new state.
     * The final state is returned.
     * The seed is the initial state.
     * If there is only one argument, the first yielded element is considered the initial state and the first argument is considered the accumulator.
     * The first argument is optional to mimic C#.
     * It's recommended to always supply the seed.
     * @param {any} [seed] 
     * @param {function(any, any, number): any} accumulator 
     * @returns {any} 
     */
    aggregate(seed, accumulator) {
        let target = this;
        let i = 0;
        if (!accumulator) {
            const iterator = this[Symbol.iterator]();
            seed = iterator.next().value;
            target = new this.constructor[Symbol.species](function* () {
                let done, value;
                while ({done, value} = iterator.next(), !done) {
                    yield value;
                }
            });
            i = 1;
        }
        for (const value of target) {
            seed = accumulator(seed, value, i++);
        }
        return seed;
    }

    /**
     * Returns true if all the elements yielded by this Enumerable pass the predicate (this also happens when this Enumerable yields no elements).
     * Returns false otherwise.
     * @param {function(any, number): any} predicate
     * @returns {boolean}
     */
    all(predicate) {
        let i = 0;
        for (const value of this) {
            if (!predicate(value, i++)) {
                return false;
            }
        }
        return true;
    }

    /**(
     * Returns true if at least one element yielded by this Enumerable pass the predicate.
     * If the predicate is not supplied, returns true if the collection has at least one element (as if the predicate were always true).
     * Returns false otherwise.
     * @param {function(any, number): any} predicate 
     * @returns {boolean}
     */
    any(predicate = undefined) {
        if (!predicate) {
            return !this[Symbol.iterator]().next().done;
        }
        let i = 0;
        for (const value of this) {
            if (predicate(value, i++)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Assuming the collection contains numbers, returns the average of those numbers.
     * As a convenience, this method accepts a selector as an argument which is equivalent to select(selector).average();
     * @param {function(any, number): any} selector A selector that returns a number
     */
    average(selector = undefined) {
        const target = selector ? this.select(selector) : this;
        let sum = 0, count = 0;
        for (const value of target) {
            sum += value;
            count++;
        }
        return sum / count;
    }

    /**
     * Returns true if this Enumerable yields an element equal to the first argument.
     * A custom comparer can be passed as the second argument. Object.is will be used otherwise.
     * @param {any} element 
     * @param {function(any, any): any} [comparer] 
     * @returns {boolean}
     */
    contains(element, comparer = Object.is) {
        return this.any(e => comparer(element, e));
    }

    /**
     * Returns the number of elements yielded by this Enumerable.
     * If a predicate is given, the count will represent the number of elements for which the predicate returned true.
     * @param {function(any, number): any} [predicate]
     * @returns {number}
     */
    count(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        let count = 0;
        for (const _ of target) {
            count++;
        }
        return count;
    }

    /**
     * Returns the element yielded by this collection at the ith iteraction, index starting at 0.
     * It is basically an alias of skip(i).first();
     * @param {number} i 
     * @returns {any}
     */
    elementAt(i) {
        return this.skip(i).first();
    }

    /**
     * Returns the first element yielded by this Enumerable, or undefined, it it's empty.
     * If a predicate is given, it returns the first element for which the predicates succeeds, which the same as where(predicate).first();
     * @param {function(any, number): any} [predicate]
     * @returns {any}
     */
    first(predicate = undefined) {
        return (predicate ? this.where(predicate) : this)[Symbol.iterator]().next().value;
    }

    /**
     * Returns the last element yielded by this Enumerable, or undefined, it it's empty.
     * If a predicate is given, it returns the last element for which the predicates succeeds, which the same as where(predicate).last();
     * @param {function(any, number): any} predicate 
     */
    last(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        let last;
        for (last of target);
        return last;
    }

    /**
     * Assuming this Enumerable yields numbers, max will return the larger of them.
     * A selector that projects the elements of this Enumerable to elements can supplied as a convenience. It's equivalent to select(selector).max()
     * @param {function(any, number): any} [selector] A selector that maps elements yielded by this Enumerable to numbers.
     * @returns {number}
     */
    max(selector = undefined) {
        return Math.max(...(selector ? this.select(selector) : this));
    }

    /**
     * Assuming this Enumerable yields numbers, max will return the smallest of them.
     * A selector that projects the elements of this Enumerable to elements can supplied as a convenience. It's equivalent to select(selector).min()
     * @param {function(any, number): any} [selector] A selector that maps elements yielded by this Enumerable to numbers.
     * @returns {number}
     */
    min(selector = undefined) {
        return Math.min(...(selector ? this.select(selector) : this));
    }

    /**
     * Returns the only element yielded by this Enumerable, or undefined if 0 or more than 1 elements are yielded.
     * The elements will be previously filtered with the given predicate, if supplied.
     * @param {function(any, number): any} predicate 
     * @returns {any}
     */
    single(predicate = undefined) {
        const target = predicate ? this.where(predicate) : this;
        const iterator = target[Symbol.iterator]();
        const value = iterator.next().value;
        return iterator.next().done ? value : undefined;
    }

    /**
     * Evaluate this enumerable and store the yielded values in an array.
     * Calling enumerable.toArray() is equivalent to Array.from(enumerable) or [...enumerable].
     * @returns {Array}
     */
    toArray() {
        return Array.from(this);
    }

    /**
     * Construct a map using a function to derive a key and a function to derive the element form the elements yielded by this Enumerable.
     * @param {function(any, number): any} keySelector 
     * @param {function(any, number): any} elementSelector 
     */
    toMap(keySelector, elementSelector) {
        return new Map(this.select((value, index) => [keySelector(value, index), elementSelector(value, index)]));
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

    /**
     * Returns an Enumerable that yields the elements yielded by the iterable.
     * @param {Iterable} iterable 
     * @returns {Enumerable}
     */
    static from(iterable) {
        return new this(() => iterable[Symbol.iterator]());
    }

    static of(...args) {
        return this.from(args);
    }

    /**
     * Returns an Enumerable that yields the numbers from start (inclusive) to end (not inclusive).
     * @param {number} start 
     * @param {number} end 
     * @returns {Enumerable}
     */
    static range(start, end) {
        return new Enumerable(function* () {
            for (let i = start; i < end; i++) {
                yield i;
            }
        });
    }

    /**
     * Return an Enumerable that yields no values.
     * @returns {Enumerable}
     */
    static empty() {
        return Empty;
    }

    /**
     * Returns an Enumerable that yields the same element the selected number of times.
     * @param {any} element 
     * @param {number} count 
     * @returns {Enumerable}
     */
    static repeat(element, count) {
        return new Enumerable(function* () {
            for (let i = 0; i < count; i++) {
                yield element;
            }
        });
    }

    static get [Symbol.species]() {
        return this;
    }
}

/**
 * The default comparer works well with numbers and strings.
 * @param {any} a 
 * @param {any} b 
 * @returns {number}
 */
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

    static get [Symbol.species]() {
        return Enumerable;
    }
}

const Empty = new Enumerable(function* () {});

module.exports.Enumerable = Enumerable;
module.exports.from = iterable => Enumerable.from.bind(Enumerable);
