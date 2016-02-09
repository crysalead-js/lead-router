var jsdom = require("jsdom");

global.document = jsdom.jsdom();
global.window = global.document.defaultView;
global.history = window.history;
global.location = window.location;

require('./parser-spec');
require('./route-spec');
require('./router-spec');
