/**
 *
 * @param {*} method
 * @param {*} options
 * @param {*} value
 */
function log(method, options, value) {
  console.log(`${method}:
        ${JSON.stringify(options, null, 2)}
        ${JSON.stringify(value, null, 2)};
    `);
}

module.exports = { log };
