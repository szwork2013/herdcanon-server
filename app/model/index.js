(function () {
    "use strict";

    var mongoose = require('mongoose');

    module.exports = {
        User: mongoose.model('User', require('./user')),
        Client: mongoose.model('Client', require('./client')),
        Post: mongoose.model('Post', require('./post'))
    };
} ());
