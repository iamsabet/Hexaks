var fs = require("fs"),
    rimraf = require("rimraf"),
    mkdirp = require("mkdirp");

var postSchema = require('../models/post.model');
var post = new postSchema();
var userSchema = require('../models/user.model');
var user = new userSchema();
var posts = require('../routes/posts.js');
var users = require('../routes/users.js');
var multiparty = require('multiparty');
var random = require("randomstring");
var redis = require('redis');
var CryptoJS = require("crypto-js");
var redisClient = redis.createClient({
    password:"c120fec02d55hdxpc38st676nkf84v9d5f59e41cbdhju793cxna",

});    // Create the client
redisClient.select(2,function(){
    console.log("Connected to redis Database");
});


var fileInputName = process.env.FILE_INPUT_NAME || "qqfile",
    originalPath ='/Users/sabet/Projects/Hexaks/Server/Pictures/',
    smallAndMediumPath ='/Users/sabet/Projects/Hexaks/Web-Client/Statics/Pictures/',
    chunkDirName = "chunks",
    maxFileSize =  100000000, // in bytes, 0 for unlimited 100MB
    minFileSizeToChunk = 1000000; // in bytes 1MB
// routes
/* GET home page. */
var uploader = {

    onUpload: function (req, res,user) {

        var form = new multiparty.Form();
        form.parse(req, function (err, fields, files) {
            if (err) throw err;
            // text/plain is required to ensure support for IE9 and older
            if (files) {
                console.log(user);
                redisClient.get(user.userId + ":isUploadingPost", function (err, isPost) {
                    redisClient.get(user.userId + ":isUploadingAlbum", function (err, isAlbum) {
                        if (isPost || isAlbum) {
                            var pathis = "";
                            var size = "";
                            if (isAlbum) {

                            }
                            else if (isPost) {
                                var format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                                redisClient.get(user.userId + ":uploadingPost", function (err, value) {
                                    if (err) throw err;
                                    var uploadingPost;
                                    console.log(value);
                                    postSchema.count({ownerId: user.userId}, function (err, count) {
                                        if (err) {
                                            // console.log(err);
                                            return callback(null);
                                        }
                                        if (value) {
                                            uploadingPost = value;

                                        }
                                        else {

                                            console.log(count);
                                            count++;
                                            uploadingPost = CryptoJS.AES.encrypt(user.userId + ":--:" + count, 'postSecretKey 6985').toString().split("/").join("");
                                            redisClient.set(user.userId + ":uploadingPost", uploadingPost + "===." + format);
                                            posts.Create(user, format, uploadingPost, function (err, callback) {
                                                if (err) console.log(err);
                                                console.log(callback);
                                            });
                                        }
                                        if (fields.qqfilename[0].split("sss").length > 1) {

                                            size = "-Small";
                                            pathis = smallAndMediumPath;
                                        }
                                        else if (fields.qqfilename[0].split("mmm").length > 1) {
                                            size = "-Medium";
                                            pathis = smallAndMediumPath;
                                        }
                                        else {
                                            size = "";
                                            pathis = originalPath;
                                        }
                                        if (size === "") {
                                            pathis = originalPath;
                                            console.log(pathis);
                                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, uploadingPost.split("===.")[0]+ "."+format, res);
                                        }
                                        else {
                                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, uploadingPost.split("===.")[0] + size + "." + format, res);

                                        }
                                    });
                                });
                            }
                        }
                        else{
                            res.send({result:false,message:"Initial Upload post or album State First"});
                        }
                    });
                });
            }
            else {
                res.send("403 bad request");
            }
        });
    },

    onSimpleUpload: function (fields, file, path,fileName ,res) {
        let uuid = fields.qquuid,
            responseData = {
                success: false
            };

        file.name = fields.qqfilename;
        file.fullName = "";
        file.fullName = fileName;
        if (uploader.isValid(file.size)) {
            uploader.moveUploadedFile(file,uuid,path, function () {
                    responseData.success = true;
                    responseData.url = fileName;
                    res.send(responseData);

                },
                function () {
                    responseData.error = "Problem copying the file!";
                    responseData.url = fileName;
                    res.send(responseData);
                });
        }
        else {
            uploader.failWithTooBigFile(responseData, res);
        }
    },
    onChunkedUpload:function (fields, file,path,newFileName,res){

        var size = parseInt(fields.qqtotalfilesize),
            uuid = fields.qquuid,
            index = fields.qqpartindex,
            totalParts = parseInt(fields.qqtotalparts),
            responseData = {
                success: false
            };
        console.log(fields);
        file.name = newFileName;
        file.path = path;
        if (uploader.isValid(size)) {
            uploader.storeChunk(file,path,uuid, index,totalParts, function () {
                    if (index < totalParts - 1) {
                        responseData.success = true;
                        responseData.postId = newFileName;
                        res.send(responseData);
                    }
                    else {
                        uploader.combineChunks(file, uuid, function () {
                                responseData.success = true;
                                responseData.postId = newFileName;
                                res.send(responseData);
                            },
                            function () {
                                responseData.error = "Problem conbining the chunks!";
                                res.send(responseData);
                            });
                    }
                },
                function (reset) {
                    responseData.error = "Problem storing the chunk!";
                    res.send(responseData);
                });
        }
        else {
            uploader.failWithTooBigFile(responseData, res);
        }
    },

    failWithTooBigFile:function (responseData, res) {
        responseData.error = "Too big!";
        responseData.preventRetry = true;
        res.send(responseData);
    },

    onDeleteFile:function (req, res) {
        let uuid = req.params.uuid,
            dirToDelete = uploadedFilesPath + uuid;

        rimraf(dirToDelete, function (error) {
            if (error) {
                console.error("Problem deleting file! " + error);
                res.status(500);
                res.send(false);
            }

            res.send(true);
        });
    },
    minChukSize:function (size) {
        return ((size < minFileSizeToChunk) || (minFileSizeToChunk === 0));
    },
    isValid:function (size) {
        return maxFileSize === 0 || size < maxFileSize;
    },

    moveFile:function(destinationDir, sourceFile, destinationFile, success, failure) {
        mkdirp(destinationDir, sourceFile.fullName, function (error) {
            var sourceStream, destStream;
            if (error) {
                console.error("Problem creating directory " + destinationDir + ": " + error);
                failure();
            }
            else {
                sourceStream = fs.createReadStream(sourceFile);
                destStream = fs.createWriteStream(destinationFile);

                sourceStream
                    .on("error", function (error) {
                        console.error("Problem copying file: " + error.stack);
                        destStream.end();
                        failure();
                    })
                    .on("end", function () {
                        destStream.end();
                        success();
                    })
                    .pipe(destStream);
            }
        });
    },

    moveUploadedFile : function(file, uuid, path,success, failure) {
    var destinationDir = path,
        fileDestination = destinationDir + file.fullName;
        console.log(file.fullName);
        uploader.moveFile(destinationDir, file.path, fileDestination, success, failure);
    },
    storeChunk:function (file, path,uuid,index, numChunks, success, failure) {
        var destinationDir = path,
            chunkFilename = uploader.getChunkFilename(index, numChunks),
            fileDestination = destinationDir + chunkFilename;
            console.log(destinationDir + chunkFilename);
        uploader.moveFile(destinationDir, fileDestination, success, failure);
    },

    combineChunks :function (file, uuid, success, failure) {
        var chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
            destinationDir = uploadedFilesPath + uuid + "/",
            fileDestination = destinationDir + file.name;


        fs.readdir(chunksDir, function (err, fileNames) {
            var destFileStream;

            if (err) {
                console.error("Problem listing chunks! " + err);
                failure();
            }
            else {
                fileNames.sort();
                destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

                uploader.appendToStream(destFileStream, chunksDir, fileNames, 0, function () {
                        rimraf(chunksDir, function (rimrafError) {
                            if (rimrafError) {
                                console.log("Problem deleting chunks dir! " + rimrafError);
                            }
                        });
                        success();
                    },
                    failure);
            }
        });
    },

    appendToStream : function(destStream, srcDir, srcFilesnames, index, success, failure) {
        if (index < srcFilesnames.length) {
            fs.createReadStream(srcDir + srcFilesnames[index])
                .on("end", function () {
                    uploader.appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
                })
                .on("error", function (error) {
                    console.error("Problem appending chunk! " + error);
                    destStream.end();
                    failure();
                })
                .pipe(destStream, {end: false});
        }
        else {
            destStream.end();
            success();
        }
    },

    getChunkFilename : function(index, count) {
        let digits = String(count).length,
            zeros = new Array(digits + 1).join("0");

        return (zeros + index).slice(-digits);
    }

};
module.exports = uploader;
