const { playerStatsProcessor, guestInfoProcessor, memberActivitiesProcessor  } = require('./reportProcessors');

/**
 * Object containing list of report processors
 * 
 */
const report_processors = {
    playerstats : playerStatsProcessor,
    memberactivities: memberActivitiesProcessor,
    guestinfo: guestInfoProcessor,
}

//Function returns processor names
function getReportTypes() {
    return Object.keys(report_processors);
}

function getReportProcessor(type) {
    //Return report processor based on type if not found return null
    return report_processors[type] || null;
}

module.exports = {
    getReportTypes, getReportProcessor
}