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

    scan(initial, merge) {
        return new Observable(observer => this.subscribe(override(observer, { next: value => observer.next(merge(initial, value)) })));
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
}

class Event extends Observable {
    constructor(init) {
        super(observer => {
            this.subscribers.add(observer);
            return { unsubscribe: () => this.subscribers.delete(observer) };
        });
        this.subscribers = new Set();
        init(arg => {
            const p = Promise.resolve(arg);
            for (const { next } of this.subscribers.values()) {
                p.then(next);
            }
        })
    }


}

const override = (receiver, replacements) => Object.assign({}, receiver, replacements);

const timer = milliseconds => new Event(dispatch => setInterval(dispatch, milliseconds));


let i = 0;
/*const x = timer(1000).select(() => i++).take(5).toEvent();
x.forEach(v => console.log(v));
x.forEach(v => console.log(`replay: ${v}`));*/


timer(2000).select(() => i++).skip(5).take(5).toEvent().forEach(v => console.log(v));

