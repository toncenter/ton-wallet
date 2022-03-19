const { spawn } = require('child_process');
const { dest, src } = require('gulp');
const zip = require('gulp-zip');
const { TARGETS, TARGETS_BUILD_DESTS } = require('./config');
const { version } = require('../../package.json');

const pack = targetName => {
    if (targetName === TARGETS.SAFARI) {
        return new Promise((resolve, reject) => {
            if (process.platform !== 'darwin') {
                console.log('Pack target "safari" available only on MacOS');
                return resolve();
            }

            const child = spawn(
                'xcodebuild', ['-project', 'build/safari/TON Wallet.xcodeproj'],
                { stdio: 'inherit' }
            );

            child.on('close', code => {
                if (code === 0) resolve();
                else reject(new Error(`Child process fail with code ${code}`));
            });
        });
    }

    return src(`${TARGETS_BUILD_DESTS[targetName]}/**/*`)
        .pipe(zip(`${targetName}-ton-wallet-${version}.zip`))
        .pipe(dest('artifacts'));
};

module.exports = pack;
