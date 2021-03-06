// Copyright 2014 OpenWhere, Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

'use strict';

var winston = require('winston');
var config = require('../config');
var fs = require('fs');
var path = require('path');
var async = require('async');
var mongoose = require('mongoose');
var User = mongoose.model('User');
var Landscape = mongoose.model('Landscape');
var Deployment = mongoose.model('Deployment');
var Role = mongoose.model('Role');
var Group = mongoose.model('Group');
var AppSettings = mongoose.model('AppSettings');
var Account = mongoose.model('Account');

exports.clearDbAndPopulateWithSampleData = function() {

    var testUser;

    config.setCryptoKey(function(err) {
        if (err) {
    console.log("froglips: "  + data)
            winston.log('error', err);
        } else {

            Account.find({}).remove(function () {
                console.log(' -- Account collection cleared.');

                Account.create({
                    name: 'landscapes-svc',
                    region: 'us-east-1',
                    accessKeyId: 'FAKE_ACCESS_KEY_ID_1234',
                    secretAccessKey: '1234567890+abcdefghikjlmnopqrstuvwxyz'
                }, function (err, data) {
                    if(err) console.log('Account.create --> ' + err);
                    else console.log(' -- Default Account created.');
                });
            });

            AppSettings.find({}).remove(function () {
                console.log(' -- AppSettings collection cleared.');

                AppSettings.create({}, function () {
                    console.log(' -- Default AppSettings created.');
                });
            });

            User.find({}).remove(function () {
                console.log(' -- User collection cleared.');

                User.create({
                    provider: 'local',
                    name: 'Dan Devops',
                    email: 'devops@devops.com',
                    password: 'devops',
                    role: ['Manager']
                }, function () {
                    console.log(' -- User "devops@devops.com" created.');
                });

                User.create({
                        provider: 'local',
                        name: 'Aaron Admin',
                        email: 'admin@admin.com',
                        password: 'admin',
                        role: ['Administrator']
                    }, function () {
                        console.log(' -- User "admin@admin.com" created.');
                        User.findOne({name: 'Aaron Admin'}, function (err, user) {
                            if (!err) {

                                testUser = user.userInfo;

                                Role.find({}).remove(function () {
                                    console.log(' -- Role collection cleared.');

                                    Role.create({
                                        name: 'Administrator',
                                        description: 'Administrators have full control of the application.',
                                        permissions: [
                                            { value: 'C', name: 'Create', displayOrder: '10'},
                                            { value: 'R', name: 'Read', displayOrder: '20'},
                                            { value: 'U', name: 'Update', displayOrder: '30'},
                                            { value: 'D', name: 'Delete', displayOrder: '40'},
                                            { value: 'X', name: 'Execute', displayOrder: '80'},
                                            { value: 'F', name: 'Full Control', displayOrder: '90'}
                                        ],
                                        createdBy: testUser
                                    }, {
                                        name: 'User',
                                        description: 'Users have "signed up" and may view Landscapes.',
                                        permissions: [
                                            { value: 'R', name: 'Read', displayOrder: '20'}
                                        ],
                                        createdBy: testUser
                                    }, {
                                        name: 'Manager',
                                        description: 'Managers have full "CRUD" access and may deploy Landscapes to AWS.',
                                        permissions: [
                                            { value: 'C', name: 'Create', displayOrder: '10'},
                                            { value: 'R', name: 'Read', displayOrder: '20'},
                                            { value: 'U', name: 'Update', displayOrder: '30'},
                                            { value: 'D', name: 'Delete', displayOrder: '40'},
                                            { value: 'X', name: 'Execute', displayOrder: '80'}
                                        ],
                                        createdBy: testUser
                                    }, function () {
                                        console.log(' -- Default Roles created.');
                                    });
                                });

                                var filePath = path.join(__dirname + '/sample-template.json');

                                fs.readFile(filePath, {encoding: 'utf-8'}, function (err, data) {
                                    if (err) {
                                        console.log(err);
                                    }

                                    var template = data;
                                    console.log(' ----- sample-template: ' + filePath);

                                    Landscape.find({}).remove(function () {
                                        console.log(' -- Landscapes collection cleared.');
                                        Landscape.create({
                                            createdBy: testUser,
                                            name: 'High Performance Tiling System',
                                            version: '1.0',
                                            description: 'Auto scaling high performance tiling system for AWS.',
                                            imageUri: 'images/AWS.png',
                                            cloudFormationTemplate: template
                                        }, {
                                            createdBy: testUser,
                                            name: 'Cloud Service Factory 01',
                                            version: '1.0',
                                            description: "Service factory for AWS big data.",
                                            imageUri: "images/AWS-CF-Icon.png",
                                            cloudFormationTemplate: template
                                        }, {
                                            createdBy: testUser,
                                            name: 'Cloud Service Factory 02',
                                            version: '1.0',
                                            description: "Service factory for AWS big data.",
                                            imageUri: "images/AWS-VPC-Icon.png",
                                            cloudFormationTemplate: template
                                        }, {
                                            createdBy: testUser,
                                            name: 'Cloud Service Factory 03',
                                            version: '1.0',
                                            description: "Service factory for AWS big data.",
                                            imageUri: "images/AWS-EC2-Icon.png",
                                            cloudFormationTemplate: template
                                        }, {
                                            createdBy: testUser,
                                            name: 'Stacks',
                                            version: '1.0',
                                            description: "Stacks application.",
                                            imageUri: "images/AWS-CF-Stack-Icon.png",
                                            cloudFormationTemplate: template
                                        }, function () {
                                            console.log(' -- Sample Landscapes created.');
                                        });
                                    });

                                    Deployment.find({}).remove(function () {
                                        console.log(' -- Deployments collection cleared.');

                                        Group.find({}).remove(function () {
                                            console.log(' -- Groups collection cleared.');

                                            Landscape.findOne({name: 'Stacks'}, function (err, landscape) {

                                                User.findOne({name: 'Dan Devops'}, function (err, user) {
                                                    if (!err) {
                                                        var devopsUser = user.userInfo;
                                                        Group.create({
                                                            name: 'QA',
                                                            description: 'Group for QA testers',
                                                            users: [devopsUser],
                                                            landscapes: [landscape],
                                                            permissions: [
                                                                { value: 'R', name: 'Read', displayOrder: '20'},
                                                                { value: 'X', name: 'Execute', displayOrder: '80'}
                                                            ]
                                                        }, {
                                                            name: 'HR Project',
                                                            description: 'Group for HR Project infrastructure managers',
                                                            users: [devopsUser],
                                                            landscapes: [landscape],
                                                            permissions: [
                                                                { value: 'X', name: 'Execute', displayOrder: '80'}
                                                            ]
                                                        }, function () {
                                                            console.log(' -- Sample Groups created.');
                                                        });
                                                    }
                                                });
                                            });
                                        });
                                    });
                                });
                            }
                        });
                    }
                );
            });
        }
    });
};