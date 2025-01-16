// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.
var __awaiter =
  (this && this.__awaiter) ||
  function (thisArg, _arguments, P, generator) {
    function adopt(value) {
      return value instanceof P
        ? value
        : new P(function (resolve) {
            resolve(value)
          })
    }
    return new (P || (P = Promise))(function (resolve, reject) {
      function fulfilled(value) {
        try {
          step(generator.next(value))
        } catch (e) {
          reject(e)
        }
      }
      function rejected(value) {
        try {
          step(generator['throw'](value))
        } catch (e) {
          reject(e)
        }
      }
      function step(result) {
        result.done
          ? resolve(result.value)
          : adopt(result.value).then(fulfilled, rejected)
      }
      step((generator = generator.apply(thisArg, _arguments || [])).next())
    })
  }
var __generator =
  (this && this.__generator) ||
  function (thisArg, body) {
    var _ = {
        label: 0,
        sent: function () {
          if (t[0] & 1) throw t[1]
          return t[1]
        },
        trys: [],
        ops: [],
      },
      f,
      y,
      t,
      g
    return (
      (g = { next: verb(0), throw: verb(1), return: verb(2) }),
      typeof Symbol === 'function' &&
        (g[Symbol.iterator] = function () {
          return this
        }),
      g
    )
    function verb(n) {
      return function (v) {
        return step([n, v])
      }
    }
    function step(op) {
      if (f) throw new TypeError('Generator is already executing.')
      while ((g && ((g = 0), op[0] && (_ = 0)), _))
        try {
          if (
            ((f = 1),
            y &&
              (t =
                op[0] & 2
                  ? y['return']
                  : op[0]
                    ? y['throw'] || ((t = y['return']) && t.call(y), 0)
                    : y.next) &&
              !(t = t.call(y, op[1])).done)
          )
            return t
          if (((y = 0), t)) op = [op[0] & 2, t.value]
          switch (op[0]) {
            case 0:
            case 1:
              t = op
              break
            case 4:
              _.label++
              return { value: op[1], done: false }
            case 5:
              _.label++
              y = op[1]
              op = [0]
              continue
            case 7:
              op = _.ops.pop()
              _.trys.pop()
              continue
            default:
              if (
                !((t = _.trys), (t = t.length > 0 && t[t.length - 1])) &&
                (op[0] === 6 || op[0] === 2)
              ) {
                _ = 0
                continue
              }
              if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) {
                _.label = op[1]
                break
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1]
                t = op
                break
              }
              if (t && _.label < t[2]) {
                _.label = t[2]
                _.ops.push(op)
                break
              }
              if (t[2]) _.ops.pop()
              _.trys.pop()
              continue
          }
          op = body.call(thisArg, _)
        } catch (e) {
          op = [6, e]
          y = 0
        } finally {
          f = t = 0
        }
      if (op[0] & 5) throw op[1]
      return { value: op[0] ? op[1] : void 0, done: true }
    }
  }
// GNU AFFERO GENERAL PUBLIC LICENSE Version 3. Copyright (C) 2022 DAO DAO Contributors.
// See the "LICENSE" file in the root directory of this package for more copyright information.
var _this = this
var CACHE = 'pwa-offline'
var getPathFromNotification = function (_a) {
  var deepLink = _a.deepLink
  switch (deepLink.type) {
    case 'dao':
      return '/dao/'.concat(deepLink.coreAddress)
    case 'proposal':
      return '/dao/'
        .concat(deepLink.coreAddress, '/proposals/')
        .concat(deepLink.proposalId)
    default:
      return '/'
  }
}
;(function () {
  var _this = this
  // Become the active server worker on install.
  this.addEventListener('install', function () {
    _this.skipWaiting()
  })
  // Cache offline page on install.
  // self.addEventListener('install', function (event) {
  //   event.waitUntil(
  //     caches.open(CACHE).then(function (cache) {
  //       console.log('[PWA] Cached offline page during install')
  //       if (offlineFallbackPage === '/fallback.js') {
  //         return cache.add(
  //           new Response(
  //             'TODO: Update the value of the offlineFallbackPage constant in the serviceworker.'
  //           )
  //         )
  //       }
  //       return cache.add(offlineFallbackPage, assets)
  //     })
  //   )
  // })
  // Push notification event.
  this.addEventListener('push', function (event) {
    var _a
    var data =
      ((_a = event.data) === null || _a === void 0 ? void 0 : _a.json()) || {}
    event.waitUntil(
      _this.registration.showNotification(data.title, {
        body: data.message,
        icon: data.imageUrl || '/daodao.png',
        data: data,
      })
    )
  })
  // Notification click event.
  this.addEventListener('notificationclick', function (event) {
    event.notification.close()
    var path = getPathFromNotification(event.notification.data)
    event.waitUntil(
      _this.clients.openWindow(path)
      // this.clients
      //   .matchAll({ type: 'window', includeUncontrolled: true })
      //   .then(async (clientList) => {
      //     if (clientList.length > 0) {
      //       // Find last focused client.
      //       let client = clientList[0]
      //       clientList.forEach((c) => {
      //         if (c.focused) {
      //           client = c
      //         }
      //       })
      //       await client.navigate(path)
      //       if (!client.focused) {
      //         return client.focus()
      //       }
      //     }
      //     // If no clients, open new window.
      //     return this.clients.openWindow(path)
      //   })
    )
  })
  // Offline support. If any fetch fails, it will check the cache for the
  // request.
  self.addEventListener('fetch', function (event) {
    if (
      event.request.method !== 'GET' ||
      event.request.url.startsWith('chrome-extension:')
    ) {
      return
    }
    event.respondWith(
      fetch(event.request)
        .then(function (response) {
          // If request was success, update it in the cache.
          event.waitUntil(updateCache(event.request, response.clone()))
          return response
        })
        .catch(function () {
          // If request failed, try to get it from the cache.
          // console.log(
          //   '[PWA] Network request Failed. Serving content from cache: ' + error
          // )
          return fromCache(event.request)
        })
    )
  })
}).call(self)
var fromCache = function (request) {
  return __awaiter(_this, void 0, void 0, function () {
    var matching
    return __generator(this, function (_a) {
      switch (_a.label) {
        case 0:
          return [4 /*yield*/, caches.open(CACHE)]
        case 1:
          return [4 /*yield*/, _a.sent().match(request)]
        case 2:
          matching = _a.sent()
          if (!matching || matching.status === 404) {
            return [2 /*return*/, Promise.reject('no-match')]
          }
          return [2 /*return*/, matching]
      }
    })
  })
}
var updateCache = function () {
  var params = []
  for (var _i = 0; _i < arguments.length; _i++) {
    params[_i] = arguments[_i]
  }
  return __awaiter(_this, void 0, void 0, function () {
    var _a
    return __generator(this, function (_b) {
      switch (_b.label) {
        case 0:
          return [4 /*yield*/, caches.open(CACHE)]
        case 1:
          return [2 /*return*/, (_a = _b.sent()).put.apply(_a, params)]
      }
    })
  })
}
