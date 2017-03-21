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





function main() {
    let router = map({
        '/cenas/ultras': () => console.log('ultras!'),
        '/coiso': map({
            '/etal': () => { console.log('coiso e tal!'); return 42; },
            '/{id}': ({ pathParams: { id } }) => console.log(`coiso with id ${id}`)
        })
    });

    router({ path: '/coiso', pathParams: {} });
    router({ path: '/coiso/etal', pathParams: {} });
    router({ path: '/cenas/ultras', pathParams: {} });
    router({ path: '/coiso/78', pathParams: {} });
    router({ path: '/desconhecido', pathParams: {} });
};

main();
