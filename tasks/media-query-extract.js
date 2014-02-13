/*
* grunt-media-query-extractor
* https://github.com/bjork24/grunt-media-query-extractor
*
* Copyright (c) 2014 Dan Chilton
* Licensed under the MIT license.
*/

'use strict';

module.exports = function(grunt) {

  grunt.registerMultiTask('mqe', 'Combine and extract media queries for mobile-first responsive design', function() {

    var parseCss = require('css-parse');
    var _ = require('lodash');
    var path = require('path');
    var error = true;

    var options = this.options({
      log: false,
      hideComments: false,
      breakpointCollections: false
    });

    var log = function(message, highlight){
      if (options.log){
        if( _.isUndefined(highlight) ) {
          grunt.log.writeln(message);
        } else {
          grunt.log.ok(message);
        }
      }
    };

    var process = {
      style : function(style) {
        var styleStr = '';
        switch(style.type) {
          case 'rule':
            styleStr += process.rule(style);
            break;
          case 'declaration':
            styleStr += '\n\t' + process.declaration(style);
            break;
          case 'comment':
            if(!options.hideComments) {
              styleStr += process.comment(style);
            }
            break;
        }
        return styleStr;
      },
      comment : function(comment) {
        var commentStr = '/*' + comment.comment + '*/';
        return commentStr + '\n';
      },
      declaration : function(declaration) {
        var declarationStr = declaration.property + ': ' + declaration.value + ';';
        return declarationStr;
      },
      media : function(media) {
        var mediaStr = '';
        mediaStr += '@media ' + media.rule + ' {\n\n';
        media.rules.forEach(function(rule) {
          mediaStr += process.style(rule);
        });
        mediaStr += '}\n\n';
        log('@media ' + media.rule + ' - ' + media.rules.length + ' rules');
        return mediaStr;
      },
      rule : function(rule) {
        var ruleStr = '';
        ruleStr += rule.selectors.join(',\n') + ' {';
        rule.declarations.forEach(function(rules) {
          ruleStr += process.style(rules);
        });
        ruleStr += '\n}\n\n';
        return ruleStr;
      }
    };

    var helpers = {
      mediaQueryId : function(mq) {
        return mq.replace('(','').replace(')','').replace(' ','').replace(':','-');
      },
      writeToFile : function(appendToFileName, stylesToWrite, destpath){
        var file = helpers.getFilePath(destpath, appendToFileName);
        var styles = grunt.util.normalizelf(stylesToWrite);
        grunt.file.write(file, styles);
        log(file + ' written successfully');
        log('');
      },
      getFilePath : function(destpath, appendToFileName) {
        return destpath.replace('.css','-' + appendToFileName + '.css');
      }
    };

    this.files.forEach(function(f) {

      f.src.forEach(function (filepath) {

        error = false;

        log('File ' + filepath + ' found');

        var destpath = f.dest;
        var filename = filepath.replace(/(.*)\//gi, '');

        if ( destpath.indexOf(filename) === -1 ) {
          destpath = path.join(f.dest, filename);
        }

        var source = grunt.file.read(filepath);
        var cssJson = parseCss(source);

        var processedCSS = {
          base : [],
          media : [],
        };

        var output = {
          base : function(base){
            var baseStyles = '';
            base.forEach(function (rule) {
              baseStyles += process.style(rule);
            });
            helpers.writeToFile('base', baseStyles, destpath);
          },
          media : function(media){
            log('\nProcessed media queries:', true);
            media.forEach(function(item){
              var mediaStyles = '';
              mediaStyles += process.media(item);
              helpers.writeToFile(item.val, mediaStyles, destpath);
            });
            log('');
          }
        };

        cssJson.stylesheet.rules.forEach(function(rule) {

          if (rule.type === 'media') {
            var mediaQueryId = helpers.mediaQueryId(rule.media);
            var item = processedCSS.media.filter(function (element) {
              return (element.val === mediaQueryId);
            });
            if (item.length < 1) {
              var mediaObj = {};
              mediaObj.sortVal = parseFloat(rule.media.match( /\d+/g ));
              mediaObj.rule = rule.media;
              mediaObj.val = mediaQueryId;
              mediaObj.rules = [];
              processedCSS.media.push(mediaObj);
            }
            var i = 0;
            processedCSS.media.forEach(function (elm) {
              if (elm.val !== mediaQueryId) { i++; }
            });
            rule.rules.forEach(function (mediaRule) {
              if (mediaRule.type === 'rule' || 'comment' ) {
                processedCSS.media[i].rules.push(mediaRule); 
              }              
            });
          } else if (rule.type === 'rule' || 'comment') {
            processedCSS.base.push(rule);
          }

        });

        processedCSS.media.sort(function(a,b){
          return a.sortVal-b.sortVal;
        });

        if (processedCSS.base.length){
          output.base(processedCSS.base);
        }

        if (processedCSS.media.length){
          output.media(processedCSS.media);
        } else {
          error = true;
          grunt.log.error('No media queries were found');
        }

        if (options.breakpointCollections) {
          log('\nBuilding media query combos', true);
          var baseCSS = grunt.file.read(helpers.getFilePath(destpath, 'base'));
          var mediaQueryFiles = [];
          processedCSS.media.forEach(function(mq, i) {
            var mediaQueryRules = {
              filename : mq.val,
              contents : grunt.file.read(helpers.getFilePath(destpath, mq.val))
            };
            mediaQueryFiles.push(mediaQueryRules);
          });
          _.range(mediaQueryFiles.length).forEach(function(mq, i){
            var writeStr = [baseCSS];
            var lastFilename = '';
            _.first(mediaQueryFiles, i+1).forEach(function(mq){
              writeStr.push(mq.contents);
              lastFilename = mq.filename;
            });
            var writeFile = 'base_' + lastFilename;
            writeStr = writeStr.join('\n\n\n\n');
            helpers.writeToFile(writeFile, writeStr, destpath);
          });
        }

      });

      if ( error ) {
        grunt.fatal('No files found');
      }

    });

  });

};
