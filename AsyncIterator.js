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
const alreadyFinished = Symbol();
const storedDoneValue = Symbol();
const storedException = Symbol();
const errored = Symbol();
class AsyncIterator {
    constructor(controller) {
        this[requestQueue] = [];
        this[readyQueue] = [];
        this[alreadyFinished] = false;
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
                this[alreadyFinished] = true;
                const reqQ = this[requestQueue];
                if (reqQ.length > 0) {
                    reqQ.shift().accept({value, done: true});
                    while(reqQ.length > 0) {
                        reqQ.shift().accept({value: undefined, done: true});
                    }
                } else {
                    this[storedDoneValue] = value;
                }
            },
            error: (exception) => 
        });
    }

    
}