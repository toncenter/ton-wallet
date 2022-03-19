const { existsSync, rmSync, rmdirSync } = require('fs');

const remove = async buildDest => {
  if (!existsSync(buildDest)) return;

  // fs.rm api was added in Node.js v14, in v16 recursive fs.rmdir is deprecated
  (rmSync ? rmSync : rmdirSync)(buildDest, { recursive: true });
};

module.exports = remove;
