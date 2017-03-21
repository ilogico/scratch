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
        return routingInfo => {
            const { path, pathParams, prefix } = routingInfo;
            const r = regex.exec(path);
            if (r) {
                return action(clone(routingInfo, {
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

const noop = () => { };
const end = executioner => routingInfo => async () => {
    try {
        return await executioner(routingInfo);
    } catch (error) {
        return {
            status: 500,
            data: error
        };
    }
}

const render = (component, data = {}) => ({ status: 200, component, data });

async function main() {
    let router = map({
        '/cenas/ultras': end(() => render('ultras!')),
        '/coiso': map({
            '/etal': end(() => render('coiso e tal!')),
            '/{id}': end(({ pathParams: { id } }) => render('coiso', { message: `coiso with id ${id}` }))
        })
    });

    const testArray = ['/coiso', '/coiso/etal', '/cenas/ultras', '/coiso/78', '/desconhecido'];

    for (const url of testArray) {
        const action = router({ path: url, pathParams: {}, prefix: '' });
        console.log(action && await action());
    }
};

main();
