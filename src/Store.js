'use strict';

const clone = (target, ...overrides) => Object.assign({}, target, ...overrides);

class ObservableSet extends Set {
    constructor(...args) {
        super(...args);
        this.elementAdded = new Event();
        this.elementDeleted = new Event();
        this.changed = Event.merge(this.elmentAdded, this.elementDeleted).select(() => this);
    }

    add(element) {
        const hadElement = this.has(element);
        const result = super.add(element);
        if (!hadElement) {
            this.elementAdded.dispatch(element);
        }
        return result;
    }

    delete(element) {
        const hadElement = this.has(element);
        const result = super.delete(element);
        if (hadElement) {
            this.elementDeleted.dispatch(element);
        }
        return result;
    }
}

class ObservableMap extends Map {
    constructor(...args) {
        super(...args);
        this.elementSet = new Event();
        this.elementDeleted = new Event();
        this.changed = Event.merge(this.elementSet, this.elementDeleted);
    }

    set(key, value) {
        let old = undefined;
        const changed = !this.has(key) || !Object.is(old = this.get(key), value);
        const result = super(key, value);
        if (changed) {
            this.elementSet.dispatch({ key, value, old });
        }
        return result;
    }

    delete(key) {
        const had = this.has(key);
        const result = super.delete(key);
        if (had) {
            this.elementDeleted.dispatch(key);
        }
        return result;
    }
}

class Store {
    constructor() {
        this.state = {};
        this.stateChanged = new Event();

        this.valueSubscribers = new Map();
    }

    value(key) {
        const { valueSubscribers } = this;
        if (!valueSubscribers.has(key)) {
            let subscription = null;
            const observable = coldObservable(
                dispatch =>
                    subscription = this.stateChanged
                        .where(({ state, old }) => !Object.is(state[key], old[key]))
                        .subscribe({ next: ({ state, old }) => dispatch('next', { value: state[key], old: old[key] }) }),
                () => {
                    subscription.unsubscribe();
                    valueSubscribers.delete(key);
                }
            );
            valueSubscribers.set(key, observable);
        }
        return valueSubscribers.get(key);
    }

    setState(state) {
        const oldState = this.state;
        this.state = state;
        this.stateChanged.dispatch({ state, old });
    }

    updateState(changes) {
        const oldState = this.state;
        const state = Object.assign({}, oldState, changes);
        for (const [key, value] of Object.entries(state)) {
            if (typeof value === 'undefined') {
                delete state[key];
            }
        }
        this.stateChanged.dispatch({ state, old });
    }
}
