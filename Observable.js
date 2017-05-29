
const override = (target, ...overrides) => Object.assign({}, target, ...overrides);
const interceptNext = (observable, nextBuilder) => observable.next
    ? override(observable, { next: nextBuilder(next) })
    : observable;
const interceptUnsubscribe = (subscription, unsubscribe) => Object.assign({}, subscription, {
    unsubscribe() {
        unsubscribe();
        subscription.unsubscribe();
    }
});

class Observable {
    constructor(subscribe) {
        this.subscribe = subscribe;
    }

    select(selector) {
        return new Observable(init =>
            this.subscribe(subscription => interceptNext(init(subscription), next => data => next(selector(data))))
        );
    }

    where(predicate) {
        return new Observable(init =>
            this.subscribe(subscription => interceptNext(init(subscription), next => data => {
                if (predicate(data)) {
                    next(data);
                }
            }))
        );
    }

    append(element) {
        return new Observable(init => {
            let unsubscribed = false;
            let observer = init(interceptUnsubscribe(subscription, () => unsubscribed = true));
            this.subscribe(subscription => override(
                observer,
                {
                    complete() {
                        observer.next && observer.next(element);
                        !unsubscribed && observer.complete && observer.complete();
                    }
                }
            ));
        });
    }

    prepend(element) {
        return new Observable(init => {
            let unsubscribed = false;
            let unsubscribe = () => unsubscribe = true;
            const subscription = {
                unsubscribe: () => unsubscribe()
            }
            const observer = init(subscription);
            observer.next && observer.next(element);
            !unsubscribe && this.subscribe(subscription => {
                unsubscribe = subscription.unsubscribe;
                return observer;
            });
        });
    }

    concat(other) {
        return new Observable(init => {
            let unsubscribed = false;
            
            let subscription = { unsubscribe: () => unsubscribe() };
            const observer = init(subscription);
            if (unsubscribed) {
                return;
            }
            this.subscribe(subscription => {
                let unsubscribe = subscription.unsubscribe;
                const observer = init(override(subscription, { unsubscribe: () => unsubscribe() }));
                return override(observer, {
                    complete() {
                        other.subscribe(subscription => {
                            unsubscribe = subscription.unsubscribe;
                            return observer;
                        });
                    }
                })

            });
        });
    }

    selectMany(selector, resultSelector = undefined) {
        const target = resultSelector
            ? this.select(source => selector(source).select(value => resultSelector(source, value)))
            : this.select(selector);

        return new Observable(init => {
            const subscriptions = new Set();
            const unsubscribe = () => {
                for (const subscription of subscriptions) {
                    subscription.unsubscribe();
                }
            };
            const observer = init({ unsubscribe });
            const removeSubscription = subscription => {
                subscriptions.delete(subscription);
                subscriptions.size === 0 && observer.complete && observer.complete();
            };
            target.subscribe(subscription => {
                subscriptions.add(subscription);
                return override(
                    observer,
                    {
                        next(source) {
                            source.subscribe(subscription => override(
                                observer,
                                { completete() { removeSubscription(subscription); } }
                            ));
                        },
                        complete() { removeSubscription(subscription); }
                    }
                );
            });
        });
    }

    skipWhile(predicate) {
        return new Observable(init => {
            this.subscribe(subscription => {
                const observer = init(subscription);
                if (!observer.next) {
                    return observer;
                }
                let next = (data) => {
                    if (!predicate(data)) {
                        next = observer.next;
                        next(data);
                    }
                };
                return override(observer, { next: data => next(data) });
            });

        });
    }

    skip(count) {
        return new Observable(init => {
            let i = 0;
            this.skipWhile(() => ++i < count).subscribe(init);
        });
    }

    takeWhile(predicate) {
        return new Observable(init => {
            this.subscribe(subscription => {
                const observer = init(subscription);
                if (!observer.next) {
                    return observer;
                }
                return override(observer, {
                    next() {
                        if (predicate(value)) {
                            next(value);
                        } else {
                            subscription.unsubscribe();
                        }
                    }
                });
            });
        });
    }

    take(count) {
        return new Observable(init => {
            let i = 0;
            this.takeWhile(() => ++i < count).subscribe(init);
        });
    }

    distinct(keySelector = undefined) {
        if (keySelector) {

        } else {
            
        }
    }
}

class Subscriptions {
    constructor(observer) {
        this.subscriptions = new Set();
        this.unsubscribed = false;
        this.subscription = {
            unsubscribe: () => {
                this.unsubscribed = true;
                for (const subscription of [...this.subscriptions]) {
                    subscription.unsubscribe();
                }
                this.subscriptions.clear();

            }
        };
    }

    add(subscription) {
        this.subscriptions.add(subscription);
        return this.subscription;
    }
}