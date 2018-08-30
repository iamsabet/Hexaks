const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
var redis = require("redis");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});
var Float = require('mongoose-float').loadType(mongoose);
var long = require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var deviceSchema = new Schema({
    brand:String,
    model:String,
    deviceId : String,
    used : long,
    deleted: Boolean,
    createdAt : Number,
    updatedAt : Number
});
// index
deviceSchema.methods.Create = function(brand,model,callback){
    if((brand && typeof brand === "string") && (model && typeof model === "string")) {
        device.findOneAndUpdate({
            brand: brand,
            model: model
        }, {}, function (err, resultx) {
            if (err) throw err;
            if (!resultx) {
                let newDevice = new Device({brand: brand, model: model});
                newDevice.createdAt = Date.now();
                newDevice.updatedAt = Date.now();
                newDevice.used = 1;
                newDevice.deviceId = random.generate(6);

                newDevice.save(function (err, result) {
                    if (result) {
                        console.log(" Created device");
                        callback(newDevice.deviceId);
                    }
                    else {
                        callback({result: false, message: "Create device failed"});
                    }
                });
            }
            else {
                console.log("updated device : " + resultx.deviceId);
                callback(resultx.deviceId);
            }
        });
    }
    else{
        callback(null);
    }
};



deviceSchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        let now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
deviceSchema.plugin(mongoosePaginate);
let Device = mongoose.model('devices', deviceSchema);
let device = mongoose.model('devices');
module.exports = device;