# Source code

We deliberately use plain js and do not use frameworks, due to the direct access to the user's private keys. We also try to use the minimum number of third party libraries and consciously include them as static files rather than NPM packages to prevent accidental upgrade to a potentially malicious versions.

# Build

Set required for build environment variables in shell or `.env` file in project root directory. See `.env.example` with required variables names and their description.

If need, update `version` field in `package.json` to increase version in output manifest.json files, source files and update anti-cache parameters values.

Install development dependencies:

```
npm install
```

Use `build` task to build bundles:

```
npm run build {target}
```

Use `watch` task to autorebuild bundles on sources change:

```
npm run watch {target}
```

Use `start` task to open target in web-browser and autorebuild bundles on sources change (now support only `web` target):

```
npm run start {target}
```

Possible targets and bundle files destinations folder:
- `web` - ton-wallet/docs
- `chromium` - ton-wallet/artifacts/v3
- `firefox` - ton-wallet/artifacts/v2
- `safari` - ton-wallet/artifacts/v2
- `all` - run all targets

# Packing

Use `pack` task to build bundles and prepare it to publuish-ready form:

```
npm run pack {target}
```

Possible targets and output files destinations:
- `chromium` - ton-wallet/artifacts/chromium-ton-wallet-{version}.zip
- `firefox` - ton-wallet/artifacts/firefox-ton-wallet-{version}.zip
- `safari` - build xcode project to ton-wallet/artifacts/safari
- `all` - run all targets

Where {version} - value from package.json "version" field

# Chromium-based browsers Extension Developer Mode

- Open web browser
- Go to `chrome://extensions/`
- Enable "Developer Mode" in top right corner
- Click "Load unpacked extension" and specify `ton-wallet/artifacts/v3` folder

# Mozilla Firefox Add-on Developer Mode

- Open Mozilla Firefox
- Go to `about:debugging#/runtime/this-firefox`
- Click "Load Temporary Add-on" and select `ton-wallet/artifacts/v2/manifest.json` file

# Safari Extension Developer Mode

- Install Xcode Command Line Tools
- Open Safari and choose Safari > Preferences
- Select the Advanced tab, then select the "Show Develop menu in menu bar" checkbox
- Choose Develop > Allow Unsigned Extensions (the Allow Unsigned Extensions setting is reset when a user quits Safari, you must set it again the next time Safari is launched)
- Pack extension for Safari by command `npm run pack safari`
- Extension will automatically added to Safari
