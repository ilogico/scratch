'use strict';

/**
 * 
 * @param {string} pattern
 * @returns {Uint32Array}
 */
function makeJumpTable(pattern) {
    const buffer = Uint8Array.from([...pattern].map(c => c.charCodeAt(0)));
    const length = buffer.length
    const jump = new Uint32Array(buffer.length * 256);
    let indices = buffer.map((_, idx) => idx);
    for (let suffixLength = 0; suffixLength < length; suffixLength++) {
        const row = suffixLength * 256;
        jump.fill(length - suffixLength, row, row + 256);
        const nextChar = buffer[length - suffixLength - 1];
        indices = indices.filter(index => {
            const char = buffer[index];
            jump[row + char] = length - suffixLength - index - 1;
            return char === nextChar;
        }).map(index => index - 1);

    }
    return jump;
}

/**
 * 
 * @param {string} pattern
 */
const find = pattern => {
    const jumpTable = makeJumpTable(pattern);
    const length = pattern.length;

    return function* (text) {
        const buffer = Uint8Array.from([...text].map(c => c.charCodeAt(0)));
        const end = buffer.length - length;

        for (let offset = 0; offset <= end;) {
            let jump = 0;
            for (let suffixLength = 0; jump === 0 && suffixLength < length; suffixLength++) {
                jump = jumpTable[256 * suffixLength + buffer[offset + length - suffixLength - 1]];
            }
            if (jump === 0) {
                yield offset;
                offset++;
            } else {
                offset += jump;
            }
        }
    };
};


const alphabet = (() => {
    let set = [];
    for (let i = 'a'.charCodeAt(0); i <= 'z'.charCodeAt(0); i++) {
        set.push(String.fromCharCode(i));
    }
    set = set.concat(set.map(c => c.toUpperCase()));

    for (let i = 0; i < 10; i++) set.push(' ');
    set.push(...'!#$%&/()=?+*-_'.split(''));
    return set;
})();
function randomText(size) {
    return Array.from(new Uint8Array(size)).map(() => alphabet[(Math.random() * alphabet.length | 0) % alphabet.length]).join('');
}
let pattern = "ananana";
let text = randomText(Math.random() * 40 | 0) + pattern.slice(1) + randomText(Math.random() * 40 | 0) + pattern.slice(1) + pattern + randomText(20);

console.log(`text: ${text}`);
console.log(`pattern: ${pattern}`);

let searcher = find(pattern);

console.log(`indexOf ${text.indexOf(pattern)}`);
for (let i of searcher(text)) {
    console.log(i);
}