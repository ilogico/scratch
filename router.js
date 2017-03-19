'use strict';

const makeRoute = (pattern, handler) => {
    const {regex, parameters} = makeRegex(pattern);
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


const patternTester = /TODO/;
const makeRegex = pattern => {
    const chunks = pattern
        .split('/')
        .map(chunk => {
            var r = /^\{([a-zA-Z]+)\}$/.exec(chunk);
            return {
                parameter: r ? r[1] : null,
                regexPart: r ? '([^/?#$])' : chunk
            };
        });
    return {
        regex: new RegExp(chunks.map(c => c.regexPart).join('/')),
        parameters: chunks.map(c => c.parameter).filter(p => p !== null)
    };

};

module.exports.makeRegex = makeRegex;