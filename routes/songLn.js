const mongoose = require( 'mongoose' );
const Song = require('../models/song');
const Msconfig = require('../models/masterconfig');
const Purchaselog = require('../models/purchaselog');
const Playlist = require('../models/playlist');
const Userplaylist = require('../models/userplaylist');
const config = require('../config');
const Songpurchase = require('../models/songpurchase');
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

exports.songbuyincrement = function(req, res, next){
    const songid = req.params.id;
  
    if (!songid) {
        return res.status(422).json({ success: false, message: 'Parameter data is not correct or incompleted.'});
    } else {
        Song.findById(songid).exec(function(err, song){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                
            if(song){
                song.songbuy = song.songbuy + 1 ;
                song.save(function(err){
                  if(err){ res.status(400).json({ success: false, message:'Error processing request '+ err }); }
                  res.status(201).json({
                      success: true,
                      message: 'Song buy has been added successfully'
                  });
                });
            }
        });
    }
}

exports.getsong = function(req, res, next){
    Song.find({_id:req.params.id}).exec(function(err, song){
          if(err) { 
              res.status(400).json({ success: false, message:'Error processing request '+ err }); 
          }
          res.status(201).json({
          success: true, 
          data: song
        });
      });
}

exports.getsongaggregate = function(req, res, next){
    
    const songid = new mongoose.Types.ObjectId(req.params.id);
    let query = {};
    
    if (!songid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        query = { _id:songid };
    }     
  
    var aggregate = Song.aggregate();        
    var olookup = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup1 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var olookup2 = {
        from: 'msconfig',
        localField: 'songgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };    
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwind2 = 'msconfigdetails';

    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        "genrevalue": "$msconfigdetails.value",
        songlyric:1,
        songprice:1,
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumphoto": "$albumdetails.albumphotopath",
        "albumyear": "$albumdetails.albumyear",
        objartistid:1,
        objalbumid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
    };

    aggregate.match(query).lookup(olookup).unwind(ounwind);  
    aggregate.lookup(olookup1).unwind(ounwind1);  
    aggregate.lookup(olookup2).unwind(ounwind2);  
    aggregate.project(oproject);      
  
    aggregate.exec(function(err, result) {
      if(err) 
      {
          res.status(400).json({
              success: false, 
              message: err.message
          });
      }
      else
      {
          res.status(201).json({
              success: true, 
              data: result
          });
      }
    });  
}

exports.songaggregateLn = function(req, res, next){

    const artistid = req.body.artistid || req.query.artistid;
    const albumid = req.body.albumid || req.query.albumid;
    const songname = req.body.songname || req.query.songname;
    const albumyear = req.body.albumyear || req.query.albumyear;
    const songgenre = req.body.songgenre || req.query.songgenre;
    const songpublish = req.body.songpublish || req.query.songpublish;
    const songbuy = req.body.songbuy || req.query.songbuy;  
    const status = req.body.status || req.query.status;
    const estatus = 'STSACT';
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    var totalcount;
  
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    //let qmatch = {};
  
    if(!limit || limit < 1) {
      limit = 10;
    }
  
    if(!page || page < 1) {
      page = 1;
    }
  
    if(!sortby) {
      sortby = 'songname';
    }

    // returns songs records based on query
    query = { $or:[{ "artistdetails.artistname": new RegExp(songname,'i')}, { "albumdetails.albumname": new RegExp(songname,'i')}, { songname: new RegExp(songname,'i')}], 
        "albumdetails.albumyear": new RegExp(albumyear,'i'),
        songpublish: new RegExp(songpublish,'i'),
        "msconfigdetails.group": msconfiggrp,
        "msconfigdetails.status": msconfigsts,
        "artistdetails.status": estatus,
        "albumdetails.status": estatus,
        "labeldetails.status": estatus  
    };
    if (artistid) {
        query = merge(query, {artistid:artistid});
    }
    if (albumid) {
        query = merge(query, {albumid:albumid});
    }
    if (songgenre) {
        query = merge(query, {songgenre:songgenre});
    }    
    if (songbuy) {
        if (songbuy == 'Y') {
            query = merge(query, {songbuy: { $gt: 0 }});
        } else {
            query = merge(query, {songbuy: { $lte: 0 }});
        }
    }  
    if (status) {
        query = merge(query, {status:status});
    }
    console.log(query);

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }
    
    var aggregate = Song.aggregate();        
    var olookup = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup1 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var olookup2 = {
        from: 'msconfig',
        localField: 'songgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };    
    var olookup3 = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
    };
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwind2 = 'msconfigdetails';
    var ounwind3 = 'labeldetails';

    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        "genrevalue": "$msconfigdetails.value",
        songlyric:1,
        songprice:1,
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumphoto": "$albumdetails.albumphotopath",
        "albumyear": "$albumdetails.albumyear",
        "labelname": "$labeldetails.name",
        objartistid:1,
        objalbumid:1,
        objlabelid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
    };
        

    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.lookup(olookup1).unwind(ounwind1);  
    aggregate.lookup(olookup2).unwind(ounwind2);
    aggregate.lookup(olookup3).unwind(ounwind3);  
    aggregate.match(query);  
    aggregate.project(oproject);      
    
    //var osort = { "$sort": { sortby: 1}};
    //aggregate.sort(osort);
    
    Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
        if(err) 
        {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        else
        { 
            res.status(201).json({
                success: true, 
                data: results,
                npage: pageCount,
                totalcount: count
            });
        }
    })
}

exports.songreportLn = function(req, res, next){

  const artistid = req.body.artistid || req.query.artistid;
  const albumid = req.body.albumid || req.query.albumid;
  const status = req.body.status || req.query.status;
  var totalcount;

  let limit = parseInt(req.query.limit);
  let page = parseInt(req.body.page || req.query.page);
  let sortby = req.body.sortby || req.query.sortby;
  let query = {};

  if(!limit || limit < 1) {
    limit = 10;
  }

  if(!page || page < 1) {
    page = 1;
  }

  if(!sortby) {
    sortby = 'songname';
  }

  var offset = (page - 1) * limit;

    // returns albums records based on query
    query = {};
    if (artistid) {
        query = merge(query, {artistid:artistid});
    }
    if (albumid) {
        query = merge(query, {albumid:albumid});
    }
    if (status) {
        query = merge(query, {status:status});
    }

    Song.count(query, function(err, count){
                totalcount = count;                
        if(count > offset){
        offset = 0;
        }
    });

    var options = {
        select: 'songname songpublish songbuy songprice status songprvwpath songprvwname songfilepath songfilename',
        sort: sortby,
        offset: offset,
        limit: limit
    }

    Song.paginate(query, options).then(function(result) {
        res.status(201).json({
            success: true, 
            data: result,
            totalcount: totalcount
        });
    });
}

exports.getmsconfigbygroup = function(req, res, next){
    const group = req.params.group;
    const status = 'STSACT';
    const sortby = 'code';
    let query = {};

    if (!group) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        // returns artists records based on query
        query = { group:group, status: status};        
        var fields = { 
            _id:0,
            code:1, 
            value:1 
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
        });
    }
}

exports.savesongpurchase = function(req, res, next){
    // Check for registration errors
     const userid = req.params.id;
     const songid = req.body.songid;

     if (!userid || !songid) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }
    // If no error, log song purchasing

    let oPurchaselog = new Purchaselog({
        userid: userid,
        songid: songid,
        purchasedate: new Date(),
        objuserid: userid,
        objsongid: songid
    });
        
    oPurchaselog.save(function(err, oPurchaselog) {
        if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
    
        res.status(200).json({
            success: true,
            message: 'Purchase Log created successfully.'
        });
    });
}

exports.addplaylist = function(req, res, next){
     const userid = req.params.id;
     const playlistname = req.body.playlistname;

     if (!userid || !playlistname) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }
    // If no error, log user playlist

    let oUserplaylist = new Userplaylist({
        userid: userid,
        playlistname: playlistname,
        objuserid: userid
    });
        
    oUserplaylist.save(function(err, ouserplist) {
        if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
        let plid = ouserplist._id;
        res.status(200).json({
            success: true,
            playlistid: plid,
            message: 'User playlist created successfully.'
        });
        //Delete redis respective keys
        rediscli.del('redis-user-plist-'+userid, 'redis-user-plistagg-'+userid);
    });
}

exports.removeplaylist = function(req, res, next){
     const playlistid = req.params.id;

    if (!playlistid) {
        return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
    }
    Userplaylist.findById(playlistid).exec(function(err, uplist) {
        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }       
        let userid = uplist.userid;
        //Delete redis respective keys
        rediscli.del('redis-user-plist-'+userid, 'redis-user-plistagg-'+userid);
        // If no error, delete user playlist
        Userplaylist.remove({_id: playlistid}, function(err){
            if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
            Playlist.remove({playlistid: playlistid}, function(err){
                if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
                res.status(201).json({
                    success: true,
                    message: 'Playlist removed successfully'
                });
                //Delete redis respective keys
                rediscli.del('redis-plist-'+playlistid);
            });
        });
    });
}

exports.addsongtoplaylist = function(req, res, next){
    const playlistid = req.params.id;
    const songid = req.body.songid;
    const userid = req.body.userid;

    if (!playlistid || !songid || !userid) {
        return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
    }
    Playlist.findOne({songid:songid, playlistid:playlistid}, function(err, plist) {
        if(err){ return res.status(400).json({ success: false, message: 'Error processing request '+ err }); }       
        if (plist) {
            return res.status(201).json({ success: false, message: 'Duplicate ! Song has already been added to the playlist !' });
        } else {
            Song.findById(songid).exec(function(err, song) {
                if(err){ return res.status(400).json({ success: false, message: 'Error processing request '+ err }); }       
                if (song) {
                    let labelid = song.labelid;
                    let artistid = song.artistid;
                    let albumid = song.albumid;
                    let songgenre = song.songgenre;
                       // If no error, add song to playlist
                    let oPlaylist = new Playlist({
                        playlistid: playlistid,
                        songid: songid,
                        labelid: labelid,
                        artistid: artistid,
                        albumid: albumid,
                        songgenre: songgenre,
                        objplaylistid: playlistid,
                        objsongid: songid,
                        objlabelid: labelid,
                        objartistid: artistid,
                        objalbumid: albumid
                    });
               
                    oPlaylist.save(function(err, oPlaylist) {
                        if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
                
                        res.status(200).json({
                            success: true,
                            message: 'Song added successfully to playlist.'
                        });
                        //Delete redis respective keys
                        rediscli.del('redis-plist-'+playlistid, 'redis-user-plistagg-'+userid);
                    });
                } else {
                    res.status(400).json({
                        success: false,
                        message: 'Error. There is no Song provided or invalid song id.'
                    });
                }
            });
        }        
    });
}

exports.removesongfrplaylist = function(req, res, next){
    const playlistitemid = req.params.id;
    const userid = req.body.userid;

    if (!playlistitemid || !userid) {
        return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
    }
    Playlist.findById(playlistitemid).exec(function(err, plist) {
        if(err){ res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
        let playlistid = plist.playlistid;
        //Delete redis respective keys
        rediscli.del('redis-plist-'+playlistid, 'redis-user-plistagg-'+userid);
        // If no error, remove song to playlist
        Playlist.remove({_id: playlistitemid}, function(err){
            if(err){ return res.status(400).json({ success: false, message: 'Error processing request '+ err }); }
            res.status(201).json({
                success: true,
                message: 'Song removed successfully'
            });
        });
    });
}

exports.getuserplaylist = function(req, res, next){
    const userid = req.params.id;
    const sortby = 'playlistname';
    let query = {};

    if (!userid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-user-plist-'+userid;
        rediscli.get(keyredis, function(err, obj) { 
            if (obj) {
              //console.log('key on redis...');
              res.status(201).json({
                  success: true,
                  data: JSON.parse(obj)
              }); 
            } else {
                // returns artists records based on query
                query = { userid:userid };        
                var fields = { 
                    _id:1, 
                    userid:1,
                    playlistname:1 
                };

                var psort = { playlistname: 1 };

                Userplaylist.find(query, fields).sort(psort).exec(function(err, result) {
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

exports.getsongplaylist = function(req, res, next){
    
    const playlistid = req.params.id || req.query.playlistid;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';

    let keyredis = 'redis-plist-'+playlistid;
    rediscli.hgetall(keyredis, function(err, obj) { 
        if (obj) {
          //console.log('key on redis...');
          res.status(201).json({
              success: true,
              data: JSON.parse(obj.plitems), 
              npage: obj.npage,
              totalcount: obj.totalcount              
          }); 
        } else {
            var totalcount;
            
            let limit = parseInt(req.query.limit);
            let page = parseInt(req.body.page || req.query.page);
            let sortby = req.body.sortby || req.query.sortby;
            let query = {};
            //let qmatch = {};
            
            if(!limit || limit < 1) {
                limit = 10;
            }
            
            if(!page || page < 1) {
                page = 1;
            }
            
            if(!sortby) {
                sortby = 'songname';
            }
            
            // returns songs records based on query
            query = { playlistid: playlistid,
                "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts };
        
            var options = {
                page: page,
                limit: limit,
                sortBy: sortby
            }
            
            var aggregate = Playlist.aggregate();        
            var olookup = {
                from: 'song',
                localField: 'objsongid',
                foreignField: '_id',
                as: 'songdetails'
            };
            var ounwind = 'songdetails';
            var olookup1 = {
                from: 'artist',
                localField: 'objartistid',
                foreignField: '_id',
                as: 'artistdetails'
            };
            var olookup2 = {
                from: 'album',
                localField: 'objalbumid',
                foreignField: '_id',
                as: 'albumdetails'
            };
            var olookup3 = {
                from: 'msconfig',
                localField: 'songgenre',
                foreignField: 'code',
                as: 'msconfigdetails'
            };    
            var ounwind1 = 'artistdetails';
            var ounwind2 = 'albumdetails';
            var ounwind3 = 'msconfigdetails';

            var oproject = { 
                _id:1,
                playlistid:1,
                songid:1,
                labelid:1,
                artistid:1,
                albumid:1,
                songgenre:1,
                objsongid:1,
                objlabelid:1,
                objartistid:1,
                objalbumid:1,
                "songname": "$songdetails.songname",
                'songlyric':"$songdetails.songlyric",
                'songprice':"$songdetails.songprice", 
                "songprvwpath":"$songdetails.songprvwpath",
                "songprvwname":"$songdetails.songprvwname",
                "songfilepath":"$songdetails.songfilepath",
                "songfilename":"$songdetails.songfilename",
                "songpublish":"$songdetails.songpublish",
                "songbuy":"$songdetails.songbuy",
                "artist": "$artistdetails.artistname",
                "album": "$albumdetails.albumname",
                "albumphoto": "$albumdetails.albumphotopath",
                "albumyear": "$albumdetails.albumyear",
                "genrevalue": "$msconfigdetails.value",
            };
                
            aggregate.lookup(olookup3).unwind(ounwind3);
            aggregate.match(query);  
            aggregate.lookup(olookup).unwind(ounwind);
            aggregate.lookup(olookup1).unwind(ounwind1);
            aggregate.lookup(olookup2).unwind(ounwind2);
            aggregate.project(oproject);      
            
            //var osort = { "$sort": { sortby: 1}};
            //aggregate.sort(osort);
            
            Playlist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                if(err) 
                {
                    res.status(400).json({
                        success: false, 
                        message: err.message
                    });
                }
                else
                { 
                    res.status(201).json({
                        success: true, 
                        data: results,
                        npage: pageCount,
                        totalcount: count
                    });
                    //set in redis
                    rediscli.hmset(keyredis, [ 
                        'plitems', JSON.stringify(results),
                        'npage', pageCount,
                        'totalcount', count ], function(err, reply) {
                        if (err) {  console.log(err); }
                        console.log(reply);
                    }); 
                }
            })
        }
    });
}

exports.isPurchased = function(req, res, next){
    // Check for registration errors
     const listenerid = req.params.id;
     const songid = req.body.songid;
     var isP = false;

     if (!listenerid || !songid) {
         return res.status(201).json({ success: false, message: 'Posted data is not correct or incomplete.'});
     }

    Songpurchase.find({ listenerid: listenerid, songid: songid}, function(err, resPurchased) {
        if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }

        // check each purchase records, return purchase result
        if (resPurchased) {
            Object.keys(resPurchased).forEach(function (key){
                //console.log(resPurchased[key]);
                let pmethod =  resPurchased[key].paymentmtd;
                let pstatus = resPurchased[key].status;
                if (pmethod === 'PMTCASH') {
                    if (pstatus != 'STSRJCT') {
                        isP = true;
                    }
                } else { //payment method not cash
                    if (pstatus === 'STSAPV') {
                        isP = true;
                    } 
                }
            });
            if (isP) {
                return res.status(201).json({
                    success: true,
                    result: true,
                    message: 'Song is already purchased.'
                }); 
            } else {
                return res.status(200).json({
                    success: true,
                    result: false,
                    message: 'Song is not purchased yet.'
                });
            }

        }
        res.status(200).json({
            success: true,
            result: false,
            message: 'Song is not purchased yet.'
       });
    });

/*      Songpurchase.findOne({ listenerid: listenerid, songid: songid}, function(err, resPurchased) {
         if(err){ return res.status(201).json({ success: false, message:'Error processing request '+ err}); }
        
         // If user is not unique, return error
         if (resPurchased) {
            let pmethod =  resPurchased.paymentmtd;
            let pstatus = resPurchased.status;
            if (pmethod === 'PMTCASH') {
                return res.status(201).json({
                    success: true,
                    result: true,
                    message: 'Song is already purchased.'
                });
            } else { //payment method not cash
                if (pstatus === 'STSAPV') {
                    return res.status(201).json({
                        success: true,
                        result: true,
                        message: 'Song is already purchased.'
                    }); 
                } else {
                    return res.status(200).json({
                        success: true,
                        result: false,
                        message: 'Song is not purchased yet.'
                    });
                }
            }
         }

        res.status(200).json({
            success: true,
            result: false,
            message: 'Song is not purchased yet.'
        });
    }); */

}

exports.topsongaggregate = function(req, res, next){
    
    const status = req.body.status || req.query.status;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const songpublish = 'Y';
    const estatus = 'STSACT';
    var totalcount;
    
    let keyredis = 'redis-topsongs';
    rediscli.hgetall(keyredis, function(err, obj) { 
        if (obj) {
          //console.log('key on redis...');
          res.status(201).json({
              success: true,
              data: JSON.parse(obj.songs), 
              npage: obj.npage,
              totalcount: obj.totalcount              
          }); 
        } else {
            let limit = parseInt(req.query.limit);
            let page = parseInt(req.body.page || req.query.page);
            let sortby = req.body.sortby || req.query.sortby;
            let query = {};
            //let qmatch = {};
            
            if(!limit || limit < 1) {
                limit = 15;
            }
            
            if(!page || page < 1) {
                page = 1;
            }
            
            // returns songs records based on query
            query = { "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts,
                "artistdetails.status": estatus,
                "albumdetails.status": estatus,
                "labeldetails.status": estatus  
            };
        
            if (estatus) {
                query = merge(query, {status:estatus});
            }
            query = merge(query, {songpublish: songpublish});
            console.log(query);
        
            if(!sortby) {
                var options = {
                    page: page,
                    limit: limit
                }
            }
            else {
                var options = {
                    page: page,
                    limit: limit,
                    sortBy: sortby
                }
            }
            
            var aggregate = Song.aggregate();        
            var olookup = {
                from: 'artist',
                localField: 'objartistid',
                foreignField: '_id',
                as: 'artistdetails'
            };
            var olookup1 = {
                from: 'album',
                localField: 'objalbumid',
                foreignField: '_id',
                as: 'albumdetails'
            };
            var olookup2 = {
                from: 'msconfig',
                localField: 'songgenre',
                foreignField: 'code',
                as: 'msconfigdetails'
            };    
            var olookup3 = {
                from: 'user',
                localField: 'objlabelid',
                foreignField: '_id',
                as: 'labeldetails'
            };
            var ounwind = 'artistdetails';
            var ounwind1 = 'albumdetails';
            var ounwind2 = 'msconfigdetails';
            var ounwind3 = 'labeldetails';

            var oproject = { 
                _id:1,
                labelid:1,
                artistid:1,
                albumid:1,
                songname: 1,
                songgenre:1,
                "genrevalue": "$msconfigdetails.value",
                songlyric:1,
                songprice:1,
                "artist": "$artistdetails.artistname",
                "album": "$albumdetails.albumname",
                "albumphoto": "$albumdetails.albumphotopath",
                "albumyear": "$albumdetails.albumyear",
                "labelname": "$labeldetails.name",
                objartistid:1,
                objalbumid:1,
                objlabelid:1,
                songpublish:1,
                songbuy:1,
                status:1,
                songprvwpath:1,
                songprvwname:1,    
                songfilepath:1,
                songfilename:1,
            };
                
            
            aggregate.lookup(olookup).unwind(ounwind);
            aggregate.lookup(olookup1).unwind(ounwind1);  
            aggregate.lookup(olookup2).unwind(ounwind2);  
            aggregate.lookup(olookup3).unwind(ounwind3);  
            aggregate.match(query);  
            aggregate.project(oproject);  
            
            if(!sortby) {
                var osort = { songbuy:-1};
                aggregate.sort(osort);
            }
            Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                if(err) 
                {
                    res.status(400).json({
                        success: false, 
                        message: err.message
                    });
                }
                else
                { 
                    res.status(201).json({
                        success: true, 
                        data: results,
                        npage: pageCount,
                        totalcount: count
                    });
                    //set in redis
                    rediscli.hmset(keyredis, [ 
                        'songs', JSON.stringify(results),
                        'npage', pageCount,
                        'totalcount', count ], function(err, reply) {
                        if (err) {  console.log(err); }
                        console.log(reply);
                    }); 
                }
            })
        }    
    });
}

exports.topsongaggregateln = function(req, res, next){
    const listenerid = req.params.id;
    const status = req.body.status || req.query.status;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const songpublish = 'Y';
    const estatus = 'STSACT';
    var totalcount;
    const pustatus = 'STSAPV';

    let keyredis = 'redis-topsongs-'+listenerid;
    //rediscli.del(keyredis);
    rediscli.hgetall(keyredis, function(err, obj) { 
        if (obj) {
          //console.log('key on redis...');
          res.status(201).json({
              success: true,
              data: JSON.parse(obj.songs), 
              npage: obj.npage,
              totalcount: obj.totalcount              
          }); 
        } else {

            if (!listenerid) {
                res.status(400).json({
                    success: false, 
                    message: 'Listener id parameter is empty.'
                });
            }
            let limit = parseInt(req.query.limit);
            let page = parseInt(req.body.page || req.query.page);
            let sortby = req.body.sortby || req.query.sortby;
            let query = {};
            let query1 = {};
            
            if(!limit || limit < 1) {
                limit = 15;
            }
            
            if(!page || page < 1) {
                page = 1;
            }

            // returns songs records based on query
            query = { "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts,
                "artistdetails.status": estatus,
                "albumdetails.status": estatus,
                "labeldetails.status": estatus,
                //$and:[{"purchasedetails.listenerid": listenerid},{"purchasedetails.status": pustatus} ]
                //"purchasedetails.status": pustatus  
            };
        
            if (estatus) {
                query = merge(query, {status:estatus});
            }
            query = merge(query, {songpublish: songpublish});
            console.log(query);
        
            if(!sortby) {
                var options = {
                    page: page,
                    limit: limit
                }
            }
            else {
                var options = {
                    page: page,
                    limit: limit,
                    sortBy: sortby
                }
            }
            
            var aggregate = Song.aggregate();   
            var aggregate1 = Song.aggregate();     
            var olookup = {
                from: 'artist',
                localField: 'objartistid',
                foreignField: '_id',
                as: 'artistdetails'
            };
            var olookup1 = {
                from: 'album',
                localField: 'objalbumid',
                foreignField: '_id',
                as: 'albumdetails'
            };
            var olookup2 = {
                from: 'msconfig',
                localField: 'songgenre',
                foreignField: 'code',
                as: 'msconfigdetails'
            };    
            var olookup3 = {
                from: 'user',
                localField: 'objlabelid',
                foreignField: '_id',
                as: 'labeldetails'
            };
            var ounwind = 'artistdetails';
            var ounwind1 = 'albumdetails';
            var ounwind2 = 'msconfigdetails';
            var ounwind3 = 'labeldetails';

            var oproject = { 
                _id:1,
                labelid:1,
                artistid:1,
                albumid:1,
                songname: 1,
                songgenre:1,
                "genrevalue": "$msconfigdetails.value",
                songlyric:1,
                songprice:1,
                "artist": "$artistdetails.artistname",
                "album": "$albumdetails.albumname",
                "albumphoto": "$albumdetails.albumphotopath",
                "albumyear": "$albumdetails.albumyear",
                "labelname": "$labeldetails.name",
                objartistid:1,
                objalbumid:1,
                objlabelid:1,
                songpublish:1,
                songbuy:1,
                status:1,
                songprvwpath:1,
                songprvwname:1,    
                songfilepath:1,
                songfilename:1,
                //"pcsdtl":"$purchasedtls",
                "pcsflag":{
                    $cond: [{
                            $eq: ["$purchasedtls", []]
                        },
                        'N', "Y"
                    ]
                }
                /* "listenerid": {
                    $cond: [{
                            $eq: ["$purchasedetails", []]
                        },
                        ['none'], "$purchasedetails.listenerid"
                    ]
                },  */
                //"listenerid": "$purchasedetails.listenerid",
                //"purchased": { $size: "$purchasedetails.listenerid"}
            };
            query1 = { "purchasedetails.listenerid": listenerid, "purchasedetails.status": pustatus,
                        status:estatus  }; 
            var olookuppc = {
                from: 'songpurchase',
                localField: '_id',
                foreignField: 'objsongid',
                as: 'purchasedetails'
            };
            var ounwindpc = {path: "$purchasedetails", preserveNullAndEmptyArrays: true };
            
            var oprojectpc = { 
                _id:1,
                songname: 1,
                /* "listenerid": {
                    $cond: [{
                            $eq: ["$purchasedetails", []]
                        },
                        [{'listenerid':'none','status':'none'}], "$purchasedetails"
                    ]
                }, */
                "listenerid": "$purchasedetails.listenerid",
                "pcstatus":"$purchasedetails.status",
                "pmtmtd": "$purchasedetails.paymentmtd"
                /* "pcstatus":"$purchasedetails.status",
                "listenerid": "$purchasedetails.listenerid",
                "purchased": { $size: "$purchasedetails.listenerid" } */
            };
            /* let group = { _id: {songid: "$_id", songname: "$songname", listenerid:"$listenerid", pcstatus:"$pcstatus", pmethod:"$pmtmtd"} , 
                    balance: { $sum: "$_id"},
                    count: { $sum: 1}
            }; */
            let group = { _id: "$_id", 
                         count: { $sum: 1}
                        };

            var olookuppcs = {
                from: 'pcdtl-'+listenerid,
                localField: '_id',
                foreignField: '_id',
                as: 'purchasedtls'
            }

            aggregate1.lookup(olookuppc).unwind(ounwindpc);
            aggregate1.match(query1);  
            aggregate1.project(oprojectpc);
            aggregate1.group(group); 
            aggregate1.out('pcdtl-'+listenerid);
            aggregate1.exec(function(err, result){
                if (err) {
                    res.status(400).json({
                        success: false, 
                        message: err.message
                    });
                }
                //console.log(result);
                
                aggregate.lookup(olookup).unwind(ounwind);
                aggregate.lookup(olookup1).unwind(ounwind1);  
                aggregate.lookup(olookup2).unwind(ounwind2);  
                aggregate.lookup(olookup3).unwind(ounwind3);  
                aggregate.match(query);  
                aggregate.lookup(olookuppcs);
                aggregate.project(oproject); 
               
    
                //aggregate.find();
                if(!sortby) {
                    var osort = { songbuy:-1};
                    aggregate.sort(osort);
                }
                Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                    if(err) 
                    {
                        res.status(400).json({
                            success: false, 
                            message: err.message
                        });
                    }
                    else
                    { 
                        res.status(201).json({
                            success: true, 
                            data: results,
                            npage: pageCount,
                            totalcount: count
                        });
                        //set in redis
                        rediscli.hmset(keyredis, [ 
                            'songs', JSON.stringify(results),
                            'npage', pageCount,
                            'totalcount', count ], function(err, reply) {
                            if (err) {  console.log(err); }
                            console.log(reply);
                        }); 
                    }
                })
            });

            
        }    
    });
}

exports.recentsongaggregateln = function(req, res, next){
    const listenerid = req.params.id;
    const status = req.body.status || req.query.status;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const songpublish = 'Y';
    const estatus = 'STSACT';
    var totalcount;
    const pustatus = 'STSAPV';
    
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    let query1 = {};
    //let qmatch = {};
    
    if (!listenerid) {
        res.status(400).json({
            success: false, 
            message: 'Listener id parameter is empty.'
        });
    }

    if(!limit || limit < 1) {
        limit = 15;
    }
    
    if(!page || page < 1) {
        page = 1;
    }
    
    // returns songs records based on query
    query = { "msconfigdetails.group": msconfiggrp,
        "msconfigdetails.status": msconfigsts,
        "artistdetails.status": estatus,
        "albumdetails.status": estatus,
        "labeldetails.status": estatus  
    };

    if (estatus) {
        query = merge(query, {status:estatus});
    }
    query = merge(query, {songpublish: songpublish});
    console.log(query);

    if(!sortby) {
        var options = {
            page: page,
            limit: limit
        }
    }
    else {
        var options = {
            page: page,
            limit: limit,
            sortBy: sortby
        }
    }
    
    var aggregate = Song.aggregate();  
    var aggregate1 = Song.aggregate();       
    var olookup = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup1 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var olookup2 = {
        from: 'msconfig',
        localField: 'songgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };
    var olookup3 = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
    };    
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwind2 = 'msconfigdetails';
    var ounwind3 = 'labeldetails';
    
    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        "genrevalue": "$msconfigdetails.value",
        songlyric:1,
        songprice:1,
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumphoto": "$albumdetails.albumphotopath",
        "albumyear": "$albumdetails.albumyear",
        "labelname": "$labeldetails.name",
        objartistid:1,
        objalbumid:1,
        objlabelid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
        createddt:1,
        //"pcsdtl":"$purchasedtls",
        "pcsflag":{
            $cond: [{
                    $eq: ["$purchasedtls", []]
                },
                'N', "Y"
            ]
        }
    };
        
    query1 = { "purchasedetails.listenerid": listenerid, "purchasedetails.status": pustatus,
                status:estatus  }; 
    var olookuppc = {
            from: 'songpurchase',
            localField: '_id',
            foreignField: 'objsongid',
            as: 'purchasedetails'
        };
    var ounwindpc = {path: "$purchasedetails", preserveNullAndEmptyArrays: true };

    var oprojectpc = { 
            _id:1,
            songname: 1,
            "listenerid": "$purchasedetails.listenerid",
            "pcstatus":"$purchasedetails.status",
            "pmtmtd": "$purchasedetails.paymentmtd"

        };
    let group = { _id: "$_id", 
            count: { $sum: 1}
        };

    var olookuppcs = {
            from: 'pcdtl-'+listenerid,
            localField: '_id',
            foreignField: '_id',
            as: 'purchasedtls'
        }

    aggregate1.lookup(olookuppc).unwind(ounwindpc);
    aggregate1.match(query1);  
    aggregate1.project(oprojectpc);
    aggregate1.group(group); 
    aggregate1.out('pcdtl-'+listenerid);
    aggregate1.exec(function(err, result){
        if (err) {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }

        aggregate.lookup(olookup).unwind(ounwind);
        aggregate.lookup(olookup1).unwind(ounwind1);  
        aggregate.lookup(olookup2).unwind(ounwind2);
        aggregate.lookup(olookup3).unwind(ounwind3);  
        aggregate.match(query);  
        aggregate.lookup(olookuppcs);
        aggregate.project(oproject);  
        
        if(!sortby) {
            var osort = { createddt:-1};
            aggregate.sort(osort);
        }
        Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
            if(err) 
            {
                res.status(400).json({
                    success: false, 
                    message: err.message
                });
            }
            else
            { 
                res.status(201).json({
                    success: true, 
                    data: results,
                    npage: pageCount,
                    totalcount: count
                });
            }
        })
    });    
    
    
}

exports.songaggregateLn2 = function(req, res, next){
    const listenerid = req.params.id;
    const artistid = req.body.artistid || req.query.artistid;
    const albumid = req.body.albumid || req.query.albumid;
    const songname = req.body.songname || req.query.songname;
    const albumyear = req.body.albumyear || req.query.albumyear;
    const songgenre = req.body.songgenre || req.query.songgenre;
    const songpublish = req.body.songpublish || req.query.songpublish;
    const songbuy = req.body.songbuy || req.query.songbuy;  
    const status = req.body.status || req.query.status;
    const estatus = 'STSACT';
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    var totalcount;
    const pustatus = 'STSAPV';

    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    let query1 = {};
    //let qmatch = {};
    
    if (!listenerid) {
        res.status(400).json({
            success: false, 
            message: 'Listener id parameter is empty.'
        });
    }
    if(!limit || limit < 1) {
        limit = 10;
    }
    
    if(!page || page < 1) {
        page = 1;
    }
    
    if(!sortby) {
        sortby = 'songname';
    }

    // returns songs records based on query
    query = { $or:[{ "artistdetails.artistname": new RegExp(songname,'i')}, { "albumdetails.albumname": new RegExp(songname,'i')}, { songname: new RegExp(songname,'i')}], 
        "albumdetails.albumyear": new RegExp(albumyear,'i'),
        songpublish: new RegExp(songpublish,'i'),
        "msconfigdetails.group": msconfiggrp,
        "msconfigdetails.status": msconfigsts,
        "artistdetails.status": estatus,
        "albumdetails.status": estatus,
        "labeldetails.status": estatus  
    };
    if (artistid) {
        query = merge(query, {artistid:artistid});
    }
    if (albumid) {
        query = merge(query, {albumid:albumid});
    }
    if (songgenre) {
        query = merge(query, {songgenre:songgenre});
    }    
    if (songbuy) {
        if (songbuy == 'Y') {
            query = merge(query, {songbuy: { $gt: 0 }});
        } else {
            query = merge(query, {songbuy: { $lte: 0 }});
        }
    }  
    if (status) {
        query = merge(query, {status:status});
    }
    console.log(query);

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }
    
    var aggregate = Song.aggregate(); 
    var aggregate1 = Song.aggregate();       
    var olookup = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup1 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var olookup2 = {
        from: 'msconfig',
        localField: 'songgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };    
    var olookup3 = {
        from: 'user',
        localField: 'objlabelid',
        foreignField: '_id',
        as: 'labeldetails'
    };
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
    var ounwind2 = 'msconfigdetails';
    var ounwind3 = 'labeldetails';

    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        "genrevalue": "$msconfigdetails.value",
        songlyric:1,
        songprice:1,
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumphoto": "$albumdetails.albumphotopath",
        "albumyear": "$albumdetails.albumyear",
        "labelname": "$labeldetails.name",
        objartistid:1,
        objalbumid:1,
        objlabelid:1,
        songpublish:1,
        songbuy:1,
        status:1,
        songprvwpath:1,
        songprvwname:1,    
        songfilepath:1,
        songfilename:1,
        //"pcsdtl":"$purchasedtls",
        "pcsflag":{
            $cond: [{
                    $eq: ["$purchasedtls", []]
                },
                'N', "Y"
            ]
        }
    };
    
    query1 = { "purchasedetails.listenerid": listenerid, "purchasedetails.status": pustatus,
                status:estatus  }; 
    var olookuppc = {
            from: 'songpurchase',
            localField: '_id',
            foreignField: 'objsongid',
            as: 'purchasedetails'
    };
    var ounwindpc = {path: "$purchasedetails", preserveNullAndEmptyArrays: true };

    var oprojectpc = { 
            _id:1,
            songname: 1,
            "listenerid": "$purchasedetails.listenerid",
            "pcstatus":"$purchasedetails.status",
            "pmtmtd": "$purchasedetails.paymentmtd"
    };
    let group = { _id: "$_id", 
            count: { $sum: 1}
    };

    var olookuppcs = {
            from: 'pcdtl-'+listenerid,
            localField: '_id',
            foreignField: '_id',
            as: 'purchasedtls'
    }

    aggregate1.lookup(olookuppc).unwind(ounwindpc);
    aggregate1.match(query1);  
    aggregate1.project(oprojectpc);
    aggregate1.group(group); 
    aggregate1.out('pcdtl-'+listenerid);
    aggregate1.exec(function(err, result){
        if (err) {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        aggregate.lookup(olookup).unwind(ounwind);
        aggregate.lookup(olookup1).unwind(ounwind1);  
        aggregate.lookup(olookup2).unwind(ounwind2);
        aggregate.lookup(olookup3).unwind(ounwind3);  
        aggregate.match(query);  
        aggregate.lookup(olookuppcs);
        aggregate.project(oproject);      
        
        //var osort = { "$sort": { sortby: 1}};
        //aggregate.sort(osort);
        
        Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
            if(err) 
            {
                res.status(400).json({
                    success: false, 
                    message: err.message
                });
            }
            else
            { 
                res.status(201).json({
                    success: true, 
                    data: results,
                    npage: pageCount,
                    totalcount: count
                });
            }
        })
    });
    
}
/*
exports.getsongplaylist2 = function(req, res, next){
    
    const playlistid = req.params.id || req.query.playlistid;
    const listenerid = req.body.listenerid || req.query.listenerid;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const pustatus = 'STSAPV';
    const estatus = 'STSACT';

    let keyredis = 'redis-plist-'+playlistid;
    //rediscli.del(keyredis);
    rediscli.hgetall(keyredis, function(err, obj) { 
        if (obj) {
          //console.log('key on redis...');
          res.status(201).json({
              success: true,
              data: JSON.parse(obj.plitems), 
              npage: obj.npage,
              totalcount: obj.totalcount              
          }); 
        } else {
            if (!playlistid || !listenerid) {
                res.status(400).json({
                    success: false, 
                    message: 'Input Parameters are not fully provided.'
                });
            }
            var totalcount;
            
            let limit = parseInt(req.query.limit);
            let page = parseInt(req.body.page || req.query.page);
            let sortby = req.body.sortby || req.query.sortby;
            let query = {};
            let query1 = {};
            //let qmatch = {};
            
            if(!limit || limit < 1) {
                limit = 10;
            }
            
            if(!page || page < 1) {
                page = 1;
            }
            
            if(!sortby) {
                sortby = 'songname';
            }
            
            // returns songs records based on query
            query = { playlistid: playlistid,
                "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts };
        
            var options = {
                page: page,
                limit: limit,
                sortBy: sortby
            }
            
            var aggregate = Playlist.aggregate(); 
            var aggregate1 = Song.aggregate(); 

            var olookup = {
                from: 'song',
                localField: 'objsongid',
                foreignField: '_id',
                as: 'songdetails'
            };
            var ounwind = 'songdetails';
            var olookup1 = {
                from: 'artist',
                localField: 'objartistid',
                foreignField: '_id',
                as: 'artistdetails'
            };
            var olookup2 = {
                from: 'album',
                localField: 'objalbumid',
                foreignField: '_id',
                as: 'albumdetails'
            };
            var olookup3 = {
                from: 'msconfig',
                localField: 'songgenre',
                foreignField: 'code',
                as: 'msconfigdetails'
            };    
            var ounwind1 = 'artistdetails';
            var ounwind2 = 'albumdetails';
            var ounwind3 = 'msconfigdetails';

            var oproject = { 
                _id:1,
                playlistid:1,
                songid:1,
                labelid:1,
                artistid:1,
                albumid:1,
                songgenre:1,
                objsongid:1,
                objlabelid:1,
                objartistid:1,
                objalbumid:1,
                "songname": "$songdetails.songname",
                'songlyric':"$songdetails.songlyric",
                'songprice':"$songdetails.songprice", 
                "songprvwpath":"$songdetails.songprvwpath",
                "songprvwname":"$songdetails.songprvwname",
                "songfilepath":"$songdetails.songfilepath",
                "songfilename":"$songdetails.songfilename",
                "songpublish":"$songdetails.songpublish",
                //"songbuy":"$songdetails.songbuy",
                "artist": "$artistdetails.artistname",
                "album": "$albumdetails.albumname",
                "albumphoto": "$albumdetails.albumphotopath",
                "albumyear": "$albumdetails.albumyear",
                "genrevalue": "$msconfigdetails.value",
                //"pcsdtl":"$purchasedtls",
                "pcsflag":{
                    $cond: [{
                            $eq: ["$purchasedtls", []]
                        },
                        'N', "Y"
                    ]
                }
            };
            
            query1 = { "purchasedetails.listenerid": listenerid, "purchasedetails.status": pustatus,
                        status:estatus  }; 
            var olookuppc = {
                    from: 'songpurchase',
                    localField: '_id',
                    foreignField: 'objsongid',
                    as: 'purchasedetails'
            };
            var ounwindpc = {path: "$purchasedetails", preserveNullAndEmptyArrays: true };

            var oprojectpc = { 
                    _id:1,
                    songname: 1,
                    "listenerid": "$purchasedetails.listenerid",
                    "pcstatus":"$purchasedetails.status",
                    "pmtmtd": "$purchasedetails.paymentmtd"
            };
            let group = { _id: "$_id", 
                    count: { $sum: 1}
            };

            var olookuppcs = {
                    from: 'pcdtl-'+listenerid,
                    localField: 'objsongid',
                    foreignField: '_id',
                    as: 'purchasedtls'
            }
            aggregate1.lookup(olookuppc).unwind(ounwindpc);
            aggregate1.match(query1);  
            aggregate1.project(oprojectpc);
            aggregate1.group(group); 
            aggregate1.out('pcdtl-'+listenerid);
            aggregate1.exec(function(err, result){
                if (err) {
                    res.status(400).json({
                        success: false, 
                        message: err.message
                    });
                }
                aggregate.lookup(olookup3).unwind(ounwind3);
                aggregate.match(query);  
                aggregate.lookup(olookup).unwind(ounwind);
                aggregate.lookup(olookup1).unwind(ounwind1);
                aggregate.lookup(olookup2).unwind(ounwind2);
                aggregate.lookup(olookuppcs);
                aggregate.project(oproject);      
                
                //var osort = { "$sort": { sortby: 1}};
                //aggregate.sort(osort);
                
                Playlist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                    if(err) 
                    {
                        res.status(400).json({
                            success: false, 
                            message: err.message
                        });
                    }
                    else
                    { 
                        res.status(201).json({
                            success: true, 
                            data: results,
                            npage: pageCount,
                            totalcount: count
                        });
                        //set in redis
                        rediscli.hmset(keyredis, [ 
                            'plitems', JSON.stringify(results),
                            'npage', pageCount,
                            'totalcount', count ], function(err, reply) {
                            if (err) {  console.log(err); }
                            console.log(reply);
                        }); 
                    }
                })
            });
            
        }
    });
}
*/
exports.getsongplaylist2 = function(req, res, next){
    
    const playlistid = req.params.id || req.query.playlistid;
    const listenerid = req.body.listenerid || req.query.listenerid;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const pustatus = 'STSAPV';
    const estatus = 'STSACT';

    if (!playlistid || !listenerid) {
        res.status(400).json({
            success: false, 
            message: 'Input Parameters are not fully provided.'
        });
    }
    var totalcount;
    
    let limit = parseInt(req.query.limit);
    let page = parseInt(req.body.page || req.query.page);
    let sortby = req.body.sortby || req.query.sortby;
    let query = {};
    let query1 = {};
    //let qmatch = {};
    
    if(!limit || limit < 1) {
        limit = 10;
    }
    
    if(!page || page < 1) {
        page = 1;
    }
    
    if(!sortby) {
        sortby = 'songname';
    }
    
    // returns songs records based on query
    query = { playlistid: playlistid,
        "msconfigdetails.group": msconfiggrp,
        "msconfigdetails.status": msconfigsts };

    var options = {
        page: page,
        limit: limit,
        sortBy: sortby
    }
    
    var aggregate = Playlist.aggregate(); 
    var aggregate1 = Song.aggregate(); 

    var olookup = {
        from: 'song',
        localField: 'objsongid',
        foreignField: '_id',
        as: 'songdetails'
    };
    var ounwind = 'songdetails';
    var olookup1 = {
        from: 'artist',
        localField: 'objartistid',
        foreignField: '_id',
        as: 'artistdetails'
    };
    var olookup2 = {
        from: 'album',
        localField: 'objalbumid',
        foreignField: '_id',
        as: 'albumdetails'
    };
    var olookup3 = {
        from: 'msconfig',
        localField: 'songgenre',
        foreignField: 'code',
        as: 'msconfigdetails'
    };    
    var ounwind1 = 'artistdetails';
    var ounwind2 = 'albumdetails';
    var ounwind3 = 'msconfigdetails';

    var oproject = { 
        _id:1,
        playlistid:1,
        songid:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songgenre:1,
        objsongid:1,
        objlabelid:1,
        objartistid:1,
        objalbumid:1,
        "songname": "$songdetails.songname",
        'songlyric':"$songdetails.songlyric",
        'songprice':"$songdetails.songprice", 
        "songprvwpath":"$songdetails.songprvwpath",
        "songprvwname":"$songdetails.songprvwname",
        "songfilepath":"$songdetails.songfilepath",
        "songfilename":"$songdetails.songfilename",
        "songpublish":"$songdetails.songpublish",
        //"songbuy":"$songdetails.songbuy",
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
        "albumphoto": "$albumdetails.albumphotopath",
        "albumyear": "$albumdetails.albumyear",
        "genrevalue": "$msconfigdetails.value",
        //"pcsdtl":"$purchasedtls",
        "pcsflag":{
            $cond: [{
                    $eq: ["$purchasedtls", []]
                },
                'N', "Y"
            ]
        }
    };
    
    query1 = { "purchasedetails.listenerid": listenerid, "purchasedetails.status": pustatus,
                status:estatus  }; 
    var olookuppc = {
            from: 'songpurchase',
            localField: '_id',
            foreignField: 'objsongid',
            as: 'purchasedetails'
    };
    var ounwindpc = {path: "$purchasedetails", preserveNullAndEmptyArrays: true };

    var oprojectpc = { 
            _id:1,
            songname: 1,
            "listenerid": "$purchasedetails.listenerid",
            "pcstatus":"$purchasedetails.status",
            "pmtmtd": "$purchasedetails.paymentmtd"
    };
    let group = { _id: "$_id", 
            count: { $sum: 1}
    };

    var olookuppcs = {
            from: 'pcdtl-'+listenerid,
            localField: 'objsongid',
            foreignField: '_id',
            as: 'purchasedtls'
    }
    aggregate1.lookup(olookuppc).unwind(ounwindpc);
    aggregate1.match(query1);  
    aggregate1.project(oprojectpc);
    aggregate1.group(group); 
    aggregate1.out('pcdtl-'+listenerid);
    aggregate1.exec(function(err, result){
        if (err) {
            res.status(400).json({
                success: false, 
                message: err.message
            });
        }
        aggregate.lookup(olookup3).unwind(ounwind3);
        aggregate.match(query);  
        aggregate.lookup(olookup).unwind(ounwind);
        aggregate.lookup(olookup1).unwind(ounwind1);
        aggregate.lookup(olookup2).unwind(ounwind2);
        aggregate.lookup(olookuppcs);
        aggregate.project(oproject);      
        
        //var osort = { "$sort": { sortby: 1}};
        //aggregate.sort(osort);
        
        Playlist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
            if(err) 
            {
                res.status(400).json({
                    success: false, 
                    message: err.message
                });
            }
            else
            { 
                res.status(201).json({
                    success: true, 
                    data: results,
                    npage: pageCount,
                    totalcount: count
                });
                
            }
        })
    });
            
}

exports.recentsongaggregate = function(req, res, next){
    
    const status = req.body.status || req.query.status;
    const msconfiggrp = 'GENRE';
    const msconfigsts = 'STSACT';
    const songpublish = 'Y';
    const estatus = 'STSACT';
    var totalcount;
    
    let keyredis = 'redis-recentsongs';
    rediscli.hgetall(keyredis, function(err, obj) { 
        if (obj) {
          //console.log('key on redis...');
          res.status(201).json({
              success: true,
              data: JSON.parse(obj.songs), 
              npage: obj.npage,
              totalcount: obj.totalcount              
          }); 
        } else {
            let limit = parseInt(req.query.limit);
            let page = parseInt(req.body.page || req.query.page);
            let sortby = req.body.sortby || req.query.sortby;
            let query = {};
            //let qmatch = {};
            
            if(!limit || limit < 1) {
                limit = 15;
            }
            
            if(!page || page < 1) {
                page = 1;
            }
            
            // returns songs records based on query
            query = { "msconfigdetails.group": msconfiggrp,
                "msconfigdetails.status": msconfigsts,
                "artistdetails.status": estatus,
                "albumdetails.status": estatus,
                "labeldetails.status": estatus  
            };
        
            if (estatus) {
                query = merge(query, {status:estatus});
            }
            query = merge(query, {songpublish: songpublish});
            console.log(query);
        
            if(!sortby) {
                var options = {
                    page: page,
                    limit: limit
                }
            }
            else {
                var options = {
                    page: page,
                    limit: limit,
                    sortBy: sortby
                }
            }
            
            var aggregate = Song.aggregate();        
            var olookup = {
                from: 'artist',
                localField: 'objartistid',
                foreignField: '_id',
                as: 'artistdetails'
            };
            var olookup1 = {
                from: 'album',
                localField: 'objalbumid',
                foreignField: '_id',
                as: 'albumdetails'
            };
            var olookup2 = {
                from: 'msconfig',
                localField: 'songgenre',
                foreignField: 'code',
                as: 'msconfigdetails'
            };
            var olookup3 = {
                from: 'user',
                localField: 'objlabelid',
                foreignField: '_id',
                as: 'labeldetails'
            };    
            var ounwind = 'artistdetails';
            var ounwind1 = 'albumdetails';
            var ounwind2 = 'msconfigdetails';
            var ounwind3 = 'labeldetails';
            
            var oproject = { 
                _id:1,
                labelid:1,
                artistid:1,
                albumid:1,
                songname: 1,
                songgenre:1,
                "genrevalue": "$msconfigdetails.value",
                songlyric:1,
                songprice:1,
                "artist": "$artistdetails.artistname",
                "album": "$albumdetails.albumname",
                "albumphoto": "$albumdetails.albumphotopath",
                "albumyear": "$albumdetails.albumyear",
                "labelname": "$labeldetails.name",
                objartistid:1,
                objalbumid:1,
                objlabelid:1,
                songpublish:1,
                songbuy:1,
                status:1,
                songprvwpath:1,
                songprvwname:1,    
                songfilepath:1,
                songfilename:1,
                createddt:1
            };
                
            
            aggregate.lookup(olookup).unwind(ounwind);
            aggregate.lookup(olookup1).unwind(ounwind1);  
            aggregate.lookup(olookup2).unwind(ounwind2);
            aggregate.lookup(olookup3).unwind(ounwind3);  
            aggregate.match(query);  
            aggregate.project(oproject);  
            
            if(!sortby) {
                var osort = { createddt:-1};
                aggregate.sort(osort);
            }
            Song.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                if(err) 
                {
                    res.status(400).json({
                        success: false, 
                        message: err.message
                    });
                }
                else
                { 
                    res.status(201).json({
                        success: true, 
                        data: results,
                        npage: pageCount,
                        totalcount: count
                    });
                    //set in redis
                    rediscli.hmset(keyredis, [ 
                        'songs', JSON.stringify(results),
                        'npage', pageCount,
                        'totalcount', count ], function(err, reply) {
                        if (err) {  console.log(err); }
                        console.log(reply);
                    }); 
                }
            })
        }
    });
}
/*
exports.getuserplaylistagg = function(req, res, next){
    const userid = req.params.id;
    const sortby = 'playlistname';
    let query = {};

    if (!userid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        let keyredis = 'redis-user-plistagg-'+userid;
        rediscli.hgetall(keyredis, function(err, obj) { 
            if (obj) {
              //console.log('key on redis...');
              res.status(201).json({
                  success: true,
                  data: JSON.parse(obj.data), 
                  npage: obj.npage,
                  totalcount: obj.totalcount              
              }); 
            } else {
                let limit = parseInt(req.query.limit);
                let page = parseInt(req.body.page || req.query.page);
                let sortby = req.body.sortby || req.query.sortby;
                let query = {};
                //let qmatch = {};
                
                if(!limit || limit < 1) {
                    limit = 10;
                }
                
                if(!page || page < 1) {
                    page = 1;
                }
                
                if(!sortby) {
                    sortby = 'playlistname';
                }
                
                // returns songs records based on query
                //query = { "userpldetails.userid": userid };
                query = { userid: userid };    
                var options = {
                    page: page,
                    limit: limit,
                    sortBy: sortby
                }
                
                var aggregate = Userplaylist.aggregate();    
             
                var olookup = {
                    from: 'playlist',
                    localField: '_id',
                    foreignField: 'objplaylistid',
                    as: 'pldetails'
                };
                //var ounwind = { "path": "$pldetails", "preserveNullAndEmptyArrays": true };
                var olookup1 = {
                    from: 'album',
                    localField: 'pldetails',
                    foreignField: '_id',
                    as: 'albumdetails'
                };
                //var ounwind1 = 'albumdetails';
        
                var oproject = { 
                    _id:1,
                    userid:1,
                    playlistname:1,
                    "pldetails": "$pldetails.objalbumid",
                    "noofsongs": { $size: "$pldetails.objalbumid" }
                }; 
                var oproject1 = { 
                    _id:1,
                    userid:1,
                    playlistname:1,
                    "noofsongs": 1,
                    "albumdetails": "$albumdetails.albumphotopath"
                };     
                //aggregate.lookup(olookup).unwind(ounwind);
                //aggregate.lookup(olookup);
                aggregate.match(query);
                aggregate.lookup(olookup);  
                aggregate.project(oproject);
                aggregate.lookup(olookup1); 
                aggregate.project(oproject1);  
                
                //var osort = { "$sort": { sortby: 1}};
                //aggregate.sort(osort);
                
                Userplaylist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
                    if(err) 
                    {
                        res.status(400).json({
                            success: false, 
                            message: err.message
                        });
                    }
                    else
                    { 
                        res.status(201).json({
                            success: true, 
                            data: results,
                            npage: pageCount,
                            totalcount: count
                        });
                        //set in redis
                        rediscli.hmset(keyredis, [ 
                            'data', JSON.stringify(results),
                            'npage', pageCount,
                            'totalcount', count ], function(err, reply) {
                            if (err) {  console.log(err); }
                            console.log(reply);
                        }); 
                    }
                });
            }
        });
    }
}
*/
exports.getuserplaylistagg = function(req, res, next){
    const userid = req.params.id;
    const sortby = 'playlistname';
    let query = {};

    if (!userid) {
        return res.status(422).send({ error: 'Parameter data is not correct or incompleted.'});
    }else{
        
        let limit = parseInt(req.query.limit);
        let page = parseInt(req.body.page || req.query.page);
        let sortby = req.body.sortby || req.query.sortby;
        let query = {};
        //let qmatch = {};
        
        if(!limit || limit < 1) {
            limit = 10;
        }
        
        if(!page || page < 1) {
            page = 1;
        }
        
        if(!sortby) {
            sortby = 'playlistname';
        }
        
        // returns songs records based on query
        //query = { "userpldetails.userid": userid };
        query = { userid: userid };    
        var options = {
            page: page,
            limit: limit,
            sortBy: sortby
        }
        
        var aggregate = Userplaylist.aggregate();    
        
        var olookup = {
            from: 'playlist',
            localField: '_id',
            foreignField: 'objplaylistid',
            as: 'pldetails'
        };
        //var ounwind = { "path": "$pldetails", "preserveNullAndEmptyArrays": true };
        var olookup1 = {
            from: 'album',
            localField: 'pldetails',
            foreignField: '_id',
            as: 'albumdetails'
        };
        //var ounwind1 = 'albumdetails';

        var oproject = { 
            _id:1,
            userid:1,
            playlistname:1,
            "pldetails": "$pldetails.objalbumid",
            "noofsongs": { $size: "$pldetails.objalbumid" }
        }; 
        var oproject1 = { 
            _id:1,
            userid:1,
            playlistname:1,
            "noofsongs": 1,
            "albumdetails": "$albumdetails.albumphotopath"
        };     
        //aggregate.lookup(olookup).unwind(ounwind);
        //aggregate.lookup(olookup);
        aggregate.match(query);
        aggregate.lookup(olookup);  
        aggregate.project(oproject);
        aggregate.lookup(olookup1); 
        aggregate.project(oproject1);  
        
        //var osort = { "$sort": { sortby: 1}};
        //aggregate.sort(osort);
        
        Userplaylist.aggregatePaginate(aggregate, options, function(err, results, pageCount, count) {
            if(err) 
            {
                res.status(400).json({
                    success: false, 
                    message: err.message
                });
            }
            else
            { 
                res.status(201).json({
                    success: true, 
                    data: results,
                    npage: pageCount,
                    totalcount: count
                });

            }
        });
         
    }
}