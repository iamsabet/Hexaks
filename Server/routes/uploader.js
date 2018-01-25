var express = require('express'),
    fs = require("fs"),
    rimraf = require("rimraf"),
    mkdirp = require("mkdirp");

var postSchema = require('../models/post.model');
var post = new postSchema();
var albumSchema = require('../models/post.model');
var album = new albumSchema();
var posts = require('../routes/posts.js');
var users = require('../routes/users.js');
var albums = require('../routes/albums.js');
var multiparty = require('multiparty');
var random = require("randomstring");



var fileInputName = process.env.FILE_INPUT_NAME || "qqfile",
    originalPath ='/Users/sabet/Desktop/Hexaks/Hexaks/Pictures/Originals/',
    largePath ='/Users/sabet/Desktop/Hexaks/Hexaks/Pictures/Originals/',
    smallAndMediumPath ='/Users/sabet/Desktop/Hexaks/Hexaks/Pictures/Statics/',
    chunkDirName = "chunks",
    maxFileSize =  40000000, // in bytes, 0 for unlimited 40MB
    minFileSizeToChunk = 1000000; // in bytes 1MB
// routes
/* GET home page. */
var uploader = {

    onUpload: function (req, res,user,privacy) {

        var form = new multiparty.Form();
        console.log();
        form.parse(req, function (err, fields, files) {
            if (err) throw err;
            // text/plain is required to ensure support for IE9 and older

            if (files) {
                if (user.isUploadingPost === true) {
                    var pathis = "";
                    var size = "";
                    if (user.uploadingPost === "") {

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
                        user.uploadingPost = random.generate(20);
                        user.save();

                        var format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                        uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, user.uploadingPost + size + "." + format, res);

                        posts.create(user,fromat,function(callback){
                            res.send(callback);
                        });
                    }
                    else {
                        if (fields.qqfilename[0].split("sss").length > 1) {
                            size = "--Small";
                            pathis = smallAndMediumPath;
                            var format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, user.uploadingPost + size + "." + format, res);
                        }
                        else if (fields.qqfilename[0].split("mmm").length > 1) {
                            size = "--Medium";
                            pathis = smallAndMediumPath;
                            var format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, user.uploadingPost + size + "." + format, res);
                        }
                        else {
                            size = "";
                            pathis = originalPath;
                            var format = fields.qqfilename[0].split(".")[fields.qqfilename[0].split(".").length - 1];
                            uploader.onSimpleUpload(fields, files[fileInputName][0], pathis, user.uploadingPost + size + "." + format, res);
                        }
                    }
                }
                else{
                    res.send("initial posting first");
                }

            }
            else{
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
        var destinationDir = path+"/",
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
