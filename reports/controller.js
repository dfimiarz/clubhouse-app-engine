const CLUB_ID = process.env.CLUB_ID;
const { getReportProcessor } = require('./reportTypes');

runProcessor = async (name,from,to) => {
    const processor = getReportProcessor(name);
    if( processor && typeof processor === 'function' ){
        return await processor(name,from,to);
    } else {
        throw new Error(`Invalid report type: ${name}`)
    }
}

module.exports = {
    runProcessor
}   