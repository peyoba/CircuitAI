var __defProp = Object.defineProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });

// .wrangler/tmp/bundle-x5sFVe/checked-fetch.js
var urls = /* @__PURE__ */ new Set();
function checkURL(request, init) {
  const url = request instanceof URL ? request : new URL(
    (typeof request === "string" ? new Request(request, init) : request).url
  );
  if (url.port && url.port !== "443" && url.protocol === "https:") {
    if (!urls.has(url.toString())) {
      urls.add(url.toString());
      console.warn(
        `WARNING: known issue with \`fetch()\` requests to custom HTTPS ports in published Workers:
 - ${url.toString()} - the custom port will be ignored when the Worker is published using the \`wrangler deploy\` command.
`
      );
    }
  }
}
__name(checkURL, "checkURL");
globalThis.fetch = new Proxy(globalThis.fetch, {
  apply(target, thisArg, argArray) {
    const [request, init] = argArray;
    checkURL(request, init);
    return Reflect.apply(target, thisArg, argArray);
  }
});

// node_modules/hono/dist/compose.js
var compose = /* @__PURE__ */ __name((middleware, onError, onNotFound) => {
  return (context, next) => {
    let index = -1;
    return dispatch(0);
    async function dispatch(i) {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;
      let res;
      let isError = false;
      let handler;
      if (middleware[i]) {
        handler = middleware[i][0][0];
        context.req.routeIndex = i;
      } else {
        handler = i === middleware.length && next || void 0;
      }
      if (handler) {
        try {
          res = await handler(context, () => dispatch(i + 1));
        } catch (err) {
          if (err instanceof Error && onError) {
            context.error = err;
            res = await onError(err, context);
            isError = true;
          } else {
            throw err;
          }
        }
      } else {
        if (context.finalized === false && onNotFound) {
          res = await onNotFound(context);
        }
      }
      if (res && (context.finalized === false || isError)) {
        context.res = res;
      }
      return context;
    }
    __name(dispatch, "dispatch");
  };
}, "compose");

// node_modules/hono/dist/request/constants.js
var GET_MATCH_RESULT = Symbol();

// node_modules/hono/dist/utils/body.js
var parseBody = /* @__PURE__ */ __name(async (request, options = /* @__PURE__ */ Object.create(null)) => {
  const { all = false, dot = false } = options;
  const headers = request instanceof HonoRequest ? request.raw.headers : request.headers;
  const contentType = headers.get("Content-Type");
  if (contentType?.startsWith("multipart/form-data") || contentType?.startsWith("application/x-www-form-urlencoded")) {
    return parseFormData(request, { all, dot });
  }
  return {};
}, "parseBody");
async function parseFormData(request, options) {
  const formData = await request.formData();
  if (formData) {
    return convertFormDataToBodyData(formData, options);
  }
  return {};
}
__name(parseFormData, "parseFormData");
function convertFormDataToBodyData(formData, options) {
  const form = /* @__PURE__ */ Object.create(null);
  formData.forEach((value, key) => {
    const shouldParseAllValues = options.all || key.endsWith("[]");
    if (!shouldParseAllValues) {
      form[key] = value;
    } else {
      handleParsingAllValues(form, key, value);
    }
  });
  if (options.dot) {
    Object.entries(form).forEach(([key, value]) => {
      const shouldParseDotValues = key.includes(".");
      if (shouldParseDotValues) {
        handleParsingNestedValues(form, key, value);
        delete form[key];
      }
    });
  }
  return form;
}
__name(convertFormDataToBodyData, "convertFormDataToBodyData");
var handleParsingAllValues = /* @__PURE__ */ __name((form, key, value) => {
  if (form[key] !== void 0) {
    if (Array.isArray(form[key])) {
      ;
      form[key].push(value);
    } else {
      form[key] = [form[key], value];
    }
  } else {
    if (!key.endsWith("[]")) {
      form[key] = value;
    } else {
      form[key] = [value];
    }
  }
}, "handleParsingAllValues");
var handleParsingNestedValues = /* @__PURE__ */ __name((form, key, value) => {
  let nestedForm = form;
  const keys = key.split(".");
  keys.forEach((key2, index) => {
    if (index === keys.length - 1) {
      nestedForm[key2] = value;
    } else {
      if (!nestedForm[key2] || typeof nestedForm[key2] !== "object" || Array.isArray(nestedForm[key2]) || nestedForm[key2] instanceof File) {
        nestedForm[key2] = /* @__PURE__ */ Object.create(null);
      }
      nestedForm = nestedForm[key2];
    }
  });
}, "handleParsingNestedValues");

// node_modules/hono/dist/utils/url.js
var splitPath = /* @__PURE__ */ __name((path) => {
  const paths = path.split("/");
  if (paths[0] === "") {
    paths.shift();
  }
  return paths;
}, "splitPath");
var splitRoutingPath = /* @__PURE__ */ __name((routePath) => {
  const { groups, path } = extractGroupsFromPath(routePath);
  const paths = splitPath(path);
  return replaceGroupMarks(paths, groups);
}, "splitRoutingPath");
var extractGroupsFromPath = /* @__PURE__ */ __name((path) => {
  const groups = [];
  path = path.replace(/\{[^}]+\}/g, (match, index) => {
    const mark = `@${index}`;
    groups.push([mark, match]);
    return mark;
  });
  return { groups, path };
}, "extractGroupsFromPath");
var replaceGroupMarks = /* @__PURE__ */ __name((paths, groups) => {
  for (let i = groups.length - 1; i >= 0; i--) {
    const [mark] = groups[i];
    for (let j = paths.length - 1; j >= 0; j--) {
      if (paths[j].includes(mark)) {
        paths[j] = paths[j].replace(mark, groups[i][1]);
        break;
      }
    }
  }
  return paths;
}, "replaceGroupMarks");
var patternCache = {};
var getPattern = /* @__PURE__ */ __name((label, next) => {
  if (label === "*") {
    return "*";
  }
  const match = label.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
  if (match) {
    const cacheKey = `${label}#${next}`;
    if (!patternCache[cacheKey]) {
      if (match[2]) {
        patternCache[cacheKey] = next && next[0] !== ":" && next[0] !== "*" ? [cacheKey, match[1], new RegExp(`^${match[2]}(?=/${next})`)] : [label, match[1], new RegExp(`^${match[2]}$`)];
      } else {
        patternCache[cacheKey] = [label, match[1], true];
      }
    }
    return patternCache[cacheKey];
  }
  return null;
}, "getPattern");
var tryDecode = /* @__PURE__ */ __name((str, decoder) => {
  try {
    return decoder(str);
  } catch {
    return str.replace(/(?:%[0-9A-Fa-f]{2})+/g, (match) => {
      try {
        return decoder(match);
      } catch {
        return match;
      }
    });
  }
}, "tryDecode");
var tryDecodeURI = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURI), "tryDecodeURI");
var getPath = /* @__PURE__ */ __name((request) => {
  const url = request.url;
  const start = url.indexOf(
    "/",
    url.charCodeAt(9) === 58 ? 13 : 8
  );
  let i = start;
  for (; i < url.length; i++) {
    const charCode = url.charCodeAt(i);
    if (charCode === 37) {
      const queryIndex = url.indexOf("?", i);
      const path = url.slice(start, queryIndex === -1 ? void 0 : queryIndex);
      return tryDecodeURI(path.includes("%25") ? path.replace(/%25/g, "%2525") : path);
    } else if (charCode === 63) {
      break;
    }
  }
  return url.slice(start, i);
}, "getPath");
var getPathNoStrict = /* @__PURE__ */ __name((request) => {
  const result = getPath(request);
  return result.length > 1 && result.at(-1) === "/" ? result.slice(0, -1) : result;
}, "getPathNoStrict");
var mergePath = /* @__PURE__ */ __name((base, sub, ...rest) => {
  if (rest.length) {
    sub = mergePath(sub, ...rest);
  }
  return `${base?.[0] === "/" ? "" : "/"}${base}${sub === "/" ? "" : `${base?.at(-1) === "/" ? "" : "/"}${sub?.[0] === "/" ? sub.slice(1) : sub}`}`;
}, "mergePath");
var checkOptionalParameter = /* @__PURE__ */ __name((path) => {
  if (path.charCodeAt(path.length - 1) !== 63 || !path.includes(":")) {
    return null;
  }
  const segments = path.split("/");
  const results = [];
  let basePath = "";
  segments.forEach((segment) => {
    if (segment !== "" && !/\:/.test(segment)) {
      basePath += "/" + segment;
    } else if (/\:/.test(segment)) {
      if (/\?/.test(segment)) {
        if (results.length === 0 && basePath === "") {
          results.push("/");
        } else {
          results.push(basePath);
        }
        const optionalSegment = segment.replace("?", "");
        basePath += "/" + optionalSegment;
        results.push(basePath);
      } else {
        basePath += "/" + segment;
      }
    }
  });
  return results.filter((v, i, a) => a.indexOf(v) === i);
}, "checkOptionalParameter");
var _decodeURI = /* @__PURE__ */ __name((value) => {
  if (!/[%+]/.test(value)) {
    return value;
  }
  if (value.indexOf("+") !== -1) {
    value = value.replace(/\+/g, " ");
  }
  return value.indexOf("%") !== -1 ? tryDecode(value, decodeURIComponent_) : value;
}, "_decodeURI");
var _getQueryParam = /* @__PURE__ */ __name((url, key, multiple) => {
  let encoded;
  if (!multiple && key && !/[%+]/.test(key)) {
    let keyIndex2 = url.indexOf(`?${key}`, 8);
    if (keyIndex2 === -1) {
      keyIndex2 = url.indexOf(`&${key}`, 8);
    }
    while (keyIndex2 !== -1) {
      const trailingKeyCode = url.charCodeAt(keyIndex2 + key.length + 1);
      if (trailingKeyCode === 61) {
        const valueIndex = keyIndex2 + key.length + 2;
        const endIndex = url.indexOf("&", valueIndex);
        return _decodeURI(url.slice(valueIndex, endIndex === -1 ? void 0 : endIndex));
      } else if (trailingKeyCode == 38 || isNaN(trailingKeyCode)) {
        return "";
      }
      keyIndex2 = url.indexOf(`&${key}`, keyIndex2 + 1);
    }
    encoded = /[%+]/.test(url);
    if (!encoded) {
      return void 0;
    }
  }
  const results = {};
  encoded ??= /[%+]/.test(url);
  let keyIndex = url.indexOf("?", 8);
  while (keyIndex !== -1) {
    const nextKeyIndex = url.indexOf("&", keyIndex + 1);
    let valueIndex = url.indexOf("=", keyIndex);
    if (valueIndex > nextKeyIndex && nextKeyIndex !== -1) {
      valueIndex = -1;
    }
    let name = url.slice(
      keyIndex + 1,
      valueIndex === -1 ? nextKeyIndex === -1 ? void 0 : nextKeyIndex : valueIndex
    );
    if (encoded) {
      name = _decodeURI(name);
    }
    keyIndex = nextKeyIndex;
    if (name === "") {
      continue;
    }
    let value;
    if (valueIndex === -1) {
      value = "";
    } else {
      value = url.slice(valueIndex + 1, nextKeyIndex === -1 ? void 0 : nextKeyIndex);
      if (encoded) {
        value = _decodeURI(value);
      }
    }
    if (multiple) {
      if (!(results[name] && Array.isArray(results[name]))) {
        results[name] = [];
      }
      ;
      results[name].push(value);
    } else {
      results[name] ??= value;
    }
  }
  return key ? results[key] : results;
}, "_getQueryParam");
var getQueryParam = _getQueryParam;
var getQueryParams = /* @__PURE__ */ __name((url, key) => {
  return _getQueryParam(url, key, true);
}, "getQueryParams");
var decodeURIComponent_ = decodeURIComponent;

// node_modules/hono/dist/request.js
var tryDecodeURIComponent = /* @__PURE__ */ __name((str) => tryDecode(str, decodeURIComponent_), "tryDecodeURIComponent");
var HonoRequest = class {
  static {
    __name(this, "HonoRequest");
  }
  raw;
  #validatedData;
  #matchResult;
  routeIndex = 0;
  path;
  bodyCache = {};
  constructor(request, path = "/", matchResult = [[]]) {
    this.raw = request;
    this.path = path;
    this.#matchResult = matchResult;
    this.#validatedData = {};
  }
  param(key) {
    return key ? this.#getDecodedParam(key) : this.#getAllDecodedParams();
  }
  #getDecodedParam(key) {
    const paramKey = this.#matchResult[0][this.routeIndex][1][key];
    const param = this.#getParamValue(paramKey);
    return param ? /\%/.test(param) ? tryDecodeURIComponent(param) : param : void 0;
  }
  #getAllDecodedParams() {
    const decoded = {};
    const keys = Object.keys(this.#matchResult[0][this.routeIndex][1]);
    for (const key of keys) {
      const value = this.#getParamValue(this.#matchResult[0][this.routeIndex][1][key]);
      if (value && typeof value === "string") {
        decoded[key] = /\%/.test(value) ? tryDecodeURIComponent(value) : value;
      }
    }
    return decoded;
  }
  #getParamValue(paramKey) {
    return this.#matchResult[1] ? this.#matchResult[1][paramKey] : paramKey;
  }
  query(key) {
    return getQueryParam(this.url, key);
  }
  queries(key) {
    return getQueryParams(this.url, key);
  }
  header(name) {
    if (name) {
      return this.raw.headers.get(name) ?? void 0;
    }
    const headerData = {};
    this.raw.headers.forEach((value, key) => {
      headerData[key] = value;
    });
    return headerData;
  }
  async parseBody(options) {
    return this.bodyCache.parsedBody ??= await parseBody(this, options);
  }
  #cachedBody = /* @__PURE__ */ __name((key) => {
    const { bodyCache, raw: raw2 } = this;
    const cachedBody = bodyCache[key];
    if (cachedBody) {
      return cachedBody;
    }
    const anyCachedKey = Object.keys(bodyCache)[0];
    if (anyCachedKey) {
      return bodyCache[anyCachedKey].then((body) => {
        if (anyCachedKey === "json") {
          body = JSON.stringify(body);
        }
        return new Response(body)[key]();
      });
    }
    return bodyCache[key] = raw2[key]();
  }, "#cachedBody");
  json() {
    return this.#cachedBody("text").then((text) => JSON.parse(text));
  }
  text() {
    return this.#cachedBody("text");
  }
  arrayBuffer() {
    return this.#cachedBody("arrayBuffer");
  }
  blob() {
    return this.#cachedBody("blob");
  }
  formData() {
    return this.#cachedBody("formData");
  }
  addValidatedData(target, data) {
    this.#validatedData[target] = data;
  }
  valid(target) {
    return this.#validatedData[target];
  }
  get url() {
    return this.raw.url;
  }
  get method() {
    return this.raw.method;
  }
  get [GET_MATCH_RESULT]() {
    return this.#matchResult;
  }
  get matchedRoutes() {
    return this.#matchResult[0].map(([[, route]]) => route);
  }
  get routePath() {
    return this.#matchResult[0].map(([[, route]]) => route)[this.routeIndex].path;
  }
};

// node_modules/hono/dist/utils/html.js
var HtmlEscapedCallbackPhase = {
  Stringify: 1,
  BeforeStream: 2,
  Stream: 3
};
var raw = /* @__PURE__ */ __name((value, callbacks) => {
  const escapedString = new String(value);
  escapedString.isEscaped = true;
  escapedString.callbacks = callbacks;
  return escapedString;
}, "raw");
var resolveCallback = /* @__PURE__ */ __name(async (str, phase, preserveCallbacks, context, buffer) => {
  if (typeof str === "object" && !(str instanceof String)) {
    if (!(str instanceof Promise)) {
      str = str.toString();
    }
    if (str instanceof Promise) {
      str = await str;
    }
  }
  const callbacks = str.callbacks;
  if (!callbacks?.length) {
    return Promise.resolve(str);
  }
  if (buffer) {
    buffer[0] += str;
  } else {
    buffer = [str];
  }
  const resStr = Promise.all(callbacks.map((c) => c({ phase, buffer, context }))).then(
    (res) => Promise.all(
      res.filter(Boolean).map((str2) => resolveCallback(str2, phase, false, context, buffer))
    ).then(() => buffer[0])
  );
  if (preserveCallbacks) {
    return raw(await resStr, callbacks);
  } else {
    return resStr;
  }
}, "resolveCallback");

// node_modules/hono/dist/context.js
var TEXT_PLAIN = "text/plain; charset=UTF-8";
var setDefaultContentType = /* @__PURE__ */ __name((contentType, headers) => {
  return {
    "Content-Type": contentType,
    ...headers
  };
}, "setDefaultContentType");
var Context = class {
  static {
    __name(this, "Context");
  }
  #rawRequest;
  #req;
  env = {};
  #var;
  finalized = false;
  error;
  #status;
  #executionCtx;
  #res;
  #layout;
  #renderer;
  #notFoundHandler;
  #preparedHeaders;
  #matchResult;
  #path;
  constructor(req, options) {
    this.#rawRequest = req;
    if (options) {
      this.#executionCtx = options.executionCtx;
      this.env = options.env;
      this.#notFoundHandler = options.notFoundHandler;
      this.#path = options.path;
      this.#matchResult = options.matchResult;
    }
  }
  get req() {
    this.#req ??= new HonoRequest(this.#rawRequest, this.#path, this.#matchResult);
    return this.#req;
  }
  get event() {
    if (this.#executionCtx && "respondWith" in this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no FetchEvent");
    }
  }
  get executionCtx() {
    if (this.#executionCtx) {
      return this.#executionCtx;
    } else {
      throw Error("This context has no ExecutionContext");
    }
  }
  get res() {
    return this.#res ||= new Response(null, {
      headers: this.#preparedHeaders ??= new Headers()
    });
  }
  set res(_res) {
    if (this.#res && _res) {
      _res = new Response(_res.body, _res);
      for (const [k, v] of this.#res.headers.entries()) {
        if (k === "content-type") {
          continue;
        }
        if (k === "set-cookie") {
          const cookies = this.#res.headers.getSetCookie();
          _res.headers.delete("set-cookie");
          for (const cookie of cookies) {
            _res.headers.append("set-cookie", cookie);
          }
        } else {
          _res.headers.set(k, v);
        }
      }
    }
    this.#res = _res;
    this.finalized = true;
  }
  render = /* @__PURE__ */ __name((...args) => {
    this.#renderer ??= (content) => this.html(content);
    return this.#renderer(...args);
  }, "render");
  setLayout = /* @__PURE__ */ __name((layout) => this.#layout = layout, "setLayout");
  getLayout = /* @__PURE__ */ __name(() => this.#layout, "getLayout");
  setRenderer = /* @__PURE__ */ __name((renderer) => {
    this.#renderer = renderer;
  }, "setRenderer");
  header = /* @__PURE__ */ __name((name, value, options) => {
    if (this.finalized) {
      this.#res = new Response(this.#res.body, this.#res);
    }
    const headers = this.#res ? this.#res.headers : this.#preparedHeaders ??= new Headers();
    if (value === void 0) {
      headers.delete(name);
    } else if (options?.append) {
      headers.append(name, value);
    } else {
      headers.set(name, value);
    }
  }, "header");
  status = /* @__PURE__ */ __name((status) => {
    this.#status = status;
  }, "status");
  set = /* @__PURE__ */ __name((key, value) => {
    this.#var ??= /* @__PURE__ */ new Map();
    this.#var.set(key, value);
  }, "set");
  get = /* @__PURE__ */ __name((key) => {
    return this.#var ? this.#var.get(key) : void 0;
  }, "get");
  get var() {
    if (!this.#var) {
      return {};
    }
    return Object.fromEntries(this.#var);
  }
  #newResponse(data, arg, headers) {
    const responseHeaders = this.#res ? new Headers(this.#res.headers) : this.#preparedHeaders ?? new Headers();
    if (typeof arg === "object" && "headers" in arg) {
      const argHeaders = arg.headers instanceof Headers ? arg.headers : new Headers(arg.headers);
      for (const [key, value] of argHeaders) {
        if (key.toLowerCase() === "set-cookie") {
          responseHeaders.append(key, value);
        } else {
          responseHeaders.set(key, value);
        }
      }
    }
    if (headers) {
      for (const [k, v] of Object.entries(headers)) {
        if (typeof v === "string") {
          responseHeaders.set(k, v);
        } else {
          responseHeaders.delete(k);
          for (const v2 of v) {
            responseHeaders.append(k, v2);
          }
        }
      }
    }
    const status = typeof arg === "number" ? arg : arg?.status ?? this.#status;
    return new Response(data, { status, headers: responseHeaders });
  }
  newResponse = /* @__PURE__ */ __name((...args) => this.#newResponse(...args), "newResponse");
  body = /* @__PURE__ */ __name((data, arg, headers) => this.#newResponse(data, arg, headers), "body");
  text = /* @__PURE__ */ __name((text, arg, headers) => {
    return !this.#preparedHeaders && !this.#status && !arg && !headers && !this.finalized ? new Response(text) : this.#newResponse(
      text,
      arg,
      setDefaultContentType(TEXT_PLAIN, headers)
    );
  }, "text");
  json = /* @__PURE__ */ __name((object, arg, headers) => {
    return this.#newResponse(
      JSON.stringify(object),
      arg,
      setDefaultContentType("application/json", headers)
    );
  }, "json");
  html = /* @__PURE__ */ __name((html, arg, headers) => {
    const res = /* @__PURE__ */ __name((html2) => this.#newResponse(html2, arg, setDefaultContentType("text/html; charset=UTF-8", headers)), "res");
    return typeof html === "object" ? resolveCallback(html, HtmlEscapedCallbackPhase.Stringify, false, {}).then(res) : res(html);
  }, "html");
  redirect = /* @__PURE__ */ __name((location, status) => {
    const locationString = String(location);
    this.header(
      "Location",
      !/[^\x00-\xFF]/.test(locationString) ? locationString : encodeURI(locationString)
    );
    return this.newResponse(null, status ?? 302);
  }, "redirect");
  notFound = /* @__PURE__ */ __name(() => {
    this.#notFoundHandler ??= () => new Response();
    return this.#notFoundHandler(this);
  }, "notFound");
};

// node_modules/hono/dist/router.js
var METHOD_NAME_ALL = "ALL";
var METHOD_NAME_ALL_LOWERCASE = "all";
var METHODS = ["get", "post", "put", "delete", "options", "patch"];
var MESSAGE_MATCHER_IS_ALREADY_BUILT = "Can not add a route since the matcher is already built.";
var UnsupportedPathError = class extends Error {
  static {
    __name(this, "UnsupportedPathError");
  }
};

// node_modules/hono/dist/utils/constants.js
var COMPOSED_HANDLER = "__COMPOSED_HANDLER";

// node_modules/hono/dist/hono-base.js
var notFoundHandler = /* @__PURE__ */ __name((c) => {
  return c.text("404 Not Found", 404);
}, "notFoundHandler");
var errorHandler = /* @__PURE__ */ __name((err, c) => {
  if ("getResponse" in err) {
    const res = err.getResponse();
    return c.newResponse(res.body, res);
  }
  console.error(err);
  return c.text("Internal Server Error", 500);
}, "errorHandler");
var Hono = class {
  static {
    __name(this, "Hono");
  }
  get;
  post;
  put;
  delete;
  options;
  patch;
  all;
  on;
  use;
  router;
  getPath;
  _basePath = "/";
  #path = "/";
  routes = [];
  constructor(options = {}) {
    const allMethods = [...METHODS, METHOD_NAME_ALL_LOWERCASE];
    allMethods.forEach((method) => {
      this[method] = (args1, ...args) => {
        if (typeof args1 === "string") {
          this.#path = args1;
        } else {
          this.#addRoute(method, this.#path, args1);
        }
        args.forEach((handler) => {
          this.#addRoute(method, this.#path, handler);
        });
        return this;
      };
    });
    this.on = (method, path, ...handlers) => {
      for (const p of [path].flat()) {
        this.#path = p;
        for (const m of [method].flat()) {
          handlers.map((handler) => {
            this.#addRoute(m.toUpperCase(), this.#path, handler);
          });
        }
      }
      return this;
    };
    this.use = (arg1, ...handlers) => {
      if (typeof arg1 === "string") {
        this.#path = arg1;
      } else {
        this.#path = "*";
        handlers.unshift(arg1);
      }
      handlers.forEach((handler) => {
        this.#addRoute(METHOD_NAME_ALL, this.#path, handler);
      });
      return this;
    };
    const { strict, ...optionsWithoutStrict } = options;
    Object.assign(this, optionsWithoutStrict);
    this.getPath = strict ?? true ? options.getPath ?? getPath : getPathNoStrict;
  }
  #clone() {
    const clone = new Hono({
      router: this.router,
      getPath: this.getPath
    });
    clone.errorHandler = this.errorHandler;
    clone.#notFoundHandler = this.#notFoundHandler;
    clone.routes = this.routes;
    return clone;
  }
  #notFoundHandler = notFoundHandler;
  errorHandler = errorHandler;
  route(path, app2) {
    const subApp = this.basePath(path);
    app2.routes.map((r) => {
      let handler;
      if (app2.errorHandler === errorHandler) {
        handler = r.handler;
      } else {
        handler = /* @__PURE__ */ __name(async (c, next) => (await compose([], app2.errorHandler)(c, () => r.handler(c, next))).res, "handler");
        handler[COMPOSED_HANDLER] = r.handler;
      }
      subApp.#addRoute(r.method, r.path, handler);
    });
    return this;
  }
  basePath(path) {
    const subApp = this.#clone();
    subApp._basePath = mergePath(this._basePath, path);
    return subApp;
  }
  onError = /* @__PURE__ */ __name((handler) => {
    this.errorHandler = handler;
    return this;
  }, "onError");
  notFound = /* @__PURE__ */ __name((handler) => {
    this.#notFoundHandler = handler;
    return this;
  }, "notFound");
  mount(path, applicationHandler, options) {
    let replaceRequest;
    let optionHandler;
    if (options) {
      if (typeof options === "function") {
        optionHandler = options;
      } else {
        optionHandler = options.optionHandler;
        if (options.replaceRequest === false) {
          replaceRequest = /* @__PURE__ */ __name((request) => request, "replaceRequest");
        } else {
          replaceRequest = options.replaceRequest;
        }
      }
    }
    const getOptions = optionHandler ? (c) => {
      const options2 = optionHandler(c);
      return Array.isArray(options2) ? options2 : [options2];
    } : (c) => {
      let executionContext = void 0;
      try {
        executionContext = c.executionCtx;
      } catch {
      }
      return [c.env, executionContext];
    };
    replaceRequest ||= (() => {
      const mergedPath = mergePath(this._basePath, path);
      const pathPrefixLength = mergedPath === "/" ? 0 : mergedPath.length;
      return (request) => {
        const url = new URL(request.url);
        url.pathname = url.pathname.slice(pathPrefixLength) || "/";
        return new Request(url, request);
      };
    })();
    const handler = /* @__PURE__ */ __name(async (c, next) => {
      const res = await applicationHandler(replaceRequest(c.req.raw), ...getOptions(c));
      if (res) {
        return res;
      }
      await next();
    }, "handler");
    this.#addRoute(METHOD_NAME_ALL, mergePath(path, "*"), handler);
    return this;
  }
  #addRoute(method, path, handler) {
    method = method.toUpperCase();
    path = mergePath(this._basePath, path);
    const r = { basePath: this._basePath, path, method, handler };
    this.router.add(method, path, [handler, r]);
    this.routes.push(r);
  }
  #handleError(err, c) {
    if (err instanceof Error) {
      return this.errorHandler(err, c);
    }
    throw err;
  }
  #dispatch(request, executionCtx, env, method) {
    if (method === "HEAD") {
      return (async () => new Response(null, await this.#dispatch(request, executionCtx, env, "GET")))();
    }
    const path = this.getPath(request, { env });
    const matchResult = this.router.match(method, path);
    const c = new Context(request, {
      path,
      matchResult,
      env,
      executionCtx,
      notFoundHandler: this.#notFoundHandler
    });
    if (matchResult[0].length === 1) {
      let res;
      try {
        res = matchResult[0][0][0][0](c, async () => {
          c.res = await this.#notFoundHandler(c);
        });
      } catch (err) {
        return this.#handleError(err, c);
      }
      return res instanceof Promise ? res.then(
        (resolved) => resolved || (c.finalized ? c.res : this.#notFoundHandler(c))
      ).catch((err) => this.#handleError(err, c)) : res ?? this.#notFoundHandler(c);
    }
    const composed = compose(matchResult[0], this.errorHandler, this.#notFoundHandler);
    return (async () => {
      try {
        const context = await composed(c);
        if (!context.finalized) {
          throw new Error(
            "Context is not finalized. Did you forget to return a Response object or `await next()`?"
          );
        }
        return context.res;
      } catch (err) {
        return this.#handleError(err, c);
      }
    })();
  }
  fetch = /* @__PURE__ */ __name((request, ...rest) => {
    return this.#dispatch(request, rest[1], rest[0], request.method);
  }, "fetch");
  request = /* @__PURE__ */ __name((input, requestInit, Env, executionCtx) => {
    if (input instanceof Request) {
      return this.fetch(requestInit ? new Request(input, requestInit) : input, Env, executionCtx);
    }
    input = input.toString();
    return this.fetch(
      new Request(
        /^https?:\/\//.test(input) ? input : `http://localhost${mergePath("/", input)}`,
        requestInit
      ),
      Env,
      executionCtx
    );
  }, "request");
  fire = /* @__PURE__ */ __name(() => {
    addEventListener("fetch", (event) => {
      event.respondWith(this.#dispatch(event.request, event, void 0, event.request.method));
    });
  }, "fire");
};

// node_modules/hono/dist/router/reg-exp-router/node.js
var LABEL_REG_EXP_STR = "[^/]+";
var ONLY_WILDCARD_REG_EXP_STR = ".*";
var TAIL_WILDCARD_REG_EXP_STR = "(?:|/.*)";
var PATH_ERROR = Symbol();
var regExpMetaChars = new Set(".\\+*[^]$()");
function compareKey(a, b) {
  if (a.length === 1) {
    return b.length === 1 ? a < b ? -1 : 1 : -1;
  }
  if (b.length === 1) {
    return 1;
  }
  if (a === ONLY_WILDCARD_REG_EXP_STR || a === TAIL_WILDCARD_REG_EXP_STR) {
    return 1;
  } else if (b === ONLY_WILDCARD_REG_EXP_STR || b === TAIL_WILDCARD_REG_EXP_STR) {
    return -1;
  }
  if (a === LABEL_REG_EXP_STR) {
    return 1;
  } else if (b === LABEL_REG_EXP_STR) {
    return -1;
  }
  return a.length === b.length ? a < b ? -1 : 1 : b.length - a.length;
}
__name(compareKey, "compareKey");
var Node = class {
  static {
    __name(this, "Node");
  }
  #index;
  #varIndex;
  #children = /* @__PURE__ */ Object.create(null);
  insert(tokens, index, paramMap, context, pathErrorCheckOnly) {
    if (tokens.length === 0) {
      if (this.#index !== void 0) {
        throw PATH_ERROR;
      }
      if (pathErrorCheckOnly) {
        return;
      }
      this.#index = index;
      return;
    }
    const [token, ...restTokens] = tokens;
    const pattern = token === "*" ? restTokens.length === 0 ? ["", "", ONLY_WILDCARD_REG_EXP_STR] : ["", "", LABEL_REG_EXP_STR] : token === "/*" ? ["", "", TAIL_WILDCARD_REG_EXP_STR] : token.match(/^\:([^\{\}]+)(?:\{(.+)\})?$/);
    let node;
    if (pattern) {
      const name = pattern[1];
      let regexpStr = pattern[2] || LABEL_REG_EXP_STR;
      if (name && pattern[2]) {
        if (regexpStr === ".*") {
          throw PATH_ERROR;
        }
        regexpStr = regexpStr.replace(/^\((?!\?:)(?=[^)]+\)$)/, "(?:");
        if (/\((?!\?:)/.test(regexpStr)) {
          throw PATH_ERROR;
        }
      }
      node = this.#children[regexpStr];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[regexpStr] = new Node();
        if (name !== "") {
          node.#varIndex = context.varIndex++;
        }
      }
      if (!pathErrorCheckOnly && name !== "") {
        paramMap.push([name, node.#varIndex]);
      }
    } else {
      node = this.#children[token];
      if (!node) {
        if (Object.keys(this.#children).some(
          (k) => k.length > 1 && k !== ONLY_WILDCARD_REG_EXP_STR && k !== TAIL_WILDCARD_REG_EXP_STR
        )) {
          throw PATH_ERROR;
        }
        if (pathErrorCheckOnly) {
          return;
        }
        node = this.#children[token] = new Node();
      }
    }
    node.insert(restTokens, index, paramMap, context, pathErrorCheckOnly);
  }
  buildRegExpStr() {
    const childKeys = Object.keys(this.#children).sort(compareKey);
    const strList = childKeys.map((k) => {
      const c = this.#children[k];
      return (typeof c.#varIndex === "number" ? `(${k})@${c.#varIndex}` : regExpMetaChars.has(k) ? `\\${k}` : k) + c.buildRegExpStr();
    });
    if (typeof this.#index === "number") {
      strList.unshift(`#${this.#index}`);
    }
    if (strList.length === 0) {
      return "";
    }
    if (strList.length === 1) {
      return strList[0];
    }
    return "(?:" + strList.join("|") + ")";
  }
};

// node_modules/hono/dist/router/reg-exp-router/trie.js
var Trie = class {
  static {
    __name(this, "Trie");
  }
  #context = { varIndex: 0 };
  #root = new Node();
  insert(path, index, pathErrorCheckOnly) {
    const paramAssoc = [];
    const groups = [];
    for (let i = 0; ; ) {
      let replaced = false;
      path = path.replace(/\{[^}]+\}/g, (m) => {
        const mark = `@\\${i}`;
        groups[i] = [mark, m];
        i++;
        replaced = true;
        return mark;
      });
      if (!replaced) {
        break;
      }
    }
    const tokens = path.match(/(?::[^\/]+)|(?:\/\*$)|./g) || [];
    for (let i = groups.length - 1; i >= 0; i--) {
      const [mark] = groups[i];
      for (let j = tokens.length - 1; j >= 0; j--) {
        if (tokens[j].indexOf(mark) !== -1) {
          tokens[j] = tokens[j].replace(mark, groups[i][1]);
          break;
        }
      }
    }
    this.#root.insert(tokens, index, paramAssoc, this.#context, pathErrorCheckOnly);
    return paramAssoc;
  }
  buildRegExp() {
    let regexp = this.#root.buildRegExpStr();
    if (regexp === "") {
      return [/^$/, [], []];
    }
    let captureIndex = 0;
    const indexReplacementMap = [];
    const paramReplacementMap = [];
    regexp = regexp.replace(/#(\d+)|@(\d+)|\.\*\$/g, (_, handlerIndex, paramIndex) => {
      if (handlerIndex !== void 0) {
        indexReplacementMap[++captureIndex] = Number(handlerIndex);
        return "$()";
      }
      if (paramIndex !== void 0) {
        paramReplacementMap[Number(paramIndex)] = ++captureIndex;
        return "";
      }
      return "";
    });
    return [new RegExp(`^${regexp}`), indexReplacementMap, paramReplacementMap];
  }
};

// node_modules/hono/dist/router/reg-exp-router/router.js
var emptyParam = [];
var nullMatcher = [/^$/, [], /* @__PURE__ */ Object.create(null)];
var wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
function buildWildcardRegExp(path) {
  return wildcardRegExpCache[path] ??= new RegExp(
    path === "*" ? "" : `^${path.replace(
      /\/\*$|([.\\+*[^\]$()])/g,
      (_, metaChar) => metaChar ? `\\${metaChar}` : "(?:|/.*)"
    )}$`
  );
}
__name(buildWildcardRegExp, "buildWildcardRegExp");
function clearWildcardRegExpCache() {
  wildcardRegExpCache = /* @__PURE__ */ Object.create(null);
}
__name(clearWildcardRegExpCache, "clearWildcardRegExpCache");
function buildMatcherFromPreprocessedRoutes(routes) {
  const trie = new Trie();
  const handlerData = [];
  if (routes.length === 0) {
    return nullMatcher;
  }
  const routesWithStaticPathFlag = routes.map(
    (route) => [!/\*|\/:/.test(route[0]), ...route]
  ).sort(
    ([isStaticA, pathA], [isStaticB, pathB]) => isStaticA ? 1 : isStaticB ? -1 : pathA.length - pathB.length
  );
  const staticMap = /* @__PURE__ */ Object.create(null);
  for (let i = 0, j = -1, len = routesWithStaticPathFlag.length; i < len; i++) {
    const [pathErrorCheckOnly, path, handlers] = routesWithStaticPathFlag[i];
    if (pathErrorCheckOnly) {
      staticMap[path] = [handlers.map(([h]) => [h, /* @__PURE__ */ Object.create(null)]), emptyParam];
    } else {
      j++;
    }
    let paramAssoc;
    try {
      paramAssoc = trie.insert(path, j, pathErrorCheckOnly);
    } catch (e) {
      throw e === PATH_ERROR ? new UnsupportedPathError(path) : e;
    }
    if (pathErrorCheckOnly) {
      continue;
    }
    handlerData[j] = handlers.map(([h, paramCount]) => {
      const paramIndexMap = /* @__PURE__ */ Object.create(null);
      paramCount -= 1;
      for (; paramCount >= 0; paramCount--) {
        const [key, value] = paramAssoc[paramCount];
        paramIndexMap[key] = value;
      }
      return [h, paramIndexMap];
    });
  }
  const [regexp, indexReplacementMap, paramReplacementMap] = trie.buildRegExp();
  for (let i = 0, len = handlerData.length; i < len; i++) {
    for (let j = 0, len2 = handlerData[i].length; j < len2; j++) {
      const map = handlerData[i][j]?.[1];
      if (!map) {
        continue;
      }
      const keys = Object.keys(map);
      for (let k = 0, len3 = keys.length; k < len3; k++) {
        map[keys[k]] = paramReplacementMap[map[keys[k]]];
      }
    }
  }
  const handlerMap = [];
  for (const i in indexReplacementMap) {
    handlerMap[i] = handlerData[indexReplacementMap[i]];
  }
  return [regexp, handlerMap, staticMap];
}
__name(buildMatcherFromPreprocessedRoutes, "buildMatcherFromPreprocessedRoutes");
function findMiddleware(middleware, path) {
  if (!middleware) {
    return void 0;
  }
  for (const k of Object.keys(middleware).sort((a, b) => b.length - a.length)) {
    if (buildWildcardRegExp(k).test(path)) {
      return [...middleware[k]];
    }
  }
  return void 0;
}
__name(findMiddleware, "findMiddleware");
var RegExpRouter = class {
  static {
    __name(this, "RegExpRouter");
  }
  name = "RegExpRouter";
  #middleware;
  #routes;
  constructor() {
    this.#middleware = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
    this.#routes = { [METHOD_NAME_ALL]: /* @__PURE__ */ Object.create(null) };
  }
  add(method, path, handler) {
    const middleware = this.#middleware;
    const routes = this.#routes;
    if (!middleware || !routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    if (!middleware[method]) {
      ;
      [middleware, routes].forEach((handlerMap) => {
        handlerMap[method] = /* @__PURE__ */ Object.create(null);
        Object.keys(handlerMap[METHOD_NAME_ALL]).forEach((p) => {
          handlerMap[method][p] = [...handlerMap[METHOD_NAME_ALL][p]];
        });
      });
    }
    if (path === "/*") {
      path = "*";
    }
    const paramCount = (path.match(/\/:/g) || []).length;
    if (/\*$/.test(path)) {
      const re = buildWildcardRegExp(path);
      if (method === METHOD_NAME_ALL) {
        Object.keys(middleware).forEach((m) => {
          middleware[m][path] ||= findMiddleware(middleware[m], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
        });
      } else {
        middleware[method][path] ||= findMiddleware(middleware[method], path) || findMiddleware(middleware[METHOD_NAME_ALL], path) || [];
      }
      Object.keys(middleware).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(middleware[m]).forEach((p) => {
            re.test(p) && middleware[m][p].push([handler, paramCount]);
          });
        }
      });
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          Object.keys(routes[m]).forEach(
            (p) => re.test(p) && routes[m][p].push([handler, paramCount])
          );
        }
      });
      return;
    }
    const paths = checkOptionalParameter(path) || [path];
    for (let i = 0, len = paths.length; i < len; i++) {
      const path2 = paths[i];
      Object.keys(routes).forEach((m) => {
        if (method === METHOD_NAME_ALL || method === m) {
          routes[m][path2] ||= [
            ...findMiddleware(middleware[m], path2) || findMiddleware(middleware[METHOD_NAME_ALL], path2) || []
          ];
          routes[m][path2].push([handler, paramCount - len + i + 1]);
        }
      });
    }
  }
  match(method, path) {
    clearWildcardRegExpCache();
    const matchers = this.#buildAllMatchers();
    this.match = (method2, path2) => {
      const matcher = matchers[method2] || matchers[METHOD_NAME_ALL];
      const staticMatch = matcher[2][path2];
      if (staticMatch) {
        return staticMatch;
      }
      const match = path2.match(matcher[0]);
      if (!match) {
        return [[], emptyParam];
      }
      const index = match.indexOf("", 1);
      return [matcher[1][index], match];
    };
    return this.match(method, path);
  }
  #buildAllMatchers() {
    const matchers = /* @__PURE__ */ Object.create(null);
    Object.keys(this.#routes).concat(Object.keys(this.#middleware)).forEach((method) => {
      matchers[method] ||= this.#buildMatcher(method);
    });
    this.#middleware = this.#routes = void 0;
    return matchers;
  }
  #buildMatcher(method) {
    const routes = [];
    let hasOwnRoute = method === METHOD_NAME_ALL;
    [this.#middleware, this.#routes].forEach((r) => {
      const ownRoute = r[method] ? Object.keys(r[method]).map((path) => [path, r[method][path]]) : [];
      if (ownRoute.length !== 0) {
        hasOwnRoute ||= true;
        routes.push(...ownRoute);
      } else if (method !== METHOD_NAME_ALL) {
        routes.push(
          ...Object.keys(r[METHOD_NAME_ALL]).map((path) => [path, r[METHOD_NAME_ALL][path]])
        );
      }
    });
    if (!hasOwnRoute) {
      return null;
    } else {
      return buildMatcherFromPreprocessedRoutes(routes);
    }
  }
};

// node_modules/hono/dist/router/smart-router/router.js
var SmartRouter = class {
  static {
    __name(this, "SmartRouter");
  }
  name = "SmartRouter";
  #routers = [];
  #routes = [];
  constructor(init) {
    this.#routers = init.routers;
  }
  add(method, path, handler) {
    if (!this.#routes) {
      throw new Error(MESSAGE_MATCHER_IS_ALREADY_BUILT);
    }
    this.#routes.push([method, path, handler]);
  }
  match(method, path) {
    if (!this.#routes) {
      throw new Error("Fatal error");
    }
    const routers = this.#routers;
    const routes = this.#routes;
    const len = routers.length;
    let i = 0;
    let res;
    for (; i < len; i++) {
      const router = routers[i];
      try {
        for (let i2 = 0, len2 = routes.length; i2 < len2; i2++) {
          router.add(...routes[i2]);
        }
        res = router.match(method, path);
      } catch (e) {
        if (e instanceof UnsupportedPathError) {
          continue;
        }
        throw e;
      }
      this.match = router.match.bind(router);
      this.#routers = [router];
      this.#routes = void 0;
      break;
    }
    if (i === len) {
      throw new Error("Fatal error");
    }
    this.name = `SmartRouter + ${this.activeRouter.name}`;
    return res;
  }
  get activeRouter() {
    if (this.#routes || this.#routers.length !== 1) {
      throw new Error("No active router has been determined yet.");
    }
    return this.#routers[0];
  }
};

// node_modules/hono/dist/router/trie-router/node.js
var emptyParams = /* @__PURE__ */ Object.create(null);
var Node2 = class {
  static {
    __name(this, "Node");
  }
  #methods;
  #children;
  #patterns;
  #order = 0;
  #params = emptyParams;
  constructor(method, handler, children) {
    this.#children = children || /* @__PURE__ */ Object.create(null);
    this.#methods = [];
    if (method && handler) {
      const m = /* @__PURE__ */ Object.create(null);
      m[method] = { handler, possibleKeys: [], score: 0 };
      this.#methods = [m];
    }
    this.#patterns = [];
  }
  insert(method, path, handler) {
    this.#order = ++this.#order;
    let curNode = this;
    const parts = splitRoutingPath(path);
    const possibleKeys = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const p = parts[i];
      const nextP = parts[i + 1];
      const pattern = getPattern(p, nextP);
      const key = Array.isArray(pattern) ? pattern[0] : p;
      if (key in curNode.#children) {
        curNode = curNode.#children[key];
        if (pattern) {
          possibleKeys.push(pattern[1]);
        }
        continue;
      }
      curNode.#children[key] = new Node2();
      if (pattern) {
        curNode.#patterns.push(pattern);
        possibleKeys.push(pattern[1]);
      }
      curNode = curNode.#children[key];
    }
    curNode.#methods.push({
      [method]: {
        handler,
        possibleKeys: possibleKeys.filter((v, i, a) => a.indexOf(v) === i),
        score: this.#order
      }
    });
    return curNode;
  }
  #getHandlerSets(node, method, nodeParams, params) {
    const handlerSets = [];
    for (let i = 0, len = node.#methods.length; i < len; i++) {
      const m = node.#methods[i];
      const handlerSet = m[method] || m[METHOD_NAME_ALL];
      const processedSet = {};
      if (handlerSet !== void 0) {
        handlerSet.params = /* @__PURE__ */ Object.create(null);
        handlerSets.push(handlerSet);
        if (nodeParams !== emptyParams || params && params !== emptyParams) {
          for (let i2 = 0, len2 = handlerSet.possibleKeys.length; i2 < len2; i2++) {
            const key = handlerSet.possibleKeys[i2];
            const processed = processedSet[handlerSet.score];
            handlerSet.params[key] = params?.[key] && !processed ? params[key] : nodeParams[key] ?? params?.[key];
            processedSet[handlerSet.score] = true;
          }
        }
      }
    }
    return handlerSets;
  }
  search(method, path) {
    const handlerSets = [];
    this.#params = emptyParams;
    const curNode = this;
    let curNodes = [curNode];
    const parts = splitPath(path);
    const curNodesQueue = [];
    for (let i = 0, len = parts.length; i < len; i++) {
      const part = parts[i];
      const isLast = i === len - 1;
      const tempNodes = [];
      for (let j = 0, len2 = curNodes.length; j < len2; j++) {
        const node = curNodes[j];
        const nextNode = node.#children[part];
        if (nextNode) {
          nextNode.#params = node.#params;
          if (isLast) {
            if (nextNode.#children["*"]) {
              handlerSets.push(
                ...this.#getHandlerSets(nextNode.#children["*"], method, node.#params)
              );
            }
            handlerSets.push(...this.#getHandlerSets(nextNode, method, node.#params));
          } else {
            tempNodes.push(nextNode);
          }
        }
        for (let k = 0, len3 = node.#patterns.length; k < len3; k++) {
          const pattern = node.#patterns[k];
          const params = node.#params === emptyParams ? {} : { ...node.#params };
          if (pattern === "*") {
            const astNode = node.#children["*"];
            if (astNode) {
              handlerSets.push(...this.#getHandlerSets(astNode, method, node.#params));
              astNode.#params = params;
              tempNodes.push(astNode);
            }
            continue;
          }
          const [key, name, matcher] = pattern;
          if (!part && !(matcher instanceof RegExp)) {
            continue;
          }
          const child = node.#children[key];
          const restPathString = parts.slice(i).join("/");
          if (matcher instanceof RegExp) {
            const m = matcher.exec(restPathString);
            if (m) {
              params[name] = m[0];
              handlerSets.push(...this.#getHandlerSets(child, method, node.#params, params));
              if (Object.keys(child.#children).length) {
                child.#params = params;
                const componentCount = m[0].match(/\//)?.length ?? 0;
                const targetCurNodes = curNodesQueue[componentCount] ||= [];
                targetCurNodes.push(child);
              }
              continue;
            }
          }
          if (matcher === true || matcher.test(part)) {
            params[name] = part;
            if (isLast) {
              handlerSets.push(...this.#getHandlerSets(child, method, params, node.#params));
              if (child.#children["*"]) {
                handlerSets.push(
                  ...this.#getHandlerSets(child.#children["*"], method, params, node.#params)
                );
              }
            } else {
              child.#params = params;
              tempNodes.push(child);
            }
          }
        }
      }
      curNodes = tempNodes.concat(curNodesQueue.shift() ?? []);
    }
    if (handlerSets.length > 1) {
      handlerSets.sort((a, b) => {
        return a.score - b.score;
      });
    }
    return [handlerSets.map(({ handler, params }) => [handler, params])];
  }
};

// node_modules/hono/dist/router/trie-router/router.js
var TrieRouter = class {
  static {
    __name(this, "TrieRouter");
  }
  name = "TrieRouter";
  #node;
  constructor() {
    this.#node = new Node2();
  }
  add(method, path, handler) {
    const results = checkOptionalParameter(path);
    if (results) {
      for (let i = 0, len = results.length; i < len; i++) {
        this.#node.insert(method, results[i], handler);
      }
      return;
    }
    this.#node.insert(method, path, handler);
  }
  match(method, path) {
    return this.#node.search(method, path);
  }
};

// node_modules/hono/dist/hono.js
var Hono2 = class extends Hono {
  static {
    __name(this, "Hono");
  }
  constructor(options = {}) {
    super(options);
    this.router = options.router ?? new SmartRouter({
      routers: [new RegExpRouter(), new TrieRouter()]
    });
  }
};

// node_modules/hono/dist/middleware/cors/index.js
var cors = /* @__PURE__ */ __name((options) => {
  const defaults = {
    origin: "*",
    allowMethods: ["GET", "HEAD", "PUT", "POST", "DELETE", "PATCH"],
    allowHeaders: [],
    exposeHeaders: []
  };
  const opts = {
    ...defaults,
    ...options
  };
  const findAllowOrigin = ((optsOrigin) => {
    if (typeof optsOrigin === "string") {
      if (optsOrigin === "*") {
        return () => optsOrigin;
      } else {
        return (origin) => optsOrigin === origin ? origin : null;
      }
    } else if (typeof optsOrigin === "function") {
      return optsOrigin;
    } else {
      return (origin) => optsOrigin.includes(origin) ? origin : null;
    }
  })(opts.origin);
  const findAllowMethods = ((optsAllowMethods) => {
    if (typeof optsAllowMethods === "function") {
      return optsAllowMethods;
    } else if (Array.isArray(optsAllowMethods)) {
      return () => optsAllowMethods;
    } else {
      return () => [];
    }
  })(opts.allowMethods);
  return /* @__PURE__ */ __name(async function cors2(c, next) {
    function set(key, value) {
      c.res.headers.set(key, value);
    }
    __name(set, "set");
    const allowOrigin = findAllowOrigin(c.req.header("origin") || "", c);
    if (allowOrigin) {
      set("Access-Control-Allow-Origin", allowOrigin);
    }
    if (opts.origin !== "*") {
      const existingVary = c.req.header("Vary");
      if (existingVary) {
        set("Vary", existingVary);
      } else {
        set("Vary", "Origin");
      }
    }
    if (opts.credentials) {
      set("Access-Control-Allow-Credentials", "true");
    }
    if (opts.exposeHeaders?.length) {
      set("Access-Control-Expose-Headers", opts.exposeHeaders.join(","));
    }
    if (c.req.method === "OPTIONS") {
      if (opts.maxAge != null) {
        set("Access-Control-Max-Age", opts.maxAge.toString());
      }
      const allowMethods = findAllowMethods(c.req.header("origin") || "", c);
      if (allowMethods.length) {
        set("Access-Control-Allow-Methods", allowMethods.join(","));
      }
      let headers = opts.allowHeaders;
      if (!headers?.length) {
        const requestHeaders = c.req.header("Access-Control-Request-Headers");
        if (requestHeaders) {
          headers = requestHeaders.split(/\s*,\s*/);
        }
      }
      if (headers?.length) {
        set("Access-Control-Allow-Headers", headers.join(","));
        c.res.headers.append("Vary", "Access-Control-Request-Headers");
      }
      c.res.headers.delete("Content-Length");
      c.res.headers.delete("Content-Type");
      return new Response(null, {
        headers: c.res.headers,
        status: 204,
        statusText: "No Content"
      });
    }
    await next();
  }, "cors2");
}, "cors");

// node_modules/hono/dist/utils/color.js
function getColorEnabled() {
  const { process, Deno } = globalThis;
  const isNoColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : process !== void 0 ? "NO_COLOR" in process?.env : false;
  return !isNoColor;
}
__name(getColorEnabled, "getColorEnabled");
async function getColorEnabledAsync() {
  const { navigator } = globalThis;
  const cfWorkers = "cloudflare:workers";
  const isNoColor = navigator !== void 0 && navigator.userAgent === "Cloudflare-Workers" ? await (async () => {
    try {
      return "NO_COLOR" in ((await import(cfWorkers)).env ?? {});
    } catch {
      return false;
    }
  })() : !getColorEnabled();
  return !isNoColor;
}
__name(getColorEnabledAsync, "getColorEnabledAsync");

// node_modules/hono/dist/middleware/logger/index.js
var humanize = /* @__PURE__ */ __name((times) => {
  const [delimiter, separator] = [",", "."];
  const orderTimes = times.map((v) => v.replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1" + delimiter));
  return orderTimes.join(separator);
}, "humanize");
var time = /* @__PURE__ */ __name((start) => {
  const delta = Date.now() - start;
  return humanize([delta < 1e3 ? delta + "ms" : Math.round(delta / 1e3) + "s"]);
}, "time");
var colorStatus = /* @__PURE__ */ __name(async (status) => {
  const colorEnabled = await getColorEnabledAsync();
  if (colorEnabled) {
    switch (status / 100 | 0) {
      case 5:
        return `\x1B[31m${status}\x1B[0m`;
      case 4:
        return `\x1B[33m${status}\x1B[0m`;
      case 3:
        return `\x1B[36m${status}\x1B[0m`;
      case 2:
        return `\x1B[32m${status}\x1B[0m`;
    }
  }
  return `${status}`;
}, "colorStatus");
async function log(fn, prefix, method, path, status = 0, elapsed) {
  const out = prefix === "<--" ? `${prefix} ${method} ${path}` : `${prefix} ${method} ${path} ${await colorStatus(status)} ${elapsed}`;
  fn(out);
}
__name(log, "log");
var logger = /* @__PURE__ */ __name((fn = console.log) => {
  return /* @__PURE__ */ __name(async function logger2(c, next) {
    const { method, url } = c.req;
    const path = url.slice(url.indexOf("/", 8));
    await log(fn, "<--", method, path);
    const start = Date.now();
    await next();
    await log(fn, "-->", method, path, c.res.status, time(start));
  }, "logger2");
}, "logger");

// src/services/AIService.ts
var AIService = class _AIService {
  static {
    __name(this, "AIService");
  }
  // 🔥 修复：使用更可靠的对话历史存储机制
  static conversations = /* @__PURE__ */ new Map();
  // 🔥 改进：确保对话历史的持久性和一致性
  async getConversationHistory(conversationId) {
    let history = _AIService.conversations.get(conversationId);
    if (!history) {
      history = [];
      _AIService.conversations.set(conversationId, history);
      console.log(`\u521B\u5EFA\u65B0\u5BF9\u8BDD\u5386\u53F2\uFF0CID: ${conversationId}`);
    } else {
      console.log(`\u83B7\u53D6\u73B0\u6709\u5BF9\u8BDD\u5386\u53F2\uFF0CID: ${conversationId}, \u957F\u5EA6: ${history.length}`);
    }
    return history;
  }
  // 🔥 新增：保存对话历史到存储
  async saveConversationHistory(conversationId, history) {
    _AIService.conversations.set(conversationId, history);
    console.log(`\u4FDD\u5B58\u5BF9\u8BDD\u5386\u53F2\uFF0CID: ${conversationId}, \u957F\u5EA6: ${history.length}`);
    if (_AIService.conversations.size > 100) {
      const oldestKey = _AIService.conversations.keys().next().value;
      _AIService.conversations.delete(oldestKey);
      console.log(`\u6E05\u7406\u65E7\u5BF9\u8BDD\u5386\u53F2: ${oldestKey}`);
    }
  }
  async chat(message, conversationId, provider, apiConfig) {
    try {
      console.log("AIService.chat \u5F00\u59CB:", { provider, hasApiConfig: !!apiConfig, messageLength: message.length });
      if (!conversationId) {
        conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      }
      const conversationHistory = await this.getConversationHistory(conversationId);
      console.log("\u5BF9\u8BDD\u5386\u53F2\u957F\u5EA6:", conversationHistory.length);
      conversationHistory.push({
        role: "user",
        content: message
      });
      if (conversationHistory.length > 20) {
        conversationHistory.splice(0, conversationHistory.length - 20);
      }
      let fullPrompt = "";
      if (provider === "claude") {
        console.log("\u6784\u5EFAClaude\u63D0\u793A\u8BCD...");
        fullPrompt = this.buildPromptWithHistory(message, conversationHistory);
      }
      let response;
      console.log(`\u8C03\u7528 ${provider} provider...`);
      switch (provider) {
        case "openai":
          if (apiConfig?.apiUrl && !apiConfig.apiUrl.includes("api.openai.com")) {
            console.log("\u4F7F\u7528\u81EA\u5B9A\u4E49OpenAI\u517C\u5BB9API");
            response = await this.callCustomAPI(message, apiConfig, conversationHistory);
          } else {
            response = await this.callOpenAI(message, apiConfig, conversationHistory);
          }
          break;
        case "claude":
          {
            const requestFormat = apiConfig?.requestFormat;
            const apiUrl = apiConfig?.apiUrl || "";
            const looksLikeClaudeEndpoint = /anthropic\.com/i.test(apiUrl) || /\/messages(\/?$)/i.test(apiUrl);
            if ((requestFormat === "claude" || looksLikeClaudeEndpoint) && apiUrl.includes("anthropic.com")) {
              response = await this.callClaude(fullPrompt, apiConfig);
            } else {
              console.log("Claude provider: \u4F7F\u7528Custom API\u65B9\u6CD5\uFF0CURL:", apiUrl);
              response = await this.callCustomAPI(message, apiConfig, conversationHistory);
            }
          }
          break;
        case "gemini":
          if (apiConfig?.apiUrl && apiConfig.apiUrl.includes("generativelanguage.googleapis.com")) {
            response = await this.callGemini(message, apiConfig, conversationHistory);
          } else {
            console.log("Gemini provider: \u4F7F\u7528Custom API\u65B9\u6CD5\uFF0CURL:", apiConfig?.apiUrl);
            response = await this.callCustomAPI(message, apiConfig, conversationHistory);
          }
          break;
        case "doubao":
          if (apiConfig?.apiUrl && (apiConfig.apiUrl.includes("volces.com") || apiConfig.apiUrl.includes("ark.cn"))) {
            response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || "https://ark.cn-beijing.volces.com/api/v3") + "/chat/completions" }, conversationHistory);
          } else {
            console.log("Doubao provider: \u4F7F\u7528Custom API\u65B9\u6CD5\uFF0CURL:", apiConfig?.apiUrl);
            response = await this.callCustomAPI(message, apiConfig, conversationHistory);
          }
          break;
        case "siliconflow":
          response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || "https://api.siliconflow.cn/v1") + "/chat/completions" }, conversationHistory);
          break;
        case "qwen":
          response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || "https://dashscope.aliyuncs.com/compatible-mode/v1") + "/chat/completions" }, conversationHistory);
          break;
        case "perplexity":
          response = await this.callOpenAI(message, { ...apiConfig, apiUrl: (apiConfig?.apiUrl || "https://api.perplexity.ai") + "/chat/completions" }, conversationHistory);
          break;
        case "custom":
          response = await this.callCustomAPI(message, apiConfig, conversationHistory);
          break;
        case "mock":
          response = await this.mockResponse(message, conversationHistory);
          break;
        default:
          throw new Error(`\u4E0D\u652F\u6301\u7684\u63D0\u4F9B\u5546: ${provider}`);
      }
      console.log(`${provider} provider \u8C03\u7528\u5B8C\u6210\uFF0C\u54CD\u5E94\u7C7B\u578B:`, typeof response);
      if (response && response.response) {
        conversationHistory.push({
          role: "assistant",
          content: response.response
        });
        await this.saveConversationHistory(conversationId, conversationHistory);
      }
      if (response && response.response && provider !== "mock") {
        console.log("\u5F00\u59CB\u63D0\u53D6\u7535\u8DEF\u6570\u636E\uFF0C\u54CD\u5E94\u957F\u5EA6:", response.response.length);
        try {
          let circuit_data = null;
          let bom_data = null;
          const extractionPromise = this.extractDataFromResponse(response.response);
          const timeoutPromise = new Promise(
            (_, reject) => setTimeout(() => reject(new Error("\u6570\u636E\u63D0\u53D6\u8D85\u65F6")), 1e4)
            // 10秒超时
          );
          const extractionResult = await Promise.race([extractionPromise, timeoutPromise]);
          circuit_data = extractionResult?.circuit_data;
          bom_data = extractionResult?.bom_data;
          console.log("\u63D0\u53D6\u7ED3\u679C:", {
            hasCircuitData: !!circuit_data,
            hasBomData: !!bom_data,
            circuitComponents: circuit_data?.components?.length || 0,
            bomItems: bom_data?.items?.length || 0
          });
          if (circuit_data) response.circuit_data = circuit_data;
          if (bom_data) response.bom_data = bom_data;
        } catch (extractError) {
          console.error("\u6570\u636E\u63D0\u53D6\u5931\u8D25\u6216\u8D85\u65F6:", extractError.message);
        }
      }
      return {
        ...response,
        conversationId,
        conversation_id: conversationId
      };
    } catch (error) {
      console.error(`\u274C AIService.chat ${provider} \u8BE6\u7EC6\u9519\u8BEF:`, {
        message: error.message,
        stack: error.stack?.substring(0, 500),
        conversationId,
        messageLength: message.length,
        hasApiConfig: !!apiConfig,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      console.error(`\u274C ${provider} provider \u8C03\u7528\u5931\u8D25\uFF0C\u9700\u8981\u771F\u6B63\u4FEE\u590DAPI\u95EE\u9898`);
      throw new Error(`${provider} provider\u8C03\u7528\u5931\u8D25: ${error.message}`);
    }
  }
  async testConfig(config) {
    try {
      console.log("\u5F00\u59CB\u771F\u5B9EAPI\u914D\u7F6E\u6D4B\u8BD5:", {
        provider: config.provider,
        hasApiUrl: !!config.apiUrl,
        hasApiKey: !!config.apiKey,
        model: config.model
      });
      const testMessage = "\u8BF7\u56DE\u7B54\uFF1A\u8FD9\u662F\u4E00\u4E2AAPI\u8FDE\u63A5\u6D4B\u8BD5\uFF0C\u8BF7\u7B80\u5355\u56DE\u590D'\u6D4B\u8BD5\u6210\u529F'";
      const response = await this.callCustomAPI(testMessage, config, void 0);
      console.log("API\u6D4B\u8BD5\u54CD\u5E94:", {
        hasResponse: !!response.response,
        responseLength: response.response?.length || 0,
        responsePreview: response.response?.substring(0, 100)
      });
      if (!response || !response.response || response.response.length < 5) {
        throw new Error("API\u8FD4\u56DE\u7684\u54CD\u5E94\u65E0\u6548\u6216\u592A\u77ED");
      }
      const hasExpectedContent = response.response.toLowerCase().includes("\u6D4B\u8BD5") || response.response.toLowerCase().includes("\u6210\u529F") || response.response.toLowerCase().includes("test");
      console.log("API\u6D4B\u8BD5\u9A8C\u8BC1\u7ED3\u679C:", {
        responseValid: true,
        hasExpectedContent,
        actualResponse: response.response.substring(0, 200)
      });
      return {
        isValid: true,
        provider: config.provider,
        model: config.model,
        testResponse: response.response.substring(0, 100) + (response.response.length > 100 ? "..." : ""),
        responseLength: response.response.length
      };
    } catch (error) {
      console.error("API\u914D\u7F6E\u6D4B\u8BD5\u5931\u8D25:", {
        provider: config.provider,
        error: error.message,
        stack: error.stack?.substring(0, 300)
      });
      return {
        isValid: false,
        provider: config.provider,
        error: error.message,
        details: "\u771F\u5B9EAPI\u8C03\u7528\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5\u914D\u7F6E\u53C2\u6570"
      };
    }
  }
  async callCustomAPI(message, config, conversationHistory) {
    try {
      if (!config) {
        throw new Error("Custom API\u914D\u7F6E\u4E3A\u7A7A\uFF0C\u8BF7\u8BBE\u7F6EAPI URL\u3001\u5BC6\u94A5\u548C\u6A21\u578B");
      }
      const { apiUrl, apiKey, model, customHeaders } = config;
      console.log("\u{1F680} Custom API\u8C03\u7528\u5F00\u59CB:", {
        hasConfig: !!config,
        apiUrl: apiUrl?.substring(0, 50) + "...",
        model,
        hasApiKey: !!apiKey,
        messageLength: message.length,
        historyLength: conversationHistory?.length || 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      if (!apiUrl || !apiKey || !model) {
        throw new Error(`Custom API\u914D\u7F6E\u4E0D\u5B8C\u6574: apiUrl=${!!apiUrl}, apiKey=${!!apiKey}, model=${!!model}`);
      }
      const messages = this.buildCustomAPIMessages(message, conversationHistory);
      const requestBody = {
        model,
        messages,
        max_tokens: 2e3,
        temperature: 0.7
      };
      let fullUrl = apiUrl;
      if (apiUrl.includes("volces.com") || apiUrl.includes("ark.cn")) {
        fullUrl = `${apiUrl}/chat/completions`;
      } else if (!apiUrl.includes("/chat/completions") && !apiUrl.includes("/v1/chat/completions")) {
        fullUrl = `${apiUrl}/v1/chat/completions`;
      }
      console.log("\u{1F4E4} Custom API\u8BF7\u6C42\u8BE6\u60C5:", {
        url: fullUrl,
        messageCount: requestBody.messages.length,
        modelUsed: requestBody.model,
        maxTokens: requestBody.max_tokens,
        temperature: requestBody.temperature
      });
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3e4);
      const response = await fetch(fullUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${apiKey}`,
          ...customHeaders || {}
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal
      });
      clearTimeout(timeoutId);
      console.log("Custom API\u54CD\u5E94\u72B6\u6001:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Custom API\u9519\u8BEF\u54CD\u5E94:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Custom API\u8C03\u7528\u5931\u8D25: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      console.log("Custom API\u54CD\u5E94\u6570\u636E\u7ED3\u6784:", Object.keys(data));
      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
        console.error("Custom API\u54CD\u5E94\u683C\u5F0F\u5F02\u5E38:", data);
        throw new Error("Custom API\u8FD4\u56DE\u6570\u636E\u683C\u5F0F\u5F02\u5E38");
      }
      const responseText = data.choices[0].message.content;
      console.log("Custom API\u8C03\u7528\u6210\u529F\uFF0C\u54CD\u5E94\u957F\u5EA6:", responseText.length);
      return {
        response: responseText,
        conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: "custom"
      };
    } catch (error) {
      console.error("Custom API\u8C03\u7528\u5F02\u5E38:", error);
      if (error.message.includes("fetch")) {
        throw new Error("Custom API\u7F51\u7EDC\u8FDE\u63A5\u5931\u8D25\uFF0C\u8BF7\u68C0\u67E5API\u5730\u5740\u548C\u7F51\u7EDC\u8FDE\u63A5");
      } else if (error.message.includes("401")) {
        throw new Error("Custom API\u5BC6\u94A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F");
      } else if (error.message.includes("403")) {
        throw new Error("Custom API\u8BBF\u95EE\u88AB\u62D2\u7EDD\uFF0C\u8BF7\u68C0\u67E5API\u5BC6\u94A5\u6743\u9650");
      } else {
        throw new Error(`Custom API\u8C03\u7528\u5931\u8D25: ${error.message}`);
      }
    }
  }
  async callOpenAI(message, config, conversationHistory) {
    const { apiKey, model = "gpt-3.5-turbo", customHeaders } = config;
    let base = config && config.apiUrl && config.apiUrl.startsWith("http") ? config.apiUrl.replace(/\/$/, "") : "https://api.openai.com/v1";
    let fullUrl = base;
    if (!/\/chat\/completions$/.test(base)) {
      if (/\/v1$/.test(base)) {
        fullUrl = `${base}/chat/completions`;
      } else if (/\/v1\/.+/.test(base)) {
        fullUrl = base;
      } else {
        fullUrl = `${base}/v1/chat/completions`;
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3e4);
    const response = await fetch(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
        ...customHeaders || {}
      },
      body: JSON.stringify({
        model,
        messages: this.buildOpenAIMessages(message, conversationHistory),
        max_tokens: 2e3,
        temperature: 0.7
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`OpenAI API\u8C03\u7528\u5931\u8D25: ${response.status} ${response.statusText} - ${errText}`);
    }
    const data = await response.json();
    const responseText = data.choices[0].message.content;
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: "openai"
    };
  }
  async callClaude(message, config) {
    const { apiKey, model = "claude-3-5-sonnet-20240620", apiUrl, customHeaders, authMode } = config;
    let base = apiUrl && apiUrl.startsWith("http") ? apiUrl.replace(/\/$/, "") : "https://api.anthropic.com";
    let fullUrl = base;
    if (!/\/v1\/messages$/.test(base)) {
      if (/\/v1$/.test(base)) {
        fullUrl = `${base}/messages`;
      } else if (/\/v1\/.+/.test(base)) {
        fullUrl = base;
      } else {
        fullUrl = `${base}/v1/messages`;
      }
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45e3);
    const headers = {
      "Content-Type": "application/json",
      ...customHeaders || {}
    };
    if (authMode === "x-api-key" || headers["x-api-key"]) {
      headers["x-api-key"] = headers["x-api-key"] || apiKey;
      delete headers["Authorization"];
    } else {
      headers["Authorization"] = headers["Authorization"] || `Bearer ${apiKey}`;
      delete headers["x-api-key"];
    }
    const response = await fetch(fullUrl, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        max_tokens: 2e3,
        // 按 Anthropic Messages API 要求，content 使用块数组更稳妥
        messages: [
          { role: "user", content: [{ type: "text", text: message }] }
        ]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude API\u8C03\u7528\u5931\u8D25: ${response.status} ${response.statusText} - ${errText}`);
    }
    const data = await response.json();
    const responseText = Array.isArray(data.content) && data.content[0] ? data.content[0].text || "" : "";
    return {
      response: responseText,
      conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      provider: "claude"
    };
  }
  async callGemini(message, config, conversationHistory) {
    try {
      const { apiKey, model = "gemini-pro" } = config;
      if (!apiKey) {
        throw new Error("Gemini API Key \u672A\u914D\u7F6E");
      }
      console.log("Gemini API\u8C03\u7528\u5F00\u59CB:", {
        model,
        messageLength: message.length,
        historyLength: conversationHistory?.length || 0,
        timestamp: (/* @__PURE__ */ new Date()).toISOString()
      });
      const contents = [];
      const isFirstMessage = !conversationHistory || conversationHistory.length === 1;
      if (isFirstMessage) {
        const systemPrompt = this.buildCircuitDesignPrompt(message);
        contents.push({
          role: "user",
          parts: [{ text: systemPrompt }]
        });
        console.log("\u4F7F\u7528\u5B8C\u6574\u7CFB\u7EDF\u63D0\u793A\u8BCD - \u9996\u6B21\u5BF9\u8BDD");
      } else {
        console.log("\u4F7F\u7528\u5BF9\u8BDD\u5386\u53F2 - \u540E\u7EED\u5BF9\u8BDD\uFF0C\u5386\u53F2\u957F\u5EA6:", conversationHistory.length);
        const recentHistory = conversationHistory.slice(-13, -1);
        if (recentHistory.length > 0) {
          contents.push({
            role: "user",
            parts: [{ text: "\u4F60\u662F\u4E13\u4E1A\u7684\u786C\u4EF6\u7535\u8DEF\u8BBE\u8BA1\u4E13\u5BB6\u3002\u57FA\u4E8E\u6211\u4EEC\u4E4B\u524D\u7684\u5BF9\u8BDD\uFF0C\u8BF7\u7EE7\u7EED\u4E3A\u6211\u63D0\u4F9B\u4E13\u4E1A\u7684\u6280\u672F\u652F\u6301\u3002" }]
          });
          for (const msg of recentHistory) {
            if (msg.role === "user") {
              contents.push({
                role: "user",
                parts: [{ text: msg.content }]
              });
            } else if (msg.role === "assistant") {
              contents.push({
                role: "model",
                parts: [{ text: msg.content }]
              });
            }
          }
        }
        contents.push({
          role: "user",
          parts: [{ text: message }]
        });
      }
      const requestBody = {
        contents,
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 4096
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      };
      console.log("Gemini\u8BF7\u6C42\u4F53:", JSON.stringify(requestBody, null, 2));
      const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;
      console.log("Gemini API URL:", apiUrl);
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(requestBody)
      });
      console.log("Gemini\u54CD\u5E94\u72B6\u6001:", response.status, response.statusText);
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Gemini API\u9519\u8BEF\u54CD\u5E94:", {
          status: response.status,
          statusText: response.statusText,
          body: errorText,
          url: apiUrl
        });
        throw new Error(`Gemini API\u8C03\u7528\u5931\u8D25: ${response.status} ${response.statusText} - ${errorText}`);
      }
      const data = await response.json();
      console.log("Gemini\u54CD\u5E94\u6570\u636E\u7ED3\u6784:", Object.keys(data));
      console.log("Gemini\u5B8C\u6574\u54CD\u5E94:", JSON.stringify(data, null, 2));
      if (!data.candidates) {
        console.error("\u7F3A\u5C11candidates\u5B57\u6BB5:", data);
        throw new Error("Gemini API\u8FD4\u56DE\u7F3A\u5C11candidates\u5B57\u6BB5");
      }
      if (!Array.isArray(data.candidates) || data.candidates.length === 0) {
        console.error("candidates\u4E0D\u662F\u6570\u7EC4\u6216\u4E3A\u7A7A:", data.candidates);
        throw new Error("Gemini API\u8FD4\u56DEcandidates\u4E3A\u7A7A");
      }
      if (!data.candidates[0]) {
        console.error("candidates[0]\u4E3A\u7A7A:", data.candidates);
        throw new Error("Gemini API\u8FD4\u56DEcandidates[0]\u4E3A\u7A7A");
      }
      if (!data.candidates[0].content) {
        console.error("candidates[0].content\u4E3A\u7A7A:", data.candidates[0]);
        throw new Error("Gemini API\u8FD4\u56DEcontent\u4E3A\u7A7A");
      }
      if (data.candidates[0].finishReason === "SAFETY") {
        console.error("\u54CD\u5E94\u88AB\u5B89\u5168\u8FC7\u6EE4\u5668\u963B\u6B62:", data.candidates[0]);
        throw new Error("Gemini API\u54CD\u5E94\u88AB\u5B89\u5168\u8FC7\u6EE4\u5668\u963B\u6B62\uFF0C\u8BF7\u8C03\u6574\u5B89\u5168\u8BBE\u7F6E\u6216\u4FEE\u6539\u95EE\u9898");
      }
      if (!data.candidates[0].content.parts) {
        console.error("candidates[0].content.parts\u4E3A\u7A7A:", data.candidates[0].content);
        console.error("\u53EF\u80FD\u539F\u56E0: finishReason =", data.candidates[0].finishReason);
        throw new Error(`Gemini API\u8FD4\u56DEparts\u4E3A\u7A7A\uFF0C\u539F\u56E0: ${data.candidates[0].finishReason || "\u672A\u77E5"}`);
      }
      if (!Array.isArray(data.candidates[0].content.parts) || data.candidates[0].content.parts.length === 0) {
        console.error("parts\u4E0D\u662F\u6570\u7EC4\u6216\u4E3A\u7A7A:", data.candidates[0].content.parts);
        console.error("\u53EF\u80FD\u539F\u56E0: finishReason =", data.candidates[0].finishReason);
        throw new Error(`Gemini API\u8FD4\u56DEparts\u6570\u7EC4\u4E3A\u7A7A\uFF0C\u539F\u56E0: ${data.candidates[0].finishReason || "\u672A\u77E5"}`);
      }
      if (!data.candidates[0].content.parts[0]) {
        console.error("parts[0]\u4E3A\u7A7A:", data.candidates[0].content.parts);
        throw new Error("Gemini API\u8FD4\u56DEparts[0]\u4E3A\u7A7A");
      }
      if (!data.candidates[0].content.parts[0].text) {
        console.error("parts[0].text\u4E3A\u7A7A:", data.candidates[0].content.parts[0]);
        throw new Error("Gemini API\u8FD4\u56DEtext\u4E3A\u7A7A");
      }
      const responseText = data.candidates[0].content.parts[0].text;
      console.log("Gemini API\u8C03\u7528\u6210\u529F\uFF0C\u54CD\u5E94\u957F\u5EA6:", responseText.length);
      return {
        response: responseText,
        conversation_id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        provider: "gemini"
      };
    } catch (error) {
      console.error("Gemini API\u8C03\u7528\u5F02\u5E38:", error);
      if (error.message.includes("timeout")) {
        throw new Error("Gemini API\u8C03\u7528\u8D85\u65F6\uFF0C\u8BF7\u68C0\u67E5\u7F51\u7EDC\u8FDE\u63A5\u6216\u7A0D\u540E\u91CD\u8BD5");
      } else if (error.message.includes("401")) {
        throw new Error("Gemini API\u5BC6\u94A5\u65E0\u6548\u6216\u5DF2\u8FC7\u671F");
      } else if (error.message.includes("403")) {
        throw new Error("Gemini API\u8BBF\u95EE\u88AB\u62D2\u7EDD\uFF0C\u8BF7\u68C0\u67E5API\u5BC6\u94A5\u6743\u9650");
      } else if (error.message.includes("429")) {
        throw new Error("Gemini API\u8BF7\u6C42\u9891\u7387\u8FC7\u9AD8\uFF0C\u8BF7\u7A0D\u540E\u91CD\u8BD5");
      } else {
        throw new Error(`Gemini API\u8C03\u7528\u5931\u8D25: ${error.message}`);
      }
    }
  }
  async mockResponse(message, history) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const isFollowUp = history.length > 1;
    const hasCircuitKeywords = message.includes("\u7535\u8DEF") || message.includes("\u8BBE\u8BA1") || message.includes("LED") || message.includes("\u7A33\u538B");
    let response = `Mock API \u6536\u5230\u6D88\u606F: "${message}"

`;
    let circuit_data = null;
    let bom_data = null;
    if (isFollowUp) {
      if (message.includes("\u4F18\u5316") || message.includes("\u6539\u8FDB") || message.includes("\u4FEE\u6539")) {
        response += `\u57FA\u4E8E\u524D\u9762\u7684\u8BBE\u8BA1\uFF0C\u6211\u5EFA\u8BAE\u4EE5\u4E0B\u4F18\u5316\u65B9\u6848\uFF1A

1. \u589E\u52A0\u6EE4\u6CE2\u7535\u5BB9\u4EE5\u63D0\u9AD8\u7A33\u5B9A\u6027
2. \u91C7\u7528\u66F4\u7CBE\u5BC6\u7684\u7535\u963B\u4EE5\u63D0\u9AD8\u7CBE\u5EA6
3. \u6DFB\u52A0\u4FDD\u62A4\u7535\u8DEF\u9632\u6B62\u8FC7\u6D41

\u8FD9\u6837\u53EF\u4EE5\u8BA9\u7535\u8DEF\u6027\u80FD\u66F4\u4F73\u3002`;
      } else if (message.includes("\u53C2\u6570") || message.includes("\u8BA1\u7B97")) {
        response += `\u6839\u636E\u524D\u9762\u7684\u7535\u8DEF\u8BBE\u8BA1\uFF0C\u5173\u952E\u53C2\u6570\u8BA1\u7B97\u5982\u4E0B\uFF1A

- \u9650\u6D41\u7535\u963B\uFF1AR = (Vin - Vf) / If = (5V - 2V) / 10mA = 300\u03A9
- \u529F\u8017\uFF1AP = I\xB2R = (0.01A)\xB2 \xD7 330\u03A9 = 0.033W
- \u7535\u6D41\u7CBE\u5EA6\uFF1A\xB15% (\u53D6\u51B3\u4E8E\u7535\u963B\u7CBE\u5EA6)

\u9009\u62E9330\u03A9\u6807\u51C6\u963B\u503C\u6BD4\u8F83\u5408\u9002\u3002`;
      } else {
        response += `\u57FA\u4E8E\u6211\u4EEC\u524D\u9762\u8BA8\u8BBA\u7684\u7535\u8DEF\uFF0C\u6211\u7406\u89E3\u60A8\u60F3\u4E86\u89E3\u66F4\u591A\u6280\u672F\u7EC6\u8282\u3002\u8BF7\u544A\u8BC9\u6211\u60A8\u5177\u4F53\u60F3\u4E86\u89E3\u54EA\u4E2A\u65B9\u9762\uFF0C\u6211\u53EF\u4EE5\u63D0\u4F9B\u66F4\u8BE6\u7EC6\u7684\u89E3\u91CA\u3002

## \u6DF1\u5165\u5206\u6790\u5EFA\u8BAE
\u57FA\u4E8E\u524D\u9762\u7684LED\u9A71\u52A8\u7535\u8DEF\uFF0C\u5982\u679C\u60A8\u60F3\u8FDB\u4E00\u6B65\u4E86\u89E3\uFF1A
1. **\u529F\u8017\u8BA1\u7B97**\uFF1A\u5F53\u524D\u7535\u8DEF\u529F\u8017\u7EA6\u4E3A P = I\xB2R = (0.01A)\xB2 \xD7 330\u03A9 = 0.033W
2. **\u6563\u70ED\u8BBE\u8BA1**\uFF1A1/4W\u7535\u963B\u8DB3\u591F\uFF0C\u65E0\u9700\u989D\u5916\u6563\u70ED
3. **\u53EF\u9760\u6027\u63D0\u5347**\uFF1A\u53EF\u4EE5\u5E76\u8054\u4E00\u4E2A\u5C0F\u7535\u5BB9\u6539\u5584\u7A33\u5B9A\u6027
4. **\u6210\u672C\u4F18\u5316**\uFF1A\u4F7F\u7528\u6807\u51C6\u963B\u503C\u53EF\u4EE5\u964D\u4F4E\u91C7\u8D2D\u6210\u672C`;
      }
    } else if (hasCircuitKeywords) {
      response = `\u6839\u636E\u60A8\u7684\u9700\u6C42\uFF0C\u6211\u4E3A\u60A8\u8BBE\u8BA1\u4E86\u4EE5\u4E0BLED\u9A71\u52A8\u7535\u8DEF\uFF1A

## \u7535\u8DEF\u8BBE\u8BA1

\`\`\`
     VCC
      |
     [R1]
      |
     LED1
      |
     GND
\`\`\`

## \u7535\u8DEF\u8BF4\u660E
**\u8BBE\u8BA1\u539F\u7406\uFF1A** \u8FD9\u662F\u4E00\u4E2A\u57FA\u672C\u7684LED\u9A71\u52A8\u7535\u8DEF\uFF0C\u901A\u8FC7\u9650\u6D41\u7535\u963BR1\u63A7\u5236\u6D41\u8FC7LED1\u7684\u7535\u6D41\uFF0C\u786E\u4FDDLED\u5B89\u5168\u5DE5\u4F5C\u3002\u7535\u8DEF\u4ECEVCC\u83B7\u53D6\u7535\u6E90\uFF0C\u7ECF\u8FC7R1\u9650\u6D41\u540E\u70B9\u4EAELED1\uFF0C\u6700\u540E\u901A\u8FC7GND\u5F62\u6210\u5B8C\u6574\u56DE\u8DEF\u3002

**\u8BA1\u7B97\u65B9\u6CD5\uFF1A** \u9650\u6D41\u7535\u963B\u8BA1\u7B97\u516C\u5F0F\uFF1AR = (VCC - VF) / IF\uFF0C\u5176\u4E2DVCC=5V\uFF0CVF=2V(LED\u6B63\u5411\u538B\u964D)\uFF0CIF=10mA(LED\u5DE5\u4F5C\u7535\u6D41)\uFF0C\u56E0\u6B64R = (5-2)/0.01 = 300\u03A9\uFF0C\u9009\u62E9\u6807\u51C6\u503C330\u03A9\u3002

**\u5143\u4EF6\u9009\u578B\uFF1A** R1\u9009\u62E91/4W\u529F\u7387\u7684\u91D1\u5C5E\u819C\u7535\u963B\uFF0C\u7CBE\u5EA65%\uFF1BLED1\u9009\u62E9\u6807\u51C63mm\u7EA2\u8272LED\uFF0C\u6B63\u5411\u7535\u6D4110-20mA\u3002

**\u8BBE\u8BA1\u6CE8\u610F\u4E8B\u9879\uFF1A** 1.\u786E\u4FDD\u9650\u6D41\u7535\u963B\u529F\u8017\u4E0D\u8D85\u8FC7\u989D\u5B9A\u503C\uFF1B2.LED\u6781\u6027\u4E0D\u80FD\u63A5\u53CD\uFF1B3.\u7535\u6E90\u7535\u538B\u8981\u7A33\u5B9A\uFF1B4.PCB\u5E03\u7EBF\u65F6\u6CE8\u610F\u7535\u6E90\u548C\u5730\u7EBF\u56DE\u8DEF\u3002

## \u5143\u4EF6\u5217\u8868
| \u4F4D\u53F7 | \u7C7B\u578B | \u578B\u53F7/\u89C4\u683C | \u53C2\u6570\u503C | \u5C01\u88C5 | \u8BF4\u660E |
|------|------|-----------|--------|------|------|
| R1   | \u7535\u963B | 1/4W 5%   | 330\u03A9  | 0805 | \u9650\u6D41\u7535\u963B |
| LED1 | LED  | \u6807\u51C6LED   | \u7EA2\u8272   | 3mm  | \u6307\u793A\u706F |

## \u8FDE\u63A5\u5173\u7CFB
| \u5E8F\u53F7 | \u8D77\u59CB\u5143\u4EF6 | \u8D77\u59CB\u5F15\u811A | \u76EE\u6807\u5143\u4EF6 | \u76EE\u6807\u5F15\u811A | \u8FDE\u63A5\u8BF4\u660E |
|------|----------|----------|----------|----------|----------|
| 1    | VCC      | +        | R1       | 1        | \u7535\u6E90\u6B63\u6781\u8FDE\u63A5\u5230\u7535\u963B |
| 2    | R1       | 2        | LED1     | +        | \u7535\u963B\u8F93\u51FA\u5230LED\u6B63\u6781 |
| 3    | LED1     | -        | GND      | -        | LED\u8D1F\u6781\u63A5\u5730 |

## \u7269\u6599\u6E05\u5355(BOM)
| \u5E8F\u53F7 | \u540D\u79F0 | \u578B\u53F7 | \u4F4D\u53F7 | \u6570\u91CF | \u5355\u4EF7(\u5143) | \u5907\u6CE8 |
|------|------|------|------|------|----------|------|
| 1    | \u7535\u963B | 330\u03A9/1/4W | R1 | 1 | 0.05 | \u9650\u6D41\u7535\u963B |
| 2    | LED  | \u7EA2\u82723mm    | LED1 | 1 | 0.15 | \u6307\u793A\u706F |`;
      circuit_data = {
        ascii: `     VCC
      |
     [R1]
      |
     LED1
      |
     GND`,
        description: `\u8BBE\u8BA1\u539F\u7406\uFF1A\u8FD9\u662F\u4E00\u4E2A\u57FA\u672C\u7684LED\u9A71\u52A8\u7535\u8DEF\uFF0C\u901A\u8FC7\u9650\u6D41\u7535\u963BR1\u63A7\u5236\u6D41\u8FC7LED1\u7684\u7535\u6D41\uFF0C\u786E\u4FDDLED\u5B89\u5168\u5DE5\u4F5C\u3002\u7535\u8DEF\u4ECEVCC\u83B7\u53D6\u7535\u6E90\uFF0C\u7ECF\u8FC7R1\u9650\u6D41\u540E\u70B9\u4EAELED1\uFF0C\u6700\u540E\u901A\u8FC7GND\u5F62\u6210\u5B8C\u6574\u56DE\u8DEF\u3002

\u8BA1\u7B97\u65B9\u6CD5\uFF1A\u9650\u6D41\u7535\u963B\u8BA1\u7B97\u516C\u5F0F\uFF1AR = (VCC - VF) / IF\uFF0C\u5176\u4E2DVCC=5V\uFF0CVF=2V(LED\u6B63\u5411\u538B\u964D)\uFF0CIF=10mA(LED\u5DE5\u4F5C\u7535\u6D41)\uFF0C\u56E0\u6B64R = (5-2)/0.01 = 300\u03A9\uFF0C\u9009\u62E9\u6807\u51C6\u503C330\u03A9\u3002

\u5143\u4EF6\u9009\u578B\uFF1AR1\u9009\u62E91/4W\u529F\u7387\u7684\u91D1\u5C5E\u819C\u7535\u963B\uFF0C\u7CBE\u5EA65%\uFF1BLED1\u9009\u62E9\u6807\u51C63mm\u7EA2\u8272LED\uFF0C\u6B63\u5411\u7535\u6D4110-20mA\u3002

\u8BBE\u8BA1\u6CE8\u610F\u4E8B\u9879\uFF1A1.\u786E\u4FDD\u9650\u6D41\u7535\u963B\u529F\u8017\u4E0D\u8D85\u8FC7\u989D\u5B9A\u503C\uFF1B2.LED\u6781\u6027\u4E0D\u80FD\u63A5\u53CD\uFF1B3.\u7535\u6E90\u7535\u538B\u8981\u7A33\u5B9A\uFF1B4.PCB\u5E03\u7EBF\u65F6\u6CE8\u610F\u7535\u6E90\u548C\u5730\u7EBF\u56DE\u8DEF\u3002`,
        components: [
          {
            id: "R1",
            name: "R1",
            type: "resistor",
            value: "1/4W 5% 330\u03A9",
            reference: "R1",
            model: "1/4W 5%"
          },
          {
            id: "LED1",
            name: "LED1",
            type: "led",
            value: "\u7EA2\u82723mm",
            reference: "LED1",
            model: "\u6807\u51C6LED"
          },
          {
            id: "VCC",
            name: "VCC",
            type: "power",
            value: "+5V",
            reference: "VCC",
            model: "\u7535\u6E90"
          },
          {
            id: "GND",
            name: "GND",
            type: "ground",
            value: "0V",
            reference: "GND",
            model: "\u5730\u7EBF"
          }
        ],
        connections: [
          {
            id: "conn1",
            from: { component: "VCC" },
            to: { component: "R1" },
            label: "\u7535\u6E90\u8FDE\u63A5",
            description: "VCC\u8FDE\u63A5\u5230\u9650\u6D41\u7535\u963BR1"
          },
          {
            id: "conn2",
            from: { component: "R1" },
            to: { component: "LED1" },
            label: "\u4FE1\u53F7\u8FDE\u63A5",
            description: "\u7535\u963BR1\u8FDE\u63A5\u5230LED1\u6B63\u6781"
          },
          {
            id: "conn3",
            from: { component: "LED1" },
            to: { component: "GND" },
            label: "\u5730\u7EBF\u8FDE\u63A5",
            description: "LED1\u8D1F\u6781\u8FDE\u63A5\u5230\u5730\u7EBFGND"
          }
        ]
      };
      bom_data = {
        items: [
          { component: "R1", quantity: 1, value: "330\u03A9", package: "0805", price: 0.05 },
          { component: "LED1", quantity: 1, value: "\u7EA2\u8272LED", package: "3mm", price: 0.15 }
        ],
        totalCost: 0.2
      };
    } else {
      response += `\u8FD9\u662F\u4E00\u4E2A\u6A21\u62DF\u7684AI\u54CD\u5E94\uFF0C\u7528\u4E8E\u6D4B\u8BD5\u7CFB\u7EDF\u529F\u80FD\u3002\u6211\u53EF\u4EE5\u5E2E\u60A8\u89E3\u7B54\u6280\u672F\u95EE\u9898\u6216\u8BA8\u8BBA\u7535\u8DEF\u8BBE\u8BA1\u3002`;
    }
    return {
      response,
      conversation_id: `mock_${Date.now()}`,
      provider: "mock",
      circuit_data,
      bom_data
    };
  }
  // 从AI响应中提取电路数据和BOM数据 - 增强版
  extractDataFromResponse(response) {
    console.log("\u5F00\u59CB\u667A\u80FD\u63D0\u53D6\uFF0C\u54CD\u5E94\u524D500\u5B57\u7B26:", response.substring(0, 500));
    let circuit_data = null;
    let bom_data = null;
    circuit_data = this.extractCircuitData(response);
    bom_data = this.extractBOMData(response, circuit_data);
    console.log("\u667A\u80FD\u63D0\u53D6\u5B8C\u6210:", {
      hasCircuit: !!circuit_data,
      circuitComponents: circuit_data?.components?.length || 0,
      hasBOM: !!bom_data,
      bomItems: bom_data?.items?.length || 0
    });
    return { circuit_data, bom_data };
  }
  // 智能提取电路数据
  extractCircuitData(response) {
    try {
      let ascii = null;
      try {
        const codeBlockRegex = /```([^`]*?)```/gs;
        const codeBlocks = Array.from(response.matchAll(codeBlockRegex));
        for (const match of codeBlocks) {
          const cleanBlock = match[1].trim();
          if (this.isCircuitDiagram(cleanBlock)) {
            ascii = cleanBlock;
            break;
          }
        }
      } catch (error) {
        console.log("\u4EE3\u7801\u5757\u63D0\u53D6\u5931\u8D25:", error.message);
      }
      if (!ascii) {
        try {
          ascii = this.findCircuitInText(response);
        } catch (error) {
          console.log("\u6587\u672C\u7535\u8DEF\u63D0\u53D6\u5931\u8D25:", error.message);
        }
      }
      let description = "";
      let components = [];
      let connections = [];
      try {
        description = this.extractDescription(response) || "\u7535\u8DEF\u8BBE\u8BA1\u8BF4\u660E";
      } catch (error) {
        console.log("\u63CF\u8FF0\u63D0\u53D6\u5931\u8D25:", error.message);
        description = "\u7535\u8DEF\u8BBE\u8BA1\u8BF4\u660E";
      }
      try {
        components = this.extractComponents(response) || [];
      } catch (error) {
        console.log("\u5143\u4EF6\u63D0\u53D6\u5931\u8D25:", error.message);
        components = [];
      }
      try {
        connections = this.extractConnections(response) || [];
      } catch (error) {
        console.log("\u8FDE\u63A5\u63D0\u53D6\u5931\u8D25:", error.message);
        connections = [];
      }
      console.log("\u7535\u8DEF\u63D0\u53D6\u7ED3\u679C:", {
        hasAscii: !!ascii,
        asciiLength: ascii?.length || 0,
        description: description?.substring(0, 100) + "...",
        componentsCount: components.length,
        connectionsCount: connections.length
      });
      if (ascii || components.length > 0) {
        return {
          ascii: ascii || "// \u7535\u8DEF\u56FE\u63D0\u53D6\u4E2D...",
          description,
          components,
          connections
        };
      }
      return null;
    } catch (error) {
      console.log("\u7535\u8DEF\u6570\u636E\u63D0\u53D6\u5168\u90E8\u5931\u8D25:", error.message);
      return null;
    }
  }
  // 智能提取BOM数据
  extractBOMData(response, circuit_data) {
    try {
      let bom_data = null;
      try {
        bom_data = this.extractBOMFromTable(response);
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log("\u7B56\u75651\u6210\u529F: BOM\u8868\u683C\u63D0\u53D6");
          return bom_data;
        }
      } catch (error) {
        console.log("\u7B56\u75651\u5931\u8D25:", error.message);
      }
      try {
        if (circuit_data && circuit_data.components && circuit_data.components.length > 0) {
          bom_data = this.generateBOMFromComponents(circuit_data.components);
          if (bom_data && bom_data.items && bom_data.items.length > 0) {
            console.log("\u7B56\u75652\u6210\u529F: \u5143\u4EF6\u6E05\u5355\u751F\u6210BOM");
            return bom_data;
          }
        }
      } catch (error) {
        console.log("\u7B56\u75652\u5931\u8D25:", error.message);
      }
      try {
        bom_data = this.intelligentBOMExtraction(response);
        if (bom_data && bom_data.items && bom_data.items.length > 0) {
          console.log("\u7B56\u75653\u6210\u529F: \u667A\u80FD\u6587\u672C\u5206\u6790");
          return bom_data;
        }
      } catch (error) {
        console.log("\u7B56\u75653\u5931\u8D25:", error.message);
      }
      try {
        bom_data = this.forceExtractBOM(response);
        console.log("\u7B56\u75654: \u6B63\u5219\u5339\u914D\uFF0C\u7ED3\u679C:", bom_data?.items?.length || 0);
        return bom_data;
      } catch (error) {
        console.log("\u7B56\u75654\u5931\u8D25:", error.message);
        return null;
      }
    } catch (error) {
      console.log("BOM\u63D0\u53D6\u5168\u90E8\u5931\u8D25:", error.message);
      return null;
    }
  }
  // 在文本中寻找电路结构
  findCircuitInText(response) {
    const lines = response.split("\n");
    let circuitLines = [];
    for (const line of lines) {
      if (this.isCircuitDiagram(line)) {
        circuitLines.push(line);
      }
    }
    if (circuitLines.length >= 3) {
      return circuitLines.join("\n");
    }
    return null;
  }
  // 🔥 优化：从明确的BOM表格中提取（增强版）
  extractBOMFromTable(response) {
    console.log("\u5F00\u59CBBOM\u8868\u683C\u63D0\u53D6\uFF0C\u54CD\u5E94\u957F\u5EA6:", response.length);
    const bomPatterns = [
      // 标准物料清单表格
      /## 物料清单\(BOM\)([\s\S]*?)(?=##|$)/gi,
      // 元件列表表格  
      /## 元件列表([\s\S]*?)(?=##|$)/gi,
      // 一般的BOM表格
      /(?:BOM|物料清单|元件清单)[\s\S]*?\|(.*?\|.*?\|.*?\|)/gi,
      // 表头模式
      /\|.*?序号.*?\|.*?名称.*?\|.*?型号.*?\|/gi,
      /\|.*?位号.*?\|.*?类型.*?\|.*?规格.*?\|/gi
    ];
    for (let i = 0; i < bomPatterns.length; i++) {
      const pattern = bomPatterns[i];
      const matches = Array.from(response.matchAll(pattern));
      console.log(`BOM\u6A21\u5F0F${i + 1}\u5339\u914D\u7ED3\u679C:`, matches.length);
      if (matches.length > 0) {
        const result = this.parseBOMTable(response, pattern);
        if (result && result.items && result.items.length > 0) {
          console.log(`BOM\u6A21\u5F0F${i + 1}\u63D0\u53D6\u6210\u529F\uFF0C\u9879\u76EE\u6570:`, result.items.length);
          return result;
        }
      }
    }
    console.log("\u6240\u6709BOM\u8868\u683C\u6A21\u5F0F\u90FD\u672A\u5339\u914D\u6210\u529F");
    return null;
  }
  // 解析BOM表格
  parseBOMTable(response, pattern) {
    const items = [];
    const lines = response.split("\n");
    let inTable = false;
    let itemId = 1;
    for (const line of lines) {
      if (pattern.test(line)) {
        inTable = true;
        continue;
      }
      if (inTable && line.includes("|")) {
        const cells = line.split("|").map((cell) => cell.trim()).filter((cell) => cell);
        if (cells.length >= 3) {
          items.push({
            component: cells[0] || `COMP${itemId}`,
            model: cells[1] || "Standard",
            quantity: this.extractNumber(cells[2]) || 1,
            value: cells[1] || "",
            package: cells[3] || "Standard",
            price: cells[4] ? this.extractNumber(cells[4]) : this.getComponentPrice("standard"),
            description: cells.join(" ").substring(0, 50)
          });
          itemId++;
        }
      }
      if (inTable && !line.includes("|") && line.trim() === "") {
        break;
      }
    }
    return items.length > 0 ? { items, totalCost: items.reduce((sum, item) => sum + item.price * item.quantity, 0) } : null;
  }
  // 智能BOM提取
  intelligentBOMExtraction(response) {
    const items = [];
    const componentMatches = /* @__PURE__ */ new Set();
    const patterns = [
      // 运算放大器
      { pattern: /(LM\d+|OPA\d+|AD\d+|TL\d+)(\w*)/gi, type: "ic", getName: /* @__PURE__ */ __name((match) => match[0], "getName") },
      // 电阻
      { pattern: /(\d+(?:\.\d+)?[kKmM]?[Ω\u03A9Ω])/gi, type: "resistor", getName: /* @__PURE__ */ __name((match) => `R(${match[1]})`, "getName") },
      // 电容
      { pattern: /(\d+(?:\.\d+)?[uUnNpPmM]?F)/gi, type: "capacitor", getName: /* @__PURE__ */ __name((match) => `C(${match[1]})`, "getName") },
      // 具体IC型号
      { pattern: /(STM32\w+|ESP32|555|ATmega\w+)/gi, type: "mcu", getName: /* @__PURE__ */ __name((match) => match[0], "getName") },
      // 二极管
      { pattern: /(1N\d+|BAT\d+)/gi, type: "diode", getName: /* @__PURE__ */ __name((match) => match[0], "getName") },
      // 晶体管
      { pattern: /(2N\d+|BC\d+|IRLZ\d+|IRF\d+)/gi, type: "transistor", getName: /* @__PURE__ */ __name((match) => match[0], "getName") }
    ];
    let itemId = 1;
    for (const { pattern, type, getName } of patterns) {
      const matches = Array.from(response.matchAll(pattern));
      for (const match of matches) {
        const componentName = getName(match);
        const key = `${type}_${componentName}`;
        if (!componentMatches.has(key)) {
          componentMatches.add(key);
          items.push({
            component: componentName,
            model: this.getDefaultModel(type),
            quantity: 1,
            value: match[1] || componentName,
            package: this.getDefaultPackage(type),
            price: this.getComponentPrice(type),
            description: this.getComponentDescription(type, componentName)
          });
          itemId++;
        }
      }
    }
    return items.length > 0 ? {
      items,
      totalCost: items.reduce((sum, item) => sum + item.price * item.quantity, 0)
    } : null;
  }
  // 提取数字
  extractNumber(text) {
    const match = text.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : 0;
  }
  // 判断是否是电路图
  isCircuitDiagram(text) {
    const circuitPatterns = [
      /VCC|GND|VDD|VSS/i,
      /R\d+|C\d+|L\d+|U\d+|D\d+/,
      /\[.*?\]|\+.*?\-/,
      /LED|resistor|capacitor/i,
      /\||\-|\+/
    ];
    return circuitPatterns.some((pattern) => pattern.test(text));
  }
  // 从响应中提取组件 - 优先解析表格，后备ASCII
  extractComponents(response) {
    const tableComponents = this.extractComponentsFromTable(response);
    if (tableComponents.length > 0) {
      return tableComponents;
    }
    return this.extractComponentsFromASCII(response);
  }
  // 从元件列表表格中提取组件
  extractComponentsFromTable(response) {
    const components = [];
    const sectionMatch = response.match(/## 元件列表([\s\S]*?)(?=##|$)/i);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const lines = section.split("\n");
      for (const line of lines) {
        const match = line.match(/\|\s*([A-Z]+\d*)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
        if (match) {
          const [, reference, type, model, value, pkg, description] = match;
          components.push({
            id: reference.trim(),
            name: reference.trim(),
            type: this.normalizeComponentType(type.trim()),
            reference: reference.trim(),
            value: value.trim(),
            package: pkg.trim(),
            description: description.trim()
          });
        }
      }
    }
    return components;
  }
  // 从ASCII电路图中提取组件（后备方案）
  extractComponentsFromASCII(response) {
    const components = [];
    const codeBlockMatch = response.match(/```([\s\S]*?)```/);
    if (!codeBlockMatch) return components;
    const ascii = codeBlockMatch[1];
    const lines = ascii.split("\n");
    const foundComponents = /* @__PURE__ */ new Set();
    for (const line of lines) {
      const componentMatches = line.match(/\b([RLCUD]\d+)\b|\bLED\d*\b|\bVCC\b|\bGND\b|\[([^\[\]]+)\]/g);
      if (componentMatches) {
        for (let match of componentMatches) {
          if (match.includes("[")) {
            match = match.replace(/[\[\]]/g, "");
          }
          if (foundComponents.has(match)) continue;
          foundComponents.add(match);
          let type = "unknown";
          if (match.startsWith("R")) type = "resistor";
          else if (match.startsWith("C")) type = "capacitor";
          else if (match.startsWith("L")) type = "inductor";
          else if (match.startsWith("U")) type = "ic";
          else if (match.startsWith("D")) type = "diode";
          else if (match.includes("LED")) type = "led";
          else if (match === "VCC") type = "power";
          else if (match === "GND") type = "ground";
          if (type !== "unknown") {
            components.push({
              id: match,
              name: match,
              type,
              reference: match,
              value: this.getComponentValue(match)
            });
          }
        }
      }
    }
    return components;
  }
  // 标准化组件类型
  normalizeComponentType(type) {
    const typeMap = {
      "\u7535\u963B": "resistor",
      "\u7535\u5BB9": "capacitor",
      "\u7535\u611F": "inductor",
      "LED": "led",
      "\u4E8C\u6781\u7BA1": "diode",
      "IC": "ic",
      "\u82AF\u7247": "ic",
      "\u7535\u6E90": "power",
      "\u5730\u7EBF": "ground"
    };
    return typeMap[type] || type.toLowerCase();
  }
  // 提取电路描述 - 解析结构化响应
  extractDescription(response) {
    const sectionMatch = response.match(/## 电路说明([\s\S]*?)(?=##|$)/i);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const principleMatch = section.match(/\*\*设计原理：\*\*(.*?)(?=\*\*|$)/s);
      const calculationMatch = section.match(/\*\*计算方法：\*\*(.*?)(?=\*\*|$)/s);
      const selectionMatch = section.match(/\*\*元件选型：\*\*(.*?)(?=\*\*|$)/s);
      const notesMatch = section.match(/\*\*设计注意事项：\*\*(.*?)(?=\*\*|$)/s);
      let description = "";
      if (principleMatch) description += `\u8BBE\u8BA1\u539F\u7406\uFF1A${principleMatch[1].trim()}

`;
      if (calculationMatch) description += `\u8BA1\u7B97\u65B9\u6CD5\uFF1A${calculationMatch[1].trim()}

`;
      if (selectionMatch) description += `\u5143\u4EF6\u9009\u578B\uFF1A${selectionMatch[1].trim()}

`;
      if (notesMatch) description += `\u8BBE\u8BA1\u6CE8\u610F\u4E8B\u9879\uFF1A${notesMatch[1].trim()}`;
      return description.trim() || "\u6839\u636EAI\u5206\u6790\u751F\u6210\u7684\u7535\u8DEF\u8BBE\u8BA1";
    }
    return "\u6839\u636EAI\u5206\u6790\u751F\u6210\u7684\u7535\u8DEF\u8BBE\u8BA1";
  }
  // 提取连接关系 - 解析连接关系表格
  extractConnections(response) {
    const connections = [];
    const sectionMatch = response.match(/## 连接关系([\s\S]*?)(?=##|$)/i);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const lines = section.split("\n");
      for (const line of lines) {
        const match = line.match(/\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|/);
        if (match) {
          const [, id, fromComp, fromPin, toComp, toPin, description] = match;
          connections.push({
            id: `conn_${id.trim()}`,
            from: {
              component: fromComp.trim(),
              pin: fromPin.trim()
            },
            to: {
              component: toComp.trim(),
              pin: toPin.trim()
            },
            label: "\u8FDE\u63A5",
            description: description.trim()
          });
        }
      }
    }
    return connections;
  }
  // 辅助方法：在行中查找组件
  findComponentInLine(line) {
    const patterns = [
      /\b([RLCUD]\d+)\b/,
      // 标准组件标号
      /\bLED\d*\b/,
      // LED
      /\bVCC\b/,
      // 电源
      /\bGND\b/,
      // 地线
      /\[([^\[\]]+)\]/
      // 方括号格式
    ];
    for (const pattern of patterns) {
      const match = line.match(pattern);
      if (match) {
        let component = match[1] || match[0];
        if (component.includes("[")) {
          component = component.replace(/[\[\]]/g, "");
        }
        return component;
      }
    }
    return null;
  }
  // 获取组件值
  getComponentValue(component) {
    if (component.startsWith("R")) return "330\u03A9";
    if (component.includes("LED")) return "\u7EA2\u8272LED";
    if (component.startsWith("C")) return "10\xB5F";
    if (component.startsWith("L")) return "10mH";
    if (component === "VCC" || component === "VDD") return "+5V";
    if (component === "GND" || component === "VSS") return "0V";
    return "";
  }
  // 从文本中提取BOM数据 - 解析BOM表格
  extractBOMFromText(response) {
    const items = [];
    const sectionMatch = response.match(/## 物料清单\(BOM\)([\s\S]*?)(?=##|$)/i);
    if (sectionMatch) {
      const section = sectionMatch[1];
      const lines = section.split("\n");
      for (const line of lines) {
        const match = line.match(/\|\s*(\d+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(\d+)\s*\|\s*([\d.]+)\s*\|\s*([^|]+)\s*\|/);
        if (match) {
          const [, id, name, model, reference, quantity, price, notes] = match;
          items.push({
            component: reference.trim(),
            quantity: parseInt(quantity.trim()) || 1,
            value: model.trim(),
            package: this.getDefaultPackage(reference.trim()),
            price: parseFloat(price.trim()) || 0,
            description: notes.trim()
          });
        }
      }
    }
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { items, totalCost };
    }
    return null;
  }
  // 获取组件价格
  getComponentPrice(component) {
    if (component.startsWith("R")) return 0.05;
    if (component.includes("LED")) return 0.15;
    if (component.startsWith("C")) return 0.08;
    if (component.startsWith("L")) return 0.12;
    if (component.startsWith("U")) return 1.5;
    if (component.startsWith("D")) return 0.25;
    return 0.1;
  }
  // 获取默认封装
  getDefaultPackage(component) {
    if (component.startsWith("R")) return "0805";
    if (component.includes("LED")) return "3mm";
    if (component.startsWith("C")) return "0805";
    if (component.startsWith("L")) return "1206";
    if (component.startsWith("U")) return "SOIC-8";
    if (component.startsWith("D")) return "SOD-123";
    return "TBD";
  }
  // 基于组件生成BOM数据
  generateBOMFromComponents(components) {
    const items = [];
    for (const comp of components) {
      if (comp.type === "power" || comp.type === "ground") {
        continue;
      }
      items.push({
        component: comp.reference,
        quantity: 1,
        value: comp.value || this.getComponentValue(comp.reference),
        package: this.getDefaultPackage(comp.reference),
        price: this.getComponentPrice(comp.reference)
      });
    }
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      return { items, totalCost };
    }
    return null;
  }
  // 🔥 优化：构建更专业的电路设计提示词，确保结构化输出
  buildCircuitDesignPrompt(userMessage) {
    return `\u4F60\u662F\u4E13\u4E1A\u7684\u786C\u4EF6\u7535\u8DEF\u8BBE\u8BA1\u5DE5\u7A0B\u5E08\u3002\u8BF7\u4E3A\u7528\u6237\u9700\u6C42\u63D0\u4F9B\u5B8C\u6574\u7684\u7535\u8DEF\u8BBE\u8BA1\u65B9\u6848\uFF1A${userMessage}

**\u4E25\u683C\u6309\u7167\u4EE5\u4E0B\u683C\u5F0F\u8F93\u51FA\uFF0C\u786E\u4FDD\u6BCF\u4E2A\u90E8\u5206\u90FD\u5B8C\u6574\uFF1A**

## \u7535\u8DEF\u8BBE\u8BA1\u8BF4\u660E
**\u8BBE\u8BA1\u539F\u7406\uFF1A** [\u8BE6\u7EC6\u8BF4\u660E\u7535\u8DEF\u5DE5\u4F5C\u539F\u7406]
**\u8BA1\u7B97\u65B9\u6CD5\uFF1A** [\u63D0\u4F9B\u5173\u952E\u53C2\u6570\u8BA1\u7B97\u8FC7\u7A0B\u548C\u516C\u5F0F]
**\u5143\u4EF6\u9009\u578B\uFF1A** [\u8BF4\u660E\u4E3B\u8981\u5143\u4EF6\u7684\u9009\u62E9\u7406\u7531\u548C\u89C4\u683C\u8981\u6C42]
**\u8BBE\u8BA1\u6CE8\u610F\u4E8B\u9879\uFF1A** [\u5217\u51FA\u8BBE\u8BA1\u548C\u8C03\u8BD5\u7684\u5173\u952E\u8981\u70B9]

## ASCII\u7535\u8DEF\u56FE
\`\`\`
[\u7ED8\u5236\u6E05\u6670\u7684ASCII\u7535\u8DEF\u56FE\uFF0C\u6807\u660E\u6240\u6709\u5143\u4EF6\u548C\u8FDE\u63A5\uFF0C\u4F8B\u5982\uFF1A
     VCC
      |
     [R1]
      |
     LED1
      |
     GND
]
\`\`\`

## \u5143\u4EF6\u5217\u8868
| \u4F4D\u53F7 | \u7C7B\u578B | \u578B\u53F7/\u89C4\u683C | \u53C2\u6570\u503C | \u5C01\u88C5 | \u8BF4\u660E |
|------|------|-----------|--------|------|------|
| R1   | \u7535\u963B | 1/4W 5%   | 330\u03A9  | 0805 | \u9650\u6D41\u7535\u963B |
| LED1 | LED  | \u6807\u51C6LED   | \u7EA2\u8272   | 3mm  | \u6307\u793A\u706F |

## \u8FDE\u63A5\u5173\u7CFB
| \u5E8F\u53F7 | \u8D77\u59CB\u5143\u4EF6 | \u8D77\u59CB\u5F15\u811A | \u76EE\u6807\u5143\u4EF6 | \u76EE\u6807\u5F15\u811A | \u8FDE\u63A5\u8BF4\u660E |
|------|----------|----------|----------|----------|----------|
| 1    | VCC      | +        | R1       | 1        | \u7535\u6E90\u6B63\u6781\u8FDE\u63A5 |
| 2    | R1       | 2        | LED1     | +        | \u9650\u6D41\u540E\u8FDE\u63A5LED |

## \u7269\u6599\u6E05\u5355(BOM)
| \u5E8F\u53F7 | \u540D\u79F0 | \u578B\u53F7 | \u4F4D\u53F7 | \u6570\u91CF | \u5355\u4EF7(\u5143) | \u5907\u6CE8 |
|------|------|------|------|------|----------|------|
| 1    | \u7535\u963B | 330\u03A9/1/4W | R1 | 1 | 0.05 | \u9650\u6D41\u7535\u963B |
| 2    | LED  | \u7EA2\u82723mm    | LED1 | 1 | 0.15 | \u6307\u793A\u706F |

\u8BF7\u786E\u4FDD\u8F93\u51FA\u5185\u5BB9\u4E13\u4E1A\u3001\u8BE6\u7EC6\u3001\u51C6\u786E\uFF0C\u5305\u542B\u6240\u6709\u5FC5\u8981\u7684\u6280\u672F\u4FE1\u606F\u3002`;
  }
  // 构建包含历史的提示词
  buildPromptWithHistory(currentMessage, history) {
    if (history.length <= 1) {
      return this.buildCircuitDesignPrompt(currentMessage);
    }
    let prompt = `\u4F60\u662FCircuitsAI\u7684\u8D44\u6DF1\u786C\u4EF6\u7535\u8DEF\u8BBE\u8BA1\u603B\u5DE5\u7A0B\u5E08\u3002\u8BF7\u57FA\u4E8E\u4EE5\u4E0B\u5BF9\u8BDD\u5386\u53F2\uFF0C\u7EE7\u7EED\u4E3A\u7528\u6237\u63D0\u4F9B\u4E13\u4E1A\u7684\u7535\u8DEF\u8BBE\u8BA1\u670D\u52A1\u3002

## \u5BF9\u8BDD\u5386\u53F2\uFF1A
`;
    const recentHistory = history.slice(-10);
    for (let i = 0; i < recentHistory.length - 1; i++) {
      const msg = recentHistory[i];
      if (msg.role === "user") {
        prompt += `
**\u7528\u6237\uFF1A** ${msg.content}
`;
      } else if (msg.role === "assistant") {
        const shortContent = msg.content.length > 200 ? msg.content.substring(0, 200) + "..." : msg.content;
        prompt += `**AI\uFF1A** ${shortContent}
`;
      }
    }
    prompt += `
## \u5F53\u524D\u7528\u6237\u8BF7\u6C42\uFF1A
${currentMessage}

## \u56DE\u590D\u8981\u6C42\uFF1A
\u8BF7\u57FA\u4E8E\u4E0A\u8FF0\u5BF9\u8BDD\u5386\u53F2\uFF0C\u9488\u5BF9\u7528\u6237\u7684\u5F53\u524D\u8BF7\u6C42\u63D0\u4F9B\uFF1A
1. \u5982\u679C\u662F\u65B0\u7684\u8BBE\u8BA1\u9700\u6C42\uFF0C\u6309\u6807\u51C6\u683C\u5F0F\u63D0\u4F9B\u5B8C\u6574\u65B9\u6848\uFF08ASCII\u56FE\u3001\u8BF4\u660E\u3001\u5143\u4EF6\u8868\u3001\u8FDE\u63A5\u5173\u7CFB\u3001BOM\uFF09
2. \u5982\u679C\u662F\u5BF9\u524D\u9762\u8BBE\u8BA1\u7684\u4FEE\u6539\u6216\u4F18\u5316\uFF0C\u8BF7\u5728\u539F\u6709\u57FA\u7840\u4E0A\u8FDB\u884C\u6539\u8FDB
3. \u5982\u679C\u662F\u6280\u672F\u95EE\u9898\uFF0C\u8BF7\u7ED3\u5408\u524D\u9762\u7684\u8BBE\u8BA1\u80CC\u666F\u7ED9\u51FA\u4E13\u4E1A\u89E3\u7B54

\u8BF7\u4FDD\u6301\u56DE\u590D\u7684\u4E13\u4E1A\u6027\u548C\u8FDE\u8D2F\u6027\u3002`;
    return prompt;
  }
  // 构建Custom API消息格式（支持对话历史）
  buildCustomAPIMessages(message, conversationHistory) {
    const messages = [];
    const isFirstMessage = !conversationHistory || conversationHistory.length <= 1;
    if (isFirstMessage) {
      const systemPrompt = this.buildCircuitDesignPrompt(message);
      messages.push({ role: "user", content: systemPrompt });
      console.log("Custom API: \u4F7F\u7528\u5B8C\u6574\u7CFB\u7EDF\u63D0\u793A\u8BCD - \u9996\u6B21\u5BF9\u8BDD");
    } else {
      console.log("Custom API: \u4F7F\u7528\u5BF9\u8BDD\u5386\u53F2 - \u540E\u7EED\u5BF9\u8BDD\uFF0C\u5386\u53F2\u957F\u5EA6:", conversationHistory.length);
      messages.push({
        role: "system",
        content: "\u4F60\u662FCircuitAI\u7684\u4E13\u4E1A\u786C\u4EF6\u7535\u8DEF\u8BBE\u8BA1\u5DE5\u7A0B\u5E08\u3002\u57FA\u4E8E\u5BF9\u8BDD\u5386\u53F2\uFF0C\u7EE7\u7EED\u4E3A\u7528\u6237\u63D0\u4F9B\u4E13\u4E1A\u7684\u7535\u8DEF\u8BBE\u8BA1\u670D\u52A1\u3002\u8BF7\u4FDD\u6301\u56DE\u590D\u7684\u4E13\u4E1A\u6027\u548C\u8FDE\u8D2F\u6027\u3002"
      });
      const recentHistory = conversationHistory.slice(-9, -1);
      for (const msg of recentHistory) {
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
      messages.push({ role: "user", content: message });
    }
    console.log("Custom API messages\u6784\u5EFA\u5B8C\u6210\uFF0C\u6D88\u606F\u6570\u91CF:", messages.length);
    return messages;
  }
  // 构建OpenAI消息格式
  buildOpenAIMessages(message, conversationHistory) {
    const messages = [];
    if (!conversationHistory || conversationHistory.length <= 1) {
      const systemPrompt = this.buildCircuitDesignPrompt(message);
      messages.push({ role: "user", content: systemPrompt });
    } else {
      messages.push({
        role: "system",
        content: "\u4F60\u662FCircuitsAI\u7684\u8D44\u6DF1\u786C\u4EF6\u7535\u8DEF\u8BBE\u8BA1\u603B\u5DE5\u7A0B\u5E08\u3002\u57FA\u4E8E\u5BF9\u8BDD\u5386\u53F2\uFF0C\u7EE7\u7EED\u63D0\u4F9B\u4E13\u4E1A\u7684\u7535\u8DEF\u8BBE\u8BA1\u670D\u52A1\u3002"
      });
      const recentHistory = conversationHistory.slice(-8);
      for (let i = 0; i < recentHistory.length - 1; i++) {
        const msg = recentHistory[i];
        messages.push({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        });
      }
      messages.push({ role: "user", content: message });
    }
    return messages;
  }
  // 智能从专业回答中提取BOM - 增强版
  forceExtractBOM(response) {
    const items = [];
    const componentPatterns = [
      // 电阻模式
      { pattern: /([RC]\d+).*?(\d+[kKmMuUnN]?[Ω\u03A9Ω])/gi, type: "resistor" },
      { pattern: /(电阻|resistor).*?(\d+[kKmMuUnN]?[Ω\u03A9Ω])/gi, type: "resistor" },
      // 电容模式  
      { pattern: /([LC]\d+).*?(\d+[uUnNpPmMfF]?F)/gi, type: "capacitor" },
      { pattern: /(电容|capacitor).*?(\d+[uUnNpPmMfF]?F)/gi, type: "capacitor" },
      // LED模式
      { pattern: /(LED\d*).*?(红色|绿色|蓝色|白色|yellow|red|green|blue|\d+mm)/gi, type: "led" },
      // IC模式 - 扩展常见型号
      { pattern: /(U\d+).*?(LM\d+|NE\d+|74\w+|ATmega\w+|STM32|ESP32|AD\d+|OPA\d+|TL\d+|MC\d+)/gi, type: "ic" },
      { pattern: /(芯片|IC|运放|MCU).*?(LM\d+|NE\d+|74\w+|ATmega\w+|STM32|ESP32|AD\d+|OPA\d+|TL\d+)/gi, type: "ic" },
      // 晶体管模式
      { pattern: /(Q\d+|M\d+).*?(2N\d+|BC\d+|MOSFET|IRLZ\d+|IRF\d+|BSS\d+)/gi, type: "transistor" },
      { pattern: /(MOSFET|晶体管|三极管).*?(2N\d+|BC\d+|IRLZ\d+|IRF\d+|BSS\d+)/gi, type: "transistor" },
      // 二极管
      { pattern: /(D\d+).*?(1N\d+|BAT\d+|肖特基|Schottky)/gi, type: "diode" },
      // 电感
      { pattern: /(L\d+).*?(\d+[uUnNmM]?H)/gi, type: "inductor" }
    ];
    let itemId = 1;
    const foundComponents = /* @__PURE__ */ new Set();
    componentPatterns.forEach(({ pattern, type }) => {
      let match;
      while ((match = pattern.exec(response)) !== null) {
        const [fullMatch, reference, value] = match;
        const componentKey = `${reference || type}_${value}`;
        if (!foundComponents.has(componentKey)) {
          foundComponents.add(componentKey);
          const contextMatch = response.slice(Math.max(0, match.index - 100), match.index + 100);
          const modelMatch = contextMatch.match(/(型号|model|part).*?([A-Z0-9\-_]+)/i);
          const packageMatch = contextMatch.match(/(封装|package).*?(SOT|DIP|SOIC|TSSOP|QFN|BGA|\d+mm)/i);
          items.push({
            component: reference || `${type.toUpperCase()}${itemId}`,
            quantity: 1,
            value,
            model: modelMatch ? modelMatch[2] : this.getDefaultModel(type),
            package: packageMatch ? packageMatch[2] : this.getDefaultPackage(reference || type),
            price: this.getComponentPrice(type),
            description: this.getComponentDescription(type, value)
          });
          itemId++;
        }
      }
    });
    if (items.length > 0) {
      const totalCost = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      console.log("\u667A\u80FD\u63D0\u53D6BOM\u6210\u529F\uFF0C\u9879\u76EE\u6570:", items.length);
      return { items, totalCost };
    }
    console.log("\u65E0\u6CD5\u63D0\u53D6\u4EFB\u4F55BOM\u6570\u636E");
    return null;
  }
  // 获取默认型号
  getDefaultModel(type) {
    const models = {
      "resistor": "1/4W 5%",
      "capacitor": "X7R",
      "led": "Standard LED",
      "ic": "DIP Package",
      "transistor": "TO-220",
      "diode": "1N4148",
      "inductor": "Wirewound"
    };
    return models[type] || "Standard";
  }
  // 获取元件描述
  getComponentDescription(type, value) {
    const descriptions = {
      "resistor": `${value} \u7CBE\u5BC6\u7535\u963B`,
      "capacitor": `${value} \u9676\u74F7\u7535\u5BB9`,
      "led": `${value} LED\u6307\u793A\u706F`,
      "ic": `${value} \u96C6\u6210\u7535\u8DEF`,
      "transistor": `${value} \u529F\u7387\u6676\u4F53\u7BA1`,
      "diode": `${value} \u6574\u6D41\u4E8C\u6781\u7BA1`,
      "inductor": `${value} \u7535\u611F`
    };
    return descriptions[type] || `${value} \u7535\u5B50\u5143\u4EF6`;
  }
};

// src/index.ts
var app = new Hono2();
app.use("*", logger());
app.use("*", cors({
  origin: [
    "https://circuitai.pages.dev",
    "https://*.circuitai.pages.dev",
    "https://www.circuitai.top",
    "https://circuitai.top",
    "https://main.circuitai.pages.dev",
    "http://localhost:3002",
    "http://localhost:3000"
  ],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowHeaders: ["Content-Type", "Authorization"]
}));
app.get("/api/health", (c) => {
  return c.json({
    success: true,
    message: "\u670D\u52A1\u8FD0\u884C\u6B63\u5E38",
    data: {
      status: "ok",
      timestamp: (/* @__PURE__ */ new Date()).toISOString(),
      environment: "cloudflare-workers"
    }
  });
});
app.post("/api/ai/chat", async (c) => {
  try {
    console.log("\u6536\u5230AI\u804A\u5929\u8BF7\u6C42");
    const requestData = await c.req.json();
    console.log("\u8BF7\u6C42\u6570\u636E\u8BE6\u60C5:", {
      message: requestData.message?.substring(0, 100) + "...",
      provider: requestData.provider,
      hasApiConfig: !!requestData.apiConfig,
      conversationId: requestData.conversation_id,
      apiConfigKeys: requestData.apiConfig ? Object.keys(requestData.apiConfig) : "N/A"
    });
    const { message, conversation_id, provider, apiConfig } = requestData;
    if (!message || !provider) {
      throw new Error("\u7F3A\u5C11\u5FC5\u8981\u53C2\u6570: message \u6216 provider");
    }
    if (provider === "custom") {
      console.log("Custom provider\u914D\u7F6E\u9A8C\u8BC1:", {
        hasApiConfig: !!apiConfig,
        configKeys: apiConfig ? Object.keys(apiConfig) : "N/A",
        hasApiUrl: !!apiConfig?.apiUrl,
        hasApiKey: !!apiConfig?.apiKey,
        hasModel: !!apiConfig?.model
      });
      if (!apiConfig || !apiConfig.apiUrl || !apiConfig.apiKey || !apiConfig.model) {
        throw new Error("Custom provider\u9700\u8981\u5B8C\u6574\u7684API\u914D\u7F6E: apiUrl, apiKey, model");
      }
    }
    console.log("\u521D\u59CB\u5316AI\u670D\u52A1...");
    const aiService = new AIService();
    console.log("\u5F00\u59CB\u5904\u7406\u804A\u5929\u8BF7\u6C42\uFF0Cprovider:", provider);
    const response = await aiService.chat(message, conversation_id, provider, apiConfig);
    console.log("\u804A\u5929\u5904\u7406\u5B8C\u6210\uFF0C\u54CD\u5E94\u7C7B\u578B:", typeof response, "\u54CD\u5E94\u952E:", Object.keys(response || {}));
    return c.json({
      success: true,
      data: response
    });
  } catch (error) {
    console.error("AI Chat error\u8BE6\u7EC6\u4FE1\u606F:", {
      message: error.message,
      stack: error.stack,
      name: error.name,
      provider: error.provider || "unknown"
    });
    return c.json({
      success: false,
      error: `AI\u670D\u52A1\u9519\u8BEF: ${error.message}`
    }, 500);
  }
});
app.post("/api/ai/test-config", async (c) => {
  try {
    const config = await c.req.json();
    const aiService = new AIService();
    const result = await aiService.testConfig(config);
    return c.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("API Test error:", error);
    return c.json({
      success: false,
      error: `\u8FDE\u63A5\u5931\u8D25: ${error.message}`
    }, 400);
  }
});
app.notFound((c) => {
  return c.json({
    success: false,
    error: "Not found",
    path: c.req.path
  }, 404);
});
var src_default = app;

// node_modules/wrangler/templates/middleware/middleware-ensure-req-body-drained.ts
var drainBody = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } finally {
    try {
      if (request.body !== null && !request.bodyUsed) {
        const reader = request.body.getReader();
        while (!(await reader.read()).done) {
        }
      }
    } catch (e) {
      console.error("Failed to drain the unused request body.", e);
    }
  }
}, "drainBody");
var middleware_ensure_req_body_drained_default = drainBody;

// node_modules/wrangler/templates/middleware/middleware-miniflare3-json-error.ts
function reduceError(e) {
  return {
    name: e?.name,
    message: e?.message ?? String(e),
    stack: e?.stack,
    cause: e?.cause === void 0 ? void 0 : reduceError(e.cause)
  };
}
__name(reduceError, "reduceError");
var jsonError = /* @__PURE__ */ __name(async (request, env, _ctx, middlewareCtx) => {
  try {
    return await middlewareCtx.next(request, env);
  } catch (e) {
    const error = reduceError(e);
    return Response.json(error, {
      status: 500,
      headers: { "MF-Experimental-Error-Stack": "true" }
    });
  }
}, "jsonError");
var middleware_miniflare3_json_error_default = jsonError;

// .wrangler/tmp/bundle-x5sFVe/middleware-insertion-facade.js
var __INTERNAL_WRANGLER_MIDDLEWARE__ = [
  middleware_ensure_req_body_drained_default,
  middleware_miniflare3_json_error_default
];
var middleware_insertion_facade_default = src_default;

// node_modules/wrangler/templates/middleware/common.ts
var __facade_middleware__ = [];
function __facade_register__(...args) {
  __facade_middleware__.push(...args.flat());
}
__name(__facade_register__, "__facade_register__");
function __facade_invokeChain__(request, env, ctx, dispatch, middlewareChain) {
  const [head, ...tail] = middlewareChain;
  const middlewareCtx = {
    dispatch,
    next(newRequest, newEnv) {
      return __facade_invokeChain__(newRequest, newEnv, ctx, dispatch, tail);
    }
  };
  return head(request, env, ctx, middlewareCtx);
}
__name(__facade_invokeChain__, "__facade_invokeChain__");
function __facade_invoke__(request, env, ctx, dispatch, finalMiddleware) {
  return __facade_invokeChain__(request, env, ctx, dispatch, [
    ...__facade_middleware__,
    finalMiddleware
  ]);
}
__name(__facade_invoke__, "__facade_invoke__");

// .wrangler/tmp/bundle-x5sFVe/middleware-loader.entry.ts
var __Facade_ScheduledController__ = class ___Facade_ScheduledController__ {
  constructor(scheduledTime, cron, noRetry) {
    this.scheduledTime = scheduledTime;
    this.cron = cron;
    this.#noRetry = noRetry;
  }
  static {
    __name(this, "__Facade_ScheduledController__");
  }
  #noRetry;
  noRetry() {
    if (!(this instanceof ___Facade_ScheduledController__)) {
      throw new TypeError("Illegal invocation");
    }
    this.#noRetry();
  }
};
function wrapExportedHandler(worker) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return worker;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  const fetchDispatcher = /* @__PURE__ */ __name(function(request, env, ctx) {
    if (worker.fetch === void 0) {
      throw new Error("Handler does not export a fetch() function.");
    }
    return worker.fetch(request, env, ctx);
  }, "fetchDispatcher");
  return {
    ...worker,
    fetch(request, env, ctx) {
      const dispatcher = /* @__PURE__ */ __name(function(type, init) {
        if (type === "scheduled" && worker.scheduled !== void 0) {
          const controller = new __Facade_ScheduledController__(
            Date.now(),
            init.cron ?? "",
            () => {
            }
          );
          return worker.scheduled(controller, env, ctx);
        }
      }, "dispatcher");
      return __facade_invoke__(request, env, ctx, dispatcher, fetchDispatcher);
    }
  };
}
__name(wrapExportedHandler, "wrapExportedHandler");
function wrapWorkerEntrypoint(klass) {
  if (__INTERNAL_WRANGLER_MIDDLEWARE__ === void 0 || __INTERNAL_WRANGLER_MIDDLEWARE__.length === 0) {
    return klass;
  }
  for (const middleware of __INTERNAL_WRANGLER_MIDDLEWARE__) {
    __facade_register__(middleware);
  }
  return class extends klass {
    #fetchDispatcher = /* @__PURE__ */ __name((request, env, ctx) => {
      this.env = env;
      this.ctx = ctx;
      if (super.fetch === void 0) {
        throw new Error("Entrypoint class does not define a fetch() function.");
      }
      return super.fetch(request);
    }, "#fetchDispatcher");
    #dispatcher = /* @__PURE__ */ __name((type, init) => {
      if (type === "scheduled" && super.scheduled !== void 0) {
        const controller = new __Facade_ScheduledController__(
          Date.now(),
          init.cron ?? "",
          () => {
          }
        );
        return super.scheduled(controller);
      }
    }, "#dispatcher");
    fetch(request) {
      return __facade_invoke__(
        request,
        this.env,
        this.ctx,
        this.#dispatcher,
        this.#fetchDispatcher
      );
    }
  };
}
__name(wrapWorkerEntrypoint, "wrapWorkerEntrypoint");
var WRAPPED_ENTRY;
if (typeof middleware_insertion_facade_default === "object") {
  WRAPPED_ENTRY = wrapExportedHandler(middleware_insertion_facade_default);
} else if (typeof middleware_insertion_facade_default === "function") {
  WRAPPED_ENTRY = wrapWorkerEntrypoint(middleware_insertion_facade_default);
}
var middleware_loader_entry_default = WRAPPED_ENTRY;
export {
  __INTERNAL_WRANGLER_MIDDLEWARE__,
  middleware_loader_entry_default as default
};
//# sourceMappingURL=index.js.map
