'use strict';

const makeRoute = (pattern, handler) => {
    const { regex, parameters } = makeRegex(pattern);
    return path => {
        const result = regex.exec(path);
        if (result) {
            return handler({
                path,
                subRoute: path.slice(result[0].length),
                prefix: result[0],
                parameters: parameters.reduce((obj, name, idx) => {
                    obj[name] = result[idx + 1];
                    return obj;
                }, {})
            });
        }
    };
};

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
        regex: new RegExp(chunks.map(c => c.regexPart).join('/')),
        parameters: chunks.map(c => c.parameter).filter(p => p !== null)
    };

};

const map = routes => {
    const options = routes.map(({ path, action }) => {
        const { regex, parameters } = makeRegex(path);
        return routingInfo => {
            const { subPath, pathParams, prefix } = routingInfo;
            const r = regex.exec(subPath);
            if (r) {
                return action(clone(routingInfo, {
                    pathParams: clone(pathParams, parameters.reduce((paramObj, param, idx) => {
                        paramObj[param] = r[idx + 1];
                        return paramObj;
                    }, {})),
                    prefix: prefix + r[0],
                    subPath: subPath.slice(r[0].length)
                }));
            } else {
                return null;
            }
        };
    });

    return routingInfo => {
        for (const option of options) {
            const result = option(routingInfo);
            if (result) {
                return result;
            }
        }
        return null;
    };
};

module.exports = {
    makeRegex,
    makeRoute
};

const deepClone = object => typeof object !== 'object'
    ? object
    : Array.isArray(object)
        ? object.slice()
        : Object.keys(object)
            .reduce((result, key) => {
                result[key] = deepClone(object[key]);
                return result;
            }, Object.create(Object.getPrototypeOf(object)));

const clone = (object, overrides) => Object.assign({}, object, overrides);



function main() {
    let router = map([
        {
            path: '/cenas/ultras',
            action: () => console.log('ultras!')
        },
         {
             path: '/coiso',
             action: map([
                 {
                     path: 'etal',
                     action: () => (console.log('coiso e tal!'), 42)
                 },
                 {
                     path: '{id}',
                     action: ({pathParams: {id}}) => console.log(`coiso with id ${id}`)
                 }
             ])
         }
    ]);

    router({subPath: '/coiso', pathParams: {}});
    router({subPath: '/coiso/etal', pathParams: {}});
    router({subPath: '/cenas/ultras', pathParams: {}});
    router({subPath: '/coiso/78', pathParams: {}});
    router({subPath: '/desconhecido', pathParams: {}});
};

main();