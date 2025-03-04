const { playerStatsProcessor, memberActivitiesProcessor, guestPassesProcessor  } = require('./reportProcessors');

/**
 * Object containing list of report processors
 * 
 */
const report_processors = {
    playerstats : playerStatsProcessor,
    memberactivities: memberActivitiesProcessor,
    guestpasses: guestPassesProcessor
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