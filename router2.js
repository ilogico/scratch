'use strict';

const parsePattern = pattern => {
    const segments = pattern.split('/');
    const parameters = [];
    const regex = new RegExp(segments.map(segment => segment.replace(/\{([^\}]*)}/g, (_, paramName) => {
        parameters.push(paramName.trim());
        return '\\.+';
    })).join('/'));
    return { parameters, regex };
};

const testPath = (regex, path, parameters) => {
    const r = regex.exec(path);
    return r && {
        matched: r[0],
        parameters: parameters.reduce((params, paramName, idx) => {
            params[paramName] = r[idx + 1]
        }, {})
    };
}
const use = (pattern, provider, continuation) => {
    const { regex, parameters } = parsePattern(pattern);
    return context => {
        const r = regex.exec(regex, context.path, parameters);
        return r ? provider(context, r.parameters, continuation) : continuation(context);
    };
};

const clone = (source, overrides) => Object.assign({}, source, overrides);

const map = routes => {
    return Object.entries(routes).reverse().reduce((continuation, [pattern, action]) => {
        const { regex, parameters } = parsePattern(pattern);
        return context => {
            const r = testPath(regex, context.path, parameters);
            return r
                ? action(clone(context, {
                    prefix: context.prefix + r.matched,
                    path: context.path.slice(r.matched.length)
                }), r.parameters)
                : continuation(context);
        };
    }, () => null);
};