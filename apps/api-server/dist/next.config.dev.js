"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = void 0;

/** @type {import('next').NextConfig} */
var nextConfig = {
  experimental: {
    turbo: {}
  },
  env: {
    CUSTOM_KEY: 'altamedica-api-server'
  },
  headers: function headers() {
    return regeneratorRuntime.async(function headers$(_context) {
      while (1) {
        switch (_context.prev = _context.next) {
          case 0:
            return _context.abrupt("return", [{
              source: '/api/:path*',
              headers: [{
                key: 'Access-Control-Allow-Origin',
                value: '*'
              }, {
                key: 'Access-Control-Allow-Methods',
                value: 'GET, POST, PUT, DELETE, OPTIONS'
              }, {
                key: 'Access-Control-Allow-Headers',
                value: 'Content-Type, Authorization'
              }]
            }]);

          case 1:
          case "end":
            return _context.stop();
        }
      }
    });
  },
  rewrites: function rewrites() {
    return regeneratorRuntime.async(function rewrites$(_context2) {
      while (1) {
        switch (_context2.prev = _context2.next) {
          case 0:
            return _context2.abrupt("return", [{
              source: '/health',
              destination: '/api/v1/health'
            }]);

          case 1:
          case "end":
            return _context2.stop();
        }
      }
    });
  }
};
var _default = nextConfig;
exports["default"] = _default;