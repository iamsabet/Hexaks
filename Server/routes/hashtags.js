var hashtagSchema = require('../models/hashtag.model');
var Hashtag = new hashtagSchema();
/* GET home page. */
var hashtags = {

    autoCompleteHashtags : function(req, res,user) {
        
        hashtagSchema.search(req.body.text, 12, 5, function (autoCompletedList) {
            if(autoCompletedList !== false) {
                res.send(autoCompletedList);
            }
            else{
                res.send([]);
            }
        });
    },
    initialHashtagsInCache: function(mode){
        Hashtag.initial(mode);
    },
    create: function(now,mode,hashtagName,callback) {
        Hashtag.Create(now,mode,hashtagName,function(resx){
            return callback(resx);
        });
    },
    getOne: function(req, res,next,user) {
        var id = req.params.id;
        var user = data[0]; // Spoof a DB call
        res.json(user);
    },

};


module.exports = hashtags;