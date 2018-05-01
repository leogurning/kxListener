const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const PlaylistSchema = new Schema({
    playlistid: {type:String, required: true},
    songid: {type:String, required: true},
    labelid: {type:String, required: true},
    artistid: {type:String, required: true},
    albumid: {type:String, required: true},
    songgenre:{type:String, required: true},
    objplaylistid: { type:mongoose.Schema.ObjectId, required: true},
    objsongid: { type:mongoose.Schema.ObjectId, required: true},
    objlabelid: { type:mongoose.Schema.ObjectId, required: true},
    objartistid: { type:mongoose.Schema.ObjectId, required: true},
    objalbumid: { type:mongoose.Schema.ObjectId, required: true},
});

PlaylistSchema.plugin(mongoosePaginate);
PlaylistSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('playlist', PlaylistSchema, 'playlist');