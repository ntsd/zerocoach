global.__DEV__ = true;
process.env.EXPO_OS = 'android';
global.expo = global.expo || { EventEmitter: class {} };
global.window = global;
global.window.localStorage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
};

const Module = require('module');
const orig = Module._resolveFilename;
Module._resolveFilename = function (request, parent, isMain, options) {
  if (request === 'react-native') {
    return orig.call(this, 'react-native-web', parent, isMain, options);
  }
  return orig.call(this, request, parent, isMain, options);
};

// Mock expo-file-system for Node environment
const expoFs = {
  File: class {
    constructor(dir, name) {
      this.uri = `${dir}/${name}`;
      this.exists = false;
      this.size = 0;
    }
    delete() {}
    move() {}
  },
  Paths: { document: '/mock/documents' },
};

try {
  const fsPath = require.resolve('expo-file-system');
  require.cache[fsPath] = {
    id: fsPath,
    filename: fsPath,
    loaded: true,
    exports: expoFs,
  };
} catch (_) {}
