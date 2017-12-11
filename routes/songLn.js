const mongoose = require( 'mongoose' );
const Song = require('../models/song');
const config = require('../config');

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
    var ounwind = 'artistdetails';
    var ounwind1 = 'albumdetails';
  
    var oproject = { 
        _id:1,
        labelid:1,
        artistid:1,
        albumid:1,
        songname: 1,
        songgenre:1,
        songlyric:1,
        songprice:1,
        "artist": "$artistdetails.artistname",
        "album": "$albumdetails.albumname",
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
query = { songname: new RegExp(songname,'i'),
    "albumdetails.albumyear": new RegExp(albumyear,'i'),
    songpublish: new RegExp(songpublish,'i')
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
var ounwind = 'artistdetails';
var ounwind1 = 'albumdetails';

var oproject = { 
    _id:1,
    labelid:1,
    artistid:1,
    albumid:1,
    songname: 1,
    songgenre:1,
    songlyric:1,
    songprice:1,
    "artist": "$artistdetails.artistname",
    "album": "$albumdetails.albumname",
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
        
    
    aggregate.lookup(olookup).unwind(ounwind);
    aggregate.lookup(olookup1).unwind(ounwind1);  
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