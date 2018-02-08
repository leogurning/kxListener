const mongoose = require('mongoose');
var mongoosePaginate = require('mongoose-paginate');
var mongooseAggregatePaginate = require('mongoose-aggregate-paginate');

const Schema = mongoose.Schema;

const PurchaselogSchema = new Schema({
    userid: {type:String, required: true},
    songid: {type:String, required: true},
    purchasedate: {type:Date},
    objuserid: { type:mongoose.Schema.ObjectId, required: true},
    objsongid: { type:mongoose.Schema.ObjectId, required: true}
});

PurchaselogSchema.plugin(mongoosePaginate);
PurchaselogSchema.plugin(mongooseAggregatePaginate);

module.exports = mongoose.model('purchaselog', PurchaselogSchema, 'purchaselog');