(function () {
    "use strict";

    var express = require('express'),
        bodyParser = require('body-parser'),
        methodOverride = require('method-override'),
        oauthServer = require('node-oauth2-server'),
        expressValidator = require('express-validator'),
        http = require('http'),
        mongoose = require('mongoose'),
        app = global.app = express();

    app.set('port', process.env.PORT || 3000);
    
    app.disable('x-powered-by');
    app.use(bodyParser.urlencoded({
        extended: true
    }));
    app.use(bodyParser.json());
    app.use(expressValidator());
    app.use(methodOverride());

    app.oauth = oauthServer({
        model: require('./oauth'),
        grants: ['password', 'refresh_token', 'authorization_code', 'client_credentials'],
        debug: !!process.env.DEBUG
    });

    app.all('/oauth/token', app.oauth.grant());

    app.get('/', app.oauth.authorise(), function (req, res) {
        res.status(200).send({success: true});
    });

    require('./model');
    require('./routes');

    app.use(app.oauth.errorHandler());

    mongoose.connect(process.env.MONGOOSE_URL || 'mongodb://localhost/herdcanon', function (err) {
        if(err) {
            throw err;
        }
        http.createServer(app).listen(app.get('port'), function () {
            console.log('Express server running on port ' + app.get('port'));
        });
    });

    module.exports = app;
}());
