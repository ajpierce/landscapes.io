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
var mongoose = require('mongoose');
var Landscape = mongoose.model('Landscape');
var Deployment = mongoose.model('Deployment');
var async = require('async');
var AWS = require('aws-sdk');

//var pathToAwsConfig = __dirname + '/../../lib/config/aws/config.json';
//AWS.config.loadFromPath(pathToAwsConfig);

// POST /api/deployments
exports.create = function (req, res) {
    winston.info(' ---> creating Deployment');

    var user = req.user;
    var data = req.body;

    var newDeployment = {};
    var parentLandscape = {};
    var stackParams = {};
    var stackName = {};
    var params = {};

//    console.log('data.accessKeyId --> ' + data.accessKeyId)
//    console.log('data.secretAccessKey --> ' + data.secretAccessKey)

    winston.info(' ---> setting AWS security credentials');
    AWS.config.update({accessKeyId: data.accessKeyId, secretAccessKey: data.secretAccessKey});

    winston.info(' ---> setting AWS Region: ' + data.location);
    AWS.config.region = data.location;

    var cloudFormation = new AWS.CloudFormation();

    async.series({
            saveDeploymentData: function (callback) {
                winston.info(' ---> async.series >> saving deployment data...');
                try {
                    newDeployment = new Deployment(data);
                    newDeployment.createdBy = user.name;

                    var keys = Object.keys(data.cloudFormationParameters);
                    for (var i = 0; i < keys.length; i++) {
                        var cloudFormationParameter = { ParameterKey: keys[i], ParameterValue: data.cloudFormationParameters[keys[i]] };
                        newDeployment.cloudFormationParameters.push(cloudFormationParameter);
                    }

                    newDeployment.save(function (err, data) {
                        if (err) {
                            callback(err);
                        } else {
                            winston.info(' ---> async.series >> deployment data saved!');
                            stackName = newDeployment.stackName;
                            params = { StackName: stackName };
                            callback(null);
                        }
                    });
                }
                catch (err) {
                    callback(err);
                }
            },
            setStackParameters: function(callback) {
                winston.info(' ---> async.series >> setting stack parameters...');
                Landscape.findOne({_id: newDeployment.landscapeId}, function (err, landscape) {
                    if (err) {
                        callback(err);
                    } else {
                        parentLandscape = landscape;

                        stackParams = {
                            StackName: stackName,
                            TemplateBody: landscape.cloudFormationTemplate,
                            Parameters: newDeployment.cloudFormationParameters
                        };

                        stackParams.Parameters = newDeployment.cloudFormationParameters;
                        stackParams.Tags = [];

//                        if(newDeployment.flavor !== 'None') {
//                            stackParams.Tags.push({ Key: "Flavor", Value: newDeployment.flavor })
//                        }
                        if(newDeployment.description) {
                            stackParams.Tags.push({ Key: "Description", Value: newDeployment.description });
                        }
                        if(newDeployment.billingCode) {
                            stackParams.Tags.push({ Key: "Billing Code", Value: newDeployment.billingCode });
                        }

                        winston.info(' ---> async.series >> stack parameters set!');
                        callback(null);
                    }
                });
            },
            verifyStackNameAvailability: function(callback) {
                winston.info(' ---> async.series >> verifying availability of stack name...');
                cloudFormation.describeStacks(params, function (err, data) {
                    if (err) {
                        if (err.message.indexOf('does not exist') !== -1) {
                            winston.info(' ---> async.series >> stack name "' + stackName + '" available!');
                            callback(null);
                        } else {
                            // It's a real error...
                            callback(err);
                        }

                    } else {
                        var e = { message: 'Stack with name \'' + stackName + '\' already exists.' };
                        winston.info(' ---> async.series >> stack name "' + stackName + '" already exists!');
                        callback(e);
                    }
                });
            },
            createStack: function(callback) {
                winston.info(' ---> async.series >> creating stack...');

                // fix single quote issue...
                var cleanStackParams = JSON.parse(JSON.stringify(stackParams));

                var awsRequest = cloudFormation.createStack(cleanStackParams, function (err, data) {
                    if (err) {
                        callback(err);

                    } else {
                        winston.info(' ---> async.series >> stack created!');

                        newDeployment.stackId = data.StackId;
                        newDeployment.save(function (err) {
                            if(err) {
                                callback(err);
                            }
                            callback(null, data); // awsRequest?
                        });
                    }
                });
            }
        },
        function (err, results) {
            if (err) {
                winston.info(' ---> async.series >> final callback: ERR');
                winston.log('error', err);

                newDeployment.awsErrors = err.message || err;
                newDeployment.save(function (err) {
                    if(err) { winston.log('error', err); }
                    return res.send(err);
                });
            }
            else {
                winston.info(' ---> async.series >> final callback: SUCCESS');
                return res.json({success: true});
            }
        }
    ); // end - async.series
};


// GET /api/deployments
exports.retrieve = function (req, res) {
    var id = req.params.id;
    return Deployment.find(function (err, deployments) {
        if (!err) {
            return res.json(deployments);
        } else {
            return res.send(err);
        }
    });
};


// PUT /api/deployments/<api>
exports.update = function (req, res) {
    winston.info(' ---> updating Deployment');

    var user = req.user.userInfo;

    if(user === undefined) {
        return res.send(401);
    }

    var data = req.body;

    var query = {_id: req.params.id };

    Deployment.findOne(query, function (err, doc) {
        if (err) {
            winston.log('error', err);
            return res.json(400, err);
        } else {
            var newNote = { createdBy: user, createdAt: new Date(), text: data.note.text };
            doc.notes.push(newNote);

            doc.save(function (err) {
                if (err) {
                    winston.log('error', err);
                    return res.send(500, err);
                } else {
                    winston.info(' ---> updated: ' + req.params.id);
                    return res.json(doc);
                }
            });
        }
    });
};


// GET /api/deployments/<id>
exports.retrieveOne = function (req, res) {
    var id = req.params.id;
    return Deployment.findOne({_id: id}, function (err, deployment) {
        if (!err) {
            return res.json(deployment);
        } else {
            return res.send(err);
        }
    });
};