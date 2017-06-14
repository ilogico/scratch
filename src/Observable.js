// @ts-check
class Observer {
    constructor(handler) {
        Object.assign(this, handler);
    }

    next() { }
    complete() { }
    error(error) {
        throw error;
    }

    static override(observer, handler) {
        return Object.assign(Object.create(this.prototype), observer, handler);
    }
}

const canceled = Symbol();
class Subscription {
    constructor() {
        this[canceled] = false;
    }
    cancel() {
        this[canceled] = true;
    }

    get canceled() {
        return this[canceled];
    }
}

const replaceSubscription = Symbol();
const currentSubscription = Symbol();
class ReplacebleSubscription extends Subscription {
    constructor(subscription = undefined) {
        super();
        this[currentSubscription] = subscription || new Subscription();
    }

    cancel() {
        this[currentSubscription].cancel();
    }

    get canceled() {
        return this[currentSubscription].canceled;
    }

    [replaceSubscription](subscription) {
        this[currentSubscription] = subscription;
    }
}

const subscriptionSet = Symbol();
const addSubscription = Symbol();
const removeSubscription = Symbol();
const hasSubscribers = Symbol();
class SubscriptionSet extends Subscription {
    constructor(subscription) {
        super();
        this[subscriptionSet] = new Set([subscription]);
    }

    cancel() {
        for (const subscription of this[subscriptionSet]) {
            subscription.cancel();
        }
        super.cancel();
    }

    [addSubscription](subscription) {
        this[subscriptionSet].add(subscription);
    }

    [removeSubscription](subscription) {
        this[subscriptionSet].delete(subscription);
    }

    get [hasSubscribers]() {
        return this[subscriptionSet].size > 0;
    }
}

const override = (observer, build) => Observer.override(observer, build(observer));
const identity = o => o;
const pair = (a, b) => [a, b];

class Observable {
    constructor(subscribe) {
        this.subscribe = subscribe;
    }

    select(select) {
        return new Observable(init => this.subscribe(subscription => override(init(subscription), ({ next }) => ({
            next: data => next(select(data))
        }))));
    }

    where(test) {
        return new Observable(init => this.subscribe(subscription => override(init(subscription), ({ next }) => ({
            next: data => {
                if (test(data)) {
                    next(data);
                }
            }
        }))));
    }

    append(element) {
        return new Observable(init => this.subscribe(subscription => override(init(subscription), ({ next, complete }) => ({
            complete: () => {
                next(element);
                subscription.canceled || complete();
            }
        }))));
    }

    prepend(element) {
        return new Observable(init => {
            const subscription = new ReplacebleSubscription();
            const observer = init(subscription);
            observer.next(element);
            if (!subscription.canceled) {
                this.subscribe(sub => {
                    subscription[replaceSubscription](sub);
                    return observer;
                });
            }
        });
    }

    concat(other) {
        return new Observable(init => this.subscribe(first => {
            const subscription = new ReplacebleSubscription(first);
            override(init(subscription), _ => ({
                complete() {
                    other.subscribe(second => {
                        subscription[replaceSubscription](second)
                    });
                }
            }))
        }));
    }

    selectMany(selector = identity, resultSelector = undefined) {
        const target = resultSelector
            ? this.select(source => selector(source).select(element => resultSelector(source, element)))
            : this.select(selector);
        return new Observable(init => target.subscribe(mainSubscription => {
            const subscription = new SubscriptionSet(mainSubscription);
            const observer = init(subscription);
            const partialCompletion = sub => {
                subscription[removeSubscription](subscription);
                if (!subscription[hasSubscribers]) {
                    observer.complete();
                }
            };
            return override(observer, _ => ({
                next(source) {
                    source.subscribe(sub => override(observer, _ => ({
                        complete: partialCompletion(sub)
                    })))
                },
                complete: () => partialCompletion(mainSubscription)
            }));
        }));
    }

    merge(other) {
        return Observable.from([this, other]).selectMany(identity);
    }

    distinct(keySelector = identity) {
        return new Observable(init => this.subscribe(subscription => {
            const seen = new Set();
            return override(init(subscription, ({ next }) => ({
                next(element) {
                    const key = keySelector(element);
                    if (!seen.has(key)) {
                        seen.add(key);
                        next(element);
                    }
                }
            })));
        }));
    }

    union(other, keySelector = identity) {
        return this.merge(other).distinct(keySelector);
    }

    intersect(other, keySelector = identity) {
        return new Observable(init => {
            const seenHere = new Set();
            const seenThere = new Set();
            return this.where(value => {
                const key = keySelector(value);
                if (seenHere.has(value)) {
                    return false;
                } else {
                    seenHere.add(value);
                    return seenThere.has(value);
                }
            }).merge(other.where(value => {
                const key = keySelector(value);
                if (seenThere.has(value)) {
                    return false;
                } else {
                    seenThere.add(value);
                    return seenHere.has(value);
                }
            })).subscribe(init);
        });
    }

    takeWhile(predicate) {
        return new Observable(init => this.subscribe(subscription => override(init(subscription), ({ next, complete }) => ({
            next: value => {
                if (predicate(value)) {
                    next(value)
                } else {
                    subscription.cancel();
                    complete();
                }
            }
        }))));
    }

    take(count) {
        return new Observable(init => {
            let i = 0;
            return this.takeWhile(() => i++ < count).subscribe(init);
        });
    }

    skipWhile(predicate) {
        return new Observable(init => this.subscribe(subscription => override(init(subscription, ({ next }) => {
            let proxy = value => {
                if (!predicate(value)) {
                    proxy = next;
                    next(value);
                }
            };
            return { next: value => proxy(value) };
        }))));
    }

    skip(count) {
        return new Observable(init => {
            let i = 0;
            return this.skipWhile(() => i++ < count).subscribe(init);
        });
    }

    groupJoin(inner, outerKeySelector, innerKeySelector, resultSelector = pair) {
        return new Observable(init => {
            const observers = [];
        });
    }



    static from(enumerable) {
        return new Observable(init => {
            const subscription = new Subscription();
            const observer = init(subscription);
            const iterator = enumerable[Symbol.iterator]();
            while (!subscription.canceled) {
                try {
                    const { done, value } = iterator.next();
                    if (done) {
                        observer.done();
                    } else {
                        observer.next(value);
                    }
                } catch (error) {
                    observer.error(error);
                }
            }
        });
    }
}

