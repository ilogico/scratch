'use strict';

const clone = (object, overrides) => Object.assign({}, object, overrides);

const makeRegex = pattern => {
    const chunks = pattern
        .split('/')
        .map(chunk => {
            var r = /^\{([a-zA-Z]\w+)\}$/.exec(chunk);
            return {
                parameter: r ? r[1] : null,
                regexPart: r ? '([^/?#$]+)' : chunk
            };
        });
    return {
        regex: new RegExp('^' + chunks.map(c => c.regexPart).join('/')),
        parameters: chunks.map(c => c.parameter).filter(p => p !== null)
    };

};

const map = routes => {
    const alternatives = Object.entries(routes).map(([pattern, action]) => {
        const { regex, parameters } = makeRegex(pattern);
        return routingData => {
            const { path, pathParams, prefix } = routingData;
            const r = regex.exec(path);
            if (r) {
                return action(clone(routingData, {
                    pathParams: clone(pathParams, parameters.reduce((paramObj, param, idx) => {
                        paramObj[param] = r[idx + 1];
                        return paramObj;
                    }, {})),
                    prefix: prefix + r[0],
                    path: path.slice(r[0].length)
                }));
            } else {
                return null;
            }
        };
    });

    return routingInfo => {
        for (const alternative of alternatives) {
            const result = alternative(routingInfo);
            if (result) {
                return result;
            }
        }
        return null;
    };
};

const use = (pattern, provider, continuation) => {
    const { regex, parameters } = makeRegex(pattern);
    return routingInfo => {
        let action = continuation(routingInfo);
        let r;
        if (action && (r = regex.exec(routingInfo.path))) {
            return async middlewareData => action(await provider(middlewareData));
        } else {
            return action;
        }
    };
};

const noop = () => { };
const action = renderer => routingData => async middlewareData => {
    try {
        return await renderer(routingData, middlewareData);
    } catch (error) {
        return {
            status: 500,
            data: error
        };
    }
}

const render = (component, data = {}) => ({ status: 200, component, data });

async function main() {
    let router = use(
        '/', data => clone(data, { x: 42 }), map({
            '/cenas/ultras': action(() => render('ultras!')),
            '/coiso': map({
                '/etal': action((routing, data) => render('coiso e tal!', data)),
                '/{id}': action(({ pathParams: { id } }) => render('coiso', { message: `coiso with id ${id}` }))
            })
        }));

    const testArray = ['/coiso', '/coiso/etal', '/cenas/ultras', '/coiso/78', '/desconhecido'];

    for (const url of testArray) {
        const action = router({ path: url, pathParams: {}, prefix: '' });
        console.log(action && await action());
    }
};

main();
