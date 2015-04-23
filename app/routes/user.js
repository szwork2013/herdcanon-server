module.exports = function (app) {
    "use strict";

    var User = require('../model').User;
    var ObjectId = require('mongoose').Schema.Types.ObjectId;
    var _ = require('lodash');
    
    var loadUser = function (req, res, next) {
        if(!req.user && req.user.id) {
            return next("missing user id");
        }
        
        User.findOne({
            _id: req.user.id
        }, function (err, user) {
            if(err) return next(err);
            if(!user) {
                res.status(404).send({error: 'user does not exist'});
                return;
            }
            
            req.user = user;
            next();
        });
    };
    
    app.get('/users', app.oauth.authorise(), loadUser, function (req, res, next) {
        if(req.user.role !== 'admin' && req.user.role !== 'moderator') {
            res.status(403).send({error: 'Forbidden'});
            return;
        }
        
        req.checkQuery('limit', 'Invalid limit').optional().isInt();
        req.checkQuery('offset', 'Invalid offset').optional().isInt();
        
        var limit = req.query.limit || 10;
        var offset = req.query.offset || 0;
        
        // TODO: Add sorting options
        
        limit = Math.max(Math.min(limit, 25), 1);
        
        var errors = req.validationErrors();
        if(errors) {
            res.status(400).send(errors);
            return;
        }
        
        User.find({}, 'name _slugs').sort({'name': 1})
            .skip(offset)
            .limit(limit)
            .exec(function (err, users) {
            if(err) return next(err);
            
            res.send(_.map(users, function(user) {
                return {
                    slug: user.slug,
                    name: user.name
                }
            }));
        });
    });

    app.post('/users', function (req, res) {
        req.checkBody('email', 'Invalid e-Mail').notEmpty().isEmail();
        req.checkBody('password', 'Invalid Password').notEmpty().isLength(6);
        req.checkBody('name', 'Invalid name').notEmpty().isLength(4);

        var errors = req.validationErrors();
        if(errors) {
            res.status(400).send(errors);
        } else {
            var email = req.body.email,
                password = req.body.password,
                name = req.body.name;

            User.register(email, password, name, function (err, user) {
                if(err) {
                    if(err.code === 11000) {
                        res.status(400).send({error: 'Name or email already exist'});
                    } else {
                        res.status(500).send(err);
                    }
                } else {
                    res.send({success:true});
                }
            });
        }
    });
    
    
};
