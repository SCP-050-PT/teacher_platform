const fileIdentifier = require('./fileIdentifier');
const coursesParser = require('./coursesParser');
const mckoTeachersParser = require('./mckoTeachersParser');
const mckoClassParser = require('./mckoClassParser');
const olympiadParser = require('./olympiadParser');
const vsohParser = require('./vsohParser');
const ogeParser = require('./ogeParser');        
const egeParser = require('./egeParser');        
const otherParser = require('./otherParser');

module.exports = {
    fileIdentifier,
    coursesParser,
    mckoTeachersParser,
    mckoClassParser,
    olympiadParser,
    vsohParser,
    ogeParser,        
    egeParser,        
    otherParser
};