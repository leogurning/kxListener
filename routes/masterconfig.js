const mongoose = require( 'mongoose' );
const Msconfig = require('../models/masterconfig');
const config = require('../config');
var rediscli = require('../redisconn');

var ObjId = mongoose.Types.ObjectId;
var merge = function() {
  var obj = {},
      i = 0,
      il = arguments.length,
      key;
  for (; i < il; i++) {
      for (key in arguments[i]) {
          if (arguments[i].hasOwnProperty(key)) {
              obj[key] = arguments[i][key];
          }
      }
  }
  return obj;
};


exports.getmsconfigbygroup = function(req, res, next){
    const group = req.params.group;
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    if (!group) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-lis-'+group+'-grp';
        //check on redis
        rediscli.get(keyredis, function(error,obj) {
            if (obj) {
                //console.log('key on redis..');
                res.status(201).json({
                    success: true, 
                    data: JSON.parse(obj)
                });                
            }else {
                //console.log('key not on redis..');
                // returns config records based on query
                query = { group:group, status: status};        
                var fields = { 
                    _id:0,
                    code:1, 
                    value:1,
                    filepath:1,
                    filename:1 
                };

                var psort = { code: 1 };

                Msconfig.find(query, fields).sort(psort).exec(function(err, result) {
                    if(err) { 
                        res.status(400).json({ success: false, message:'Error processing request '+ err }); 
                    } 
                    res.status(201).json({
                        success: true, 
                        data: result
                    });
                    //set in redis
                    rediscli.set(keyredis,JSON.stringify(result), function(error) {
                        if (error) { throw error; }
                    });                    
                });
            }
        });
    }
}

exports.getmsconfigvalue = function(req, res, next){
    const code = req.params.code;
    const group = req.query.group;
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    if (!code || !group) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-lis-'+code+group;
        //check on redis
        rediscli.get(keyredis, function(error,obj) { 
            if (obj) {
                //console.log('key on redis...');
                res.status(201).json({
                    success: true, 
                    data: JSON.parse(obj)
                }); 
            } else {
                //console.log('key NOT on redis...');
                // returns config value records based on query
                query = { code:code, group:group, status: status};        
                var fields = { 
                    _id:0,
                    code:1, 
                    value:1,
                    filepath:1,
                    filename:1  
                };

                var psort = { code: 1 };

                Msconfig.find(query, fields).sort(psort).exec(function(err, result) {
                    if(err) { 
                        res.status(400).json({ success: false, message:'Error processing request '+ err }); 
                    } 
                    res.status(201).json({
                        success: true, 
                        data: result
                    });
                    //set in redis
                    rediscli.set(keyredis,JSON.stringify(result), function(error) {
                        if (error) { throw error; }
                    });                    
                });
            }
        });
    }
}