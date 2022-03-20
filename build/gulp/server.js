const { access, readFile } = require('fs');
const { createServer } = require('http');
const { join, normalize, parse } = require('path');

const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.ico': 'image/x-icon',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.xml': 'text/xml',
    '.webmanifest': 'application/manifest+json'
};

const cwd = process.cwd();

const startServer = (port, basePath) => {
    const server = createServer();

    server.on('request', (req, res) => {
        const url = new URL(req.url, 'http://localhost');

        if(url.pathname === '/') url.pathname = '/index.html';

        const path = join(cwd, basePath, normalize(url.pathname).replace(/^(\.\.[\/\\])+/, ''));

        access(path, err => {
            if (err) {
                res.statusCode = 404;
                res.end(`File ${path} not found`);
                return;
            }

            readFile(path, (err, data) => {
                if(err){
                    res.statusCode = 500;
                    res.end(`Error in reading file ${path}`);
                    return;
                }

                res.setHeader(
                    'Content-type', mimeTypes[parse(path).ext] || 'application/octet-stream'
                );
                res.end(data);
            });
        });
    });

    return new Promise((resolve, reject) => {
        server.on('error', reject);
        server.listen(port, resolve);
    });
};

module.exports = startServer;
