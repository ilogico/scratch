'use strict';

/**
 * 
 * @param {Stream} stream
 * @returns {AsyncIterator}
 */
const streamToAsyncIterator = stream => new AsyncIterator(({ next, end, error }) => {
    stream.addListener('data', next);
    stream.addListener('error', error);
    stream.addListener('end', end);
});

const streamToColdObservable = stream => {
    let onData = null, onError = null, onEnd = null;
    return coldObservable({
        start(dispatcher) {
            stream.addListener('data', onData = data => dispatcher.next(data));
            stream.addListener('end', onEnd = () => dispatcher.complete());
            stream.addListener('error', onError = error => dispatcher.error(error));
        },
        stop() {
            stream.removeListener('data', onData);
            stream.removeListener('end', onEnd);
            stream.removeListener('error', onError);
            onData = onError = onEnd = null;
        }
    });
};

const streamToHotObservable = stream => hotObservable(dispatcher => {
    stream.addListener('data', data => dispatcher.next(data));
    stream.addListener('end', () => dispatcher.complete());
    stream.addListener('error', error => dispatcher.error(error));
});

const asyncIteratorToHotObservable = iterator => hotObservable(async dispatcher => {
    try {
        let value, done;
        while ({ value, done } = await iterator.next(), !done) {
            dispatcher.next(value);
        }
        dispatcher.complete(value);
    } catch (error) {
        dispatcher.error(value);
    }
});

const asyncIteratorToColdObservable = iterator => {
    let cachedPromise = false;
    let cancel = new Request();
    let wasCanceled = false;
    return coldObservable({
        async start(dispatcher) {
            try {
                let result;
                while (result = await Promise.race([
                    cachedPromise = cachedPromise || iterator.next(),
                    cancel.promise
                ]), !result.done) {
                    if (wasCanceled) {
                        wasCanceled = false;
                        return;
                    }
                    cachedPromise = null;
                    dispatcher.next(result.value);
                }
                dispatcher.complete(result.value);

            } catch (error) {
                dispatcher.error(error);
            }
        },
        stop() {
            wasCanceled = true;
            cancel.accept();
            cancel = new Request();
        }
    });
};