'use strict';

class Params {
    constructor() {
        this.data = new Map();
    }

    has(key) {
        return this.data.has(key);
    }
    append(key, value) {
        if (this.has(key)) {
            this.data.get(key).push(value);
        } else {
            this.data.set(key, [value]);
        }
    }

    delete(key) {
        this.data.delete(key);
    }

    * entries() {
        for (const [key, values] of this.data) {
            for (const value of values) {
                yield [key, value];
            }
        }
    }

    getAll(key) {
        return this.data.get(key) || [];
    }

    get(key) {
        const array = this.getAll(key);
        return array.length > 0 ? array[0] : null;
    }

    keys() {
        return this.data.keys();
    }

    * values() {
        for (const [_, value] of this.entries()) {
            yield value;
        }
    }
}