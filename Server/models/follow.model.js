const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const random = require('randomstring');
require('mongoose-long')(mongoose);
var mongoosePaginate = require('mongoose-paginate');

var followSchema = new Schema({ // 9 Pixels
    followId : String,
    follower : String, // username
    following : String , // username
    deactive : Boolean,
    accepted : Boolean,
    createdAt:Date
});

followSchema.methods.Create = function(req,res,followObject){
    follow.findOneAndUpdate({follower:followObject.follower,following:followObject.following,deactive:true},{deactive:false},function(err,result){
        console.log(result);
        if(err) throw err;
        if(!result){
            var newFollow = new Follow(followObject);
            newFollow.createdAt = Date.now();
            newFollow.deactive = false;
            newFollow.followId = random.generate();
            newFollow.save(function (err) {
                if (err) throw err;
                console.log(newFollow.follower + " --> " + newFollow.following);
            });
        }
        res.send(true);

    });
};

followSchema.methods.Remove = function(req,res,unfollowOject){
    follow.findOneAndUpdate({follower:unfollowOject.follower,following:unfollowOject.following,deactive:false},{deactive:true},function(err,result){
       if(err) throw err;
       res.send(true);
       console.log(result);
    });
};

followSchema.pre('save', function(next){
    if(this.updatedAt) {
        this.updatedAt = Date.now();
    }
    else{
        var now = Date.now();
        this.createdAt = now;
        this.updatedAt = now;
    }
    next();
});
var Follow = mongoose.model('follows', followSchema);
var follow = mongoose.model('follows');
followSchema.plugin(mongoosePaginate);
module.exports = follow;