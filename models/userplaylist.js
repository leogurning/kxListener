const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const UserplaylistSchema = new Schema({
    userid: {type:String, required: true},
    playlistname: {type:String, required: true},
    objuserid: { type:mongoose.Schema.ObjectId, required: true}
});

UserplaylistSchema.plugin(mongoosePaginate);
UserplaylistSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('userplaylist', UserplaylistSchema, 'userplaylist');