# Source code

We deliberately use plain js and do not use frameworks, due to the direct access to the user's private keys. We also try to use the minimum number of third party libraries and consciously include them as static files rather than NPM packages to prevent accidental upgrade to a potentially malicious versions.

# Preparation

Set required for build environment variables in shell or `.env` file in project root directory. See `.env.example` with required variables names and their description.

If need, update `version` field in `package.json` to increase version in output manifest.json files, source files and update anti-cache parameters values.

Install development dependencies:

```
npm install
```

# Tasks

To run build task use next template:

```
npm run {task} {target}
```

Possible tasks:
- `build` - create bundles in targets destination directories
- `watch` - autorebuild bundles on sources change
- `start` - open target in web-browser and autorebuild bundles on sources change (only for `web` target to test website wallet local)
- `pack` - create bundles and prepare it to publuish-ready form

Possible targets and bundle files destinations folder:
- `web` - docs
- `chromium` - artifacts/v3
- `firefox` - artifacts/v2
- `safari` - artifacts/v2
- `all` - run all targets

Possible targets for pack task and output files destinations:
- `chromium` - artifacts/chromium-ton-wallet-{version}.zip
- `firefox` - artifacts/firefox-ton-wallet-{version}.zip
- `safari` - build xcode project to ton-wallet/artifacts/safari
- `all` - run all targets

Where {version} - value from package.json "version" field

# Chromium-based browsers Extension Developer Mode

- Open web browser
- Go to `chrome://extensions/`
- Enable "Developer Mode" in top right corner
- Click "Load unpacked extension" and specify `artifacts/v3` folder

# Mozilla Firefox Add-on Developer Mode

- Open Mozilla Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on" and select `artifacts/v2/manifest.json` file

# Safari Extension Developer Mode

- Install Xcode Command Line Tools
- Open Safari and choose Safari > Preferences
- Select the Advanced tab, then select the "Show Develop menu in menu bar" checkbox
- Choose Develop > Allow Unsigned Extensions (the Allow Unsigned Extensions setting is reset when a user quits Safari, you must set it again the next time Safari is launched)
- Pack extension for Safari by command `npm run pack safari`
- Extension will automatically added to Safari

## Switch between clear console and debug mode

- Support from 1.1.36 version
- Open menu in right-top corner and select `About` item
- Click on `Version:` label with Alt key pressed
