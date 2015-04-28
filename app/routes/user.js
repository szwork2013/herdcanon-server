module.exports = function(app) {
    "use strict";

    var User = require('../model').User;
    var ObjectId = require('mongoose').Schema.Types.ObjectId;
    var _ = require('lodash');

    var loadUser = function(req, res, next) {
        if (!req.user && req.user.id) {
            return next("missing user id");
        }

        User.findOne({
            _id: req.user.id
        }, function(err, user) {
            if (err) return next(err);
            if (!user) {
                res.status(404).send({
                    error: 'user does not exist'
                });
                return;
            }

            req.user = user;
            next();
        });
    };

    app.get('/users', app.oauth.authorise(), loadUser, function(req, res, next) {
        if (req.user.role !== 'admin' && req.user.role !== 'moderator') {
            res.status(403).send({
                error: 'Forbidden'
            });
            return;
        }

        req.checkQuery('limit', 'Invalid limit').optional().isInt();
        req.checkQuery('offset', 'Invalid offset').optional().isInt();

        var limit = req.query.limit || 10;
        var offset = req.query.offset || 0;

        // TODO: Add sorting options

        limit = Math.max(Math.min(limit, 25), 1);

        var errors = req.validationErrors();
        if (errors) {
            res.status(400).send(errors);
            return;
        }

        User.find({}, 'name _slugs').sort({
                'name': 1
            })
            .skip(offset)
            .limit(limit)
            .exec(function(err, users) {
                if (err) return next(err);

                res.send(_.map(users, function(user) {
                    return {
                        slug: user.slug,
                        name: user.name
                    }
                }));
            });
    });

    app.post('/users', function(req, res) {
        req.checkBody('email', 'Invalid e-Mail').notEmpty().isEmail();
        req.checkBody('password', 'Invalid Password').notEmpty().isLength(6);
        req.checkBody('name', 'Invalid name').notEmpty().isLength(4);

        req.sanitize('email').normalizeEmail();
        req.sanitize('password').toString();
        req.sanitize('name').escape().trim().toString();

        var errors = req.validationErrors();
        if (errors) {
            res.status(400).send(errors);
        }
        else {
            User.register(req.body.email, req.body.password, req.body.name, function(err, user) {
                if (err) {
                    if (err.code === 11000) {
                        res.status(400).send({
                            error: 'Name or email already exist'
                        });
                    }
                    else {
                        res.status(500).send(err);
                    }
                }
                else {
                    res.send({
                        success: true
                    });
                }
            });
        }
    });

    app.get('/user/:slug', app.oauth.authorise(), loadUser, function(req, res, next) {
        var slug = req.params.slug;

        User.findBySlug(slug, function(err, user) {
            if (err) return next(err);
            if (!user) {
                res.status(404).send({
                    error: 'user does not exist'
                });
            }

            var result = {
                name: user.name,
                slug: user.slug
            };

            if (req.user.id === user.id) {
                result.email = user.email;
                result.created = user.created;
            }

            res.send(result);
        });
    });

    app.put('/user/:slug', app.oauth.authorise(), loadUser, function(req, res, next) {
            var slug = req.params.slug;

            User.findBySlug(slug, function(err, user) {
                if (err) return next(err);
                if (!user) {
                    res.status(404).send({
                        error: 'user does not exist'
                    });
                }

                if (user.id !== req.user.id && req.user.role !== 'admin') {
                    res.status(403).send({
                        error: 'Forbidden'
                    });
                    return;
                }
                
                req.checkBody('email', 'Invalid e-Mail').optional().isEmail();
                req.checkBody('password', 'Invalid Password').optional().isLength(6);
                req.checkBody('name', 'Invalid name').optional().isLength(4);
                
                var errors = req.validationErrors();
                if(errors) {
                    res.status(400).send(errors);
                    return;
                }
                
                user.email = req.body.email || user.email;
                user.password = req.body.password || user.password;
                user.name = req.body.name || user.name;
                
                user.save(function (err) {
                    if(err) {
                        if(err.code === 11000) {
                            res.status(400).send({error: 'Duplicate email or name'});
                            return;
                        }
                        return next(err);
                    }
                    
                    res.send({success: true});
                });
            });
    });
    
    app.delete('/user/:slug', app.oauth.authorise(), loadUser, function(req, res, next) {
            var slug = req.params.slug;

            User.findBySlug(slug, function(err, user) {
                if (err) return next(err);
                if (!user) {
                    res.status(404).send({
                        error: 'user does not exist'
                    });
                }

                if (user.id !== req.user.id && req.user.role !== 'admin') {
                    res.status(403).send({
                        error: 'Forbidden'
                    });
                    return;
                }
                
                User.remove({_id: user.id}, function (err) {
                    if(err) return res.err;

                    // TODO: Remove this user's access/refresh tokens
                    
                    res.send({success: true});
                });
            });
    });
};
