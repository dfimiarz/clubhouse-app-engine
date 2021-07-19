const winston = require('winston');
const { Logging } = require('@google-cloud/logging');

const cloudLogLevels = {
  default: "DEFAULT",
  debug : "DEBUG",
  info: "INFO",
  warning : "WARNING",
  error: "ERROR",
  emergancy : "EMERGENCY"
}

//Get log name from env var
const logName = process.env.GCLOUD_LOG_NAME;

const logging = new Logging();

// Selects the log to write to
const log = logging.log(logName)

const logger = winston.createLogger({
  level: 'debug',
  transports: [
    new winston.transports.Console()
  ]
});


function cloudLog(level,message, resource_type = 'global'){

  const lvl = Object.values(cloudLogLevels).includes(level) ? level: cloudLogLevels['default'];

  const metadata = {
    severity: lvl,
    // A default log resource is added for some GCP environments
    // This log resource can be overwritten per spec:
    // https://cloud.google.com/logging/docs/reference/v2/rest/v2/MonitoredResource
    resource: {
      type: resource_type
    }
  };
  
  const entry = log.entry(metadata, message);

  log.write(entry).catch(err => {
    localLog('error',"GCLOUD log error: " + err.message);
  })

  if( process.env.NODE_ENV !== 'production' ){
    localLog("info",message);
  }
  
}

function localLog(level,message,meta = null){

  if( ! Object.prototype.hasOwnProperty.call(winston.config.syslog.levels,level)){
    logger.log('error',`Log level "${ level }" not supported`);
    return
  }

  logger.log(level,message,meta);

}

module.exports = {
  cloudLog, localLog, cloudLogLevels
}