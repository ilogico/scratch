'use strict';

class Observable {
    constructor(subscribe) {
        this.subscribe = subscribe;
    }

    select(mapper) {
        return new Observable(observer => this.subscribe(override(observer, { next: value => observer.next(mapper(value)) })));
    }

    where(predicate) {
        return new Observable(observer => this.subscribe(override(observer, {
            next(value) {
                if (predicate(value)) {
                    observer.next(value)
                }
            }
        })));
    }

    take(n) {
        return new Observable(observer => {
            let i = 0;
            const subscription = this.subscribe(override(observer, {
                next: value => {
                    observer.next(value);
                    if (++i >= n) {
                        subscription.unsubscribe();
                        if (typeof observer.complete === 'function') {
                            observer.complete();
                        }
                    }
                }
            }));
            return subscription;
        });
    }

    skip(n) {
        return new Observable(observer => {
            let i = 0;
            let unsubscribe = null;
            const subscription = this.subscribe(override(observer, {
                next: value => {
                    if (++i > n) {
                        unsubscribe();
                        unsubscribe = this.subscribe(observer).unsubscribe;
                        observer.next(value);
                    }
                }
            }));

            unsubscribe = subscription.unsubscribe;
            return override(subscription, { unsubscribe: () => unsubscribe() });
        });
    }

    skip(n) {
        return new Observable(observer => {
            let i = 0;

            let unsubscribe = null;
            const subscription = this.subscribe(override(observer, {
                next: value => {
                    if (i++ >= n) {
                        unsubscribe();
                        unsubscribe = this.subscribe(observer).unsubscribe;
                    }
                }
            }));

            unsubscribe = subscription.unsubscribe;
            return override(subscription, { unsubscribe() { unsubscribe(); } });

        });
    }

    forEach(action) {
        return new Promise((accept, reject) => this.subscribe({
            next: action,
            complete: accept,
            error: reject
        }));
    }


    catch(handler) {
        return new Observable(observer => this.subscribe(override(observer, { error: err => handler(err) })));
    }

    then(continuation, errorHandler) {
        const promise = new Promise((accept, reject) => {
            this.subscribe({
                complete: accept,
                error: reject
            });
        });
        return promise.then(continuation, errorHandler);
    }

    toEvent() {
        return new Event(dispatch => this.subscribe({ next: dispatch }));
    }

    static merge(...observables) {
        return new Observable(observer => {
            const subscriptions = observables.map(o => o.subscribe(observer));
            return {
                unsubscribe() {
                    subscriptions.forEach(s => s.unsubscribe());
                }
            };
        });
    }
}

class Event extends Observable {
    constructor(init) {
        const subscribers = new Set();

        super(observer => {
            subscribers.add(observer);
            return { unsubscribe: () => subscribers.delete(observer) };
        });

        init(arg => {
            for (const { next } of [...subscribers]) {
                next(arg);
            }
        })
    }
}
const makeDispatcher = methodBuilder => ({
    next: methodBuilder('next'),
    complete: methodBuilder('complete'),
    error: methodBuilder('error')
});

const hotObservable = init => {
    const subscribers = new Set();
    const dispatcher = makeDispatcher(method => value => [...subscribers].filter(s => method in s).forEach(s => s[method](value)));
    init(dispatcher);
    return new Observable(subscriber => {
        subscribers.add(observer);
        return {
            unsubscribe() {
                subscribers.delete(observer);
            }
        };
    });
}
const coldObservable = (start, stop) => {
    const subscribers = new Set();
    const dispatcher = makeDispatcher(method => value => [...subscribers].filter(s => method in s).forEach(s => s[method](value)));
    return new Observable(observer => {
        const wasEmpty = subscribers.size === 0;
        subscribers.add(observer);
        if (wasEmpty && subscribers.size > 0) {
            start(dispatcher);
        }
        return {
            unsubscribe() {
                const wasEmpty = subscribers.size === 0;
                subscribers.delete(observer);
                if (!wasEmpty && subscribers.size === 0) {
                    stop();
                }
            }
        };
    });
};



const override = (receiver, replacements) => {
    const result = {};
    for (const method of Object.keys(receiver)) {
        result[method] = (method in replacements ? replacements : receiver)[method];
    }
    return result;
};

const interval = milliseconds => {
    let timer = null;
    return coldObservable(
        dispatcher => timer = setInterval(dispatcher.next, milliseconds),
        () => {
            clearInterval(timer);
            timer = null;
        }
    );
}

interval(500).select(o => o).catch(e => {}).then(() => {})

let i = 0;
const t = interval(1000)
    .select(() => i++)
    .skip(5)
    .take(5)
    .forEach(console.log)
    .then(() => console.log("Finished!!"));

