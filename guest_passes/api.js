const express = require("express");
const controller = require("./controller");
const { authGuard } = require("../middleware/clientauth");
const { body, validationResult } = require("express-validator");
const { log, appLogLevels } = require('./../utils/logger/logger');
const RESTError = require("./../utils/RESTError");

const router = express.Router();

router.use(express.json());

router.post(
  "/",
  authGuard,
  [
    body("guest").isInt().withMessage("Invalid guest id"),
    body("host").isInt().withMessage("Invalid host id"),
    body("pass_type").isInt().withMessage("Invalid pass type"),
  ],
  (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      log(appLogLevels.ERROR, "Guest pass activation error: " + JSON.stringify(errors.array()));
      return next(
        new RESTError(422, {
          fielderrors: errors.array({ onlyFirstError: true }),
        })
      );
    }

    //Get guest, host and pass type from request body
    const { guest, host, pass_type } = req.body;

    //Insert a new guest pass
    controller
      .addGuestPass({ guest, host, pass_type })
      .then((result) => {
        res.json(result);
      })
      .catch((err) => {
        next(err);
      });
  }
);

module.exports = router;
