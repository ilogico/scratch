'use strict';

const http = require('http');

http.createServer(async (request, response) => {

    response.setHeader('set-cookie', 'cenas=42');
    response.end(`
    <title>Testing forms</title>
    <form  method="post" enctype="multipart/form-data">
        <input name="data" type="file">
        <input name="value">
        <input name="value">
        <button>Submit</submit>
    </form>
    `);
}).listen(8080);
