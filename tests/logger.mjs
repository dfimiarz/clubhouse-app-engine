import { appLogLevels } from "../utils/logger/logger.js";
import winston from "winston";
import { expect } from "chai";

describe("Checking logger module", () => {

  it('appLogLevels values should be in winston.config.syslog.levels', () => {
    const appLevels = Object.values(appLogLevels);

    const winstonLevels = Object.keys(winston.config.syslog.levels);

    //Make sure that all appLevels are in winstonLevels
    const result = appLevels.every((level) => winstonLevels.includes(level));

    expect(result).to.be.true;
  });
});
