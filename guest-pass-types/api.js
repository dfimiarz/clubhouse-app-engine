const express = require("express");
const controller = require("./controller");
const { authGuard } = require("../middleware/clientauth");
const RESTError = require("./../utils/RESTError");
const {
  cloudLog,
  cloudLogLevels: loglevels,
} = require("./../utils/logger/logger");

/**
 * @typedef {import("./types").PassType} PassType;
 */

const router = express.Router();

router.use(express.json());

router.get(
  "/",
  /* authGuard, */ (_req, res, next) => {
    controller
      .getPassTypes()
      .then((result) => {
        res.json(result);
      })
      .catch((err) => {
        next(
          err instanceof RESTError
            ? err
            : new RESTError(400, "Operation failed")
        );
      });
  }
);

module.exports = router;
