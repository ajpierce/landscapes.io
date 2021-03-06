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

var config = require('../config/config');
var winston = require('winston');
var fs = require('fs');
var path = require('path');
var crypto = require('crypto');
var mongoose = require('mongoose');
var Schema = mongoose.Schema;


var _cryptoKey;
var _algorithm = 'aes-256-cbc';


var AccountSchema = new Schema({
        createdAt: { type: Date, default: Date.now },
        createdBy: { type: Schema.ObjectId, ref: 'User'},

        name: { type: String, required: true},
        region: { type: String, required: true},
        accessKeyId: { type: String, required: true},
        secretAccessKey : { type: String, required: true, set: encrypt, get: decrypt }
    },
    config.getCryptoKey(function(err, key) {
        if (err) {
            winston.log('error', err);
        } else {
            _cryptoKey = key;
        }
    })
);


AccountSchema.set('toObject', { getters: true });
AccountSchema.set('toJSON', { getters: true });


function encrypt(secret) {
    console.log('## Encrypt Secret AccessKey ##');
    if (secret === null || typeof secret === 'undefined') return secret;

    try {
        var cipher = crypto.createCipher(_algorithm, _cryptoKey);
        var encrypted = cipher.update(secret, 'utf8', 'hex') + cipher.final('hex');
        console.log('encrypted data: ' + encrypted);
        return encrypted;
    } catch (err) {
        winston.log('error', 'encrypt: ' + err);
    }

}

function decrypt(secret) {
    console.log('## decryptSecretAccessKey ##');
    if (secret === null || typeof secret === 'undefined') return secret;

    try {
        var decipher = crypto.createDecipher(_algorithm, _cryptoKey);
        var decrypted = decipher.update(secret, 'hex', 'utf8') + decipher.final('utf8');
        return decrypted;
    } catch (err) {
        winston.log('error', 'decrypt: ' + err);
    }

}

mongoose.model('Account', AccountSchema);