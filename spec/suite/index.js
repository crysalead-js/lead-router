var jsdom = require("jsdom");
const { JSDOM } = jsdom;

global.window = (new JSDOM(`<!DOCTYPE html>`)).window;
global.document = window.document;
global.history = window.history;
global.location = window.location;

require('./parser-spec');
require('./route-spec');
require('./router-spec');
