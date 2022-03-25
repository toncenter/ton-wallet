const { access, readFile } = require('fs');
const { createServer } = require('http');
const open = require('open');
const { join, normalize, parse } = require('path');
const { TARGETS, START_WEB_PORT } = require('./config');

const cwd = process.cwd();

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

const start = async targetName => {
    if (targetName !== TARGETS.WEB) {
        console.log(`Start target "${targetName}" not available`);
        return;
    }

    const port = +process.env.START_WEB_PORT || START_WEB_PORT;

    await startServer(port, 'docs');

    const address = `http://localhost:${port}`;
    console.log(`App available on ${address}`);
    await open(address);
};

module.exports = start;
