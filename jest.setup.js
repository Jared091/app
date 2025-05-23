// jest.setup.js
global.setImmediate = global.setImmediate || ((fn, ...args) => setTimeout(fn, 0, ...args));

// Polyfill para jest.now en el global
if (!global.jest) {
  global.jest = {};
}
if (!global.jest.now) {
  global.jest.now = Date.now;
}