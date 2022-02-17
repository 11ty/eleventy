/* Prior art: this utility was created for https://github.com/11ty/eleventy/issues/2214

 * Inspired by implementations from `is-what`, `typechecker`, `jQuery`, and `lodash`

 * `is-what`
 * More reading at https://www.npmjs.com/package/is-what#user-content-isplainobject-vs-isanyobject
 * if (Object.prototype.toString.call(value).slice(8, -1) !== 'Object') return false;
 * return value.constructor === Object && Object.getPrototypeOf(value) === Object.prototype;

 * `typechecker`
 * return value !== null && typeof value === 'object' && value.__proto__ === Object.prototype;

 * Notably jQuery and lodash have very similar implementations.

 * For later, remember the `value === Object(value)` trick
 */

module.exports = function (value) {
  if (value === null || typeof value !== "object") {
    return false;
  }
  let proto = Object.getPrototypeOf(value);
  return !proto || proto === Object.prototype;
};
