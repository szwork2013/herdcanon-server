(function () {
    "use strict";

    var model = require('../model'),
        User = model.User,
        Client = model.Client,
        redis = require('redis'),
        redisClient = redis.createClient(process.env.REDIS_PORT || 6379);

    module.exports = {
        getAccessToken: function (bearerToken, done) {
            redisClient.hgetall('token:' + bearerToken, function (err, token) {
                if(err) return done(err);
                if(!token) return done();

                done(null, {
                    accessToken: token.accessToken,
                    clientId: token.clientId,
                    expires: token.expires ? new Date(token.expires) : null,
                    userId: token.userId
                });
            });
        },

        getClient: function (clientId, clientSecret, done) {
            Client.findOne({_id: clientId, secret: clientSecret}, function (err, client) {
                if(err) return done(err);
                if(!client) return done();

                done(null, {
                    clientId: client._id,
                    clientSecret: client.secret
                });
            });
        },
        
        getUserFromClient: function (clientId, clientSecret, done) {
            Client.findOne({_id: clientId, secret: clientSecret}, function (err, client) {
                if(err) return done(err);
                if(!client) return done();

                done(null, {
                    id: client.id,
                    isUser: false,
                    isClient: true
                });
            });
        },

        grantTypeAllowed: function (clientId, grantType, done) {
            done(null, grantType === 'password' || grantType === 'refresh_token' || grantType === 'client_credentials');
        },

        saveAccessToken: function (accessToken, clientId, expires, user, done) {
            redisClient.hmset('token:' + accessToken, {
                accessToken: accessToken,
                clientId: clientId,
                expires: expires ? expires.toISOString() : null,
                userId: user.id
            }, done);
        },

        getUser: function (username, password, done) {
            User.findByUsername(username, function (err, user) {
                if(err) return done(err);
                if(!user) return done();

                user.validatePassword(password, function (err, valid) {
                    if(err) return done(err);
                    if(!valid) return done();

                    done(null, {
                        id: user.id
                    });
                });
            });
        },

        saveRefreshToken: function (refreshToken, clientId, expires, user, done) {
            redisClient.hmset('refresh_token:' + refreshToken, {
                accessToken: refreshToken,
                clientId: clientId,
                expires: expires ? expires.toISOString() : null,
                userId: user.id
            }, done);

        },

        getRefreshToken: function (bearerToken, done) {
            redisClient.hgetall('refresh_token:' + bearerToken, function (err, token) {
                if(err) return done(err);
                if(!token) return done();

                done(null, {
                    refreshToken: token.accessToken,
                    clientId: token.clientId,
                    expires: token.expires ? new Date(token.expires) : null,
                    userId: token.userId
                });
            });
        },

        revokeRefreshToken: function (refreshToken, done) {
            redisClient.del('refresh_token:' + refreshToken, done);
        }
    };
}());
