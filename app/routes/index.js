(function (app) {
    "use strict";

    require('./user')(app);
    require('./post')(app);
}(global.app));
