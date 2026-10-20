/**
 * Runs express-validator chains and converts failures into a 400 ApiError.
 * Usage: router.post('/register', validate(registerRules), controller)
 */
const { validationResult } = require('express-validator');
const ApiError = require('../utils/ApiError');

const validate = (rules) => [
  ...rules,
  (req, res, next) => {
    const result = validationResult(req);
    if (result.isEmpty()) return next();

    const details = result.array({ onlyFirstError: true }).map((e) => ({ field: e.path, message: e.msg }));
    return next(ApiError.badRequest(details[0].message, details));
  },
];

module.exports = validate;
