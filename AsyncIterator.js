'use strict';

class Request {
    constructor() {
        this.promise = new Promise((accept, reject) => {
            this.accept = accept;
            this.reject = reject;
        });
    }
}


const requestQueue = Symbol();
const readyQueue = Symbol();
const isFinished = Symbol();
const storedDoneValue = Symbol();
const storedException = Symbol();
const isErrored = Symbol();
class AsyncIterator {
    constructor(controller) {
        this[requestQueue] = [];
        this[readyQueue] = [];
        this[isFinished] = false;
        this[storedDoneValue] = undefined;

        controller({
            next: value => {
                const reqQ = this[requestQueue];
                if (reqQ.length > 0) {
                    reqQ.shift().accept({ value, done: false });
                } else {
                    this[readyQueue].push(value);
                }
            },
            end: (value = undefined) => {
                this[isFinished] = true;
                const reqQ = this[requestQueue];
                if (reqQ.length > 0) {
                    reqQ.shift().accept({ value, done: true });
                    while (reqQ.length > 0) {
                        reqQ.shift().accept({ value: undefined, done: true });
                    }
                } else {
                    this[storedDoneValue] = value;
                }
            },
            error: exception => {
                this[isFinished] = true;
                const reqQ = this[requestQueue];
                if (reqQ.length > 0) {
                    reqQ.shift().reject(exception);
                    while (reqQ.length > 0) {
                        reqQ.shift().accept({ value: undefined, done: true });
                    }
                } else {
                    this[isErrored] = true;
                    this[storedException] = exception;
                }
            }
        });
    }

    next() {
        if (this[isErrored]) {
            const ret = Promise.reject(this[storedException]);
            this[storedException] = undefined;
            this[isErrored] = false;
            return ret;
        } else if (this[isFinished]) {
            const ret = Promise.resolve({ value: this[storedDoneValue], done: true });
            this[storedDoneValue] = undefined;
            return ret;
        } else if (this[readyQueue].length > 0) {
            return Promise.resolve({ value: this[readyQueue].shift(), done: false });
        } else {
            const request = new Request();
            this[requestQueue].push(request);
            return request.promise;
        }
    }
}

let it = new AsyncIterator(({ next, end, error }) => {
    let timer = setInterval(() => {
        let decision = Math.random();
        if (decision > 0.2) {
            next(decision);
            return;
        }
        clearInterval(timer);
        if (decision >= 0.1) {
            end(decision);
        } else {
            error(decision);
        }
    }, 1000);

});

(async () => {
    let value, done;
    try {
        while ({value, done} = await it.next(), !done) {
            console.log(value);
        }
        console.log(`All done! Return value is ${value}`);
    } catch (error) {
        console.log(`Too low! ${error}`);
    }
})();