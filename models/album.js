const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const AlbumSchema = new Schema({
    labelid: {type:String, required: true},
    artistid: {type:String, required: true},
    albumname: {type:String, required: true},
    albumyear: {type:String, required: true},
    albumgenre: {type:String, required: true},
    albumrate: {type:Number, required: true},
    albumprice: {type:Number, required: true},
    albumphotopath: {type:String, required: true},
    albumphotoname: {type:String, required: true},
    status: {type:String, required: true},
    objartistid: { type:mongoose.Schema.ObjectId, required: true}
});

AlbumSchema.plugin(mongoosePaginate);
AlbumSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('album', AlbumSchema, 'album');