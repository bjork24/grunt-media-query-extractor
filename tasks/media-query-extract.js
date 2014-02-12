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
    var path = require('path');
    var error = true;

    var options = this.options({
      log: true,
      hideComments: true
    });

    var log = function(message){
      if (options.log){
        grunt.log.writeln(message);
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
      },
      mediaQueryId : function(mq) {
        return mq.replace('(','').replace(')','').replace(' ','').replace(':','-');
      }
    };

    this.files.forEach(function(f) {

      f.src.forEach(function (filepath) {

        error = false;

        grunt.log.ok('File ' + filepath + ' found');

        var destpath = f.dest;
        var filename = filepath.replace(/(.*)\//gi, '');

        if ( destpath.indexOf(filename) === -1 ) {
          destpath = path.join(f.dest, filename);
        }

        var source = grunt.file.read(filepath);
        var cssJson = parseCss(source);

        var strStyles = '';
        var baseStyles = '';
        var processedCSS = {
          base : [],
          media : [],
        };

        var output = {
          base : function(base, callback){
            base.forEach(function (rule) {
              baseStyles += process.style(rule);
            });
            callback();
          },
          media : function(media){
            media.forEach(function(item){
              var mediaStyles = '';
              mediaStyles += process.media(item);
              output.writeToFile(item.val, mediaStyles);
            });
          },
          writeToFile : function(appendToFileName, stylesToWrite){
            var file = destpath.replace('.css','-' + appendToFileName + '.css');
            var styles = grunt.util.normalizelf(stylesToWrite);
            grunt.file.write(file, styles);
            grunt.log.ok(file + ' written successfully');
          }
        };

        cssJson.stylesheet.rules.forEach(function(rule) {

          if (rule.type === 'media') {

            // Create 'id' based on the query (stripped from spaces and dashes etc.)
            var strMedia = process.mediaQueryId(rule.media);

            // Create an array with all the media queries with the same 'id'
            var item = processedCSS.media.filter(function (element) {
              return (element.val === strMedia);
            });

            // If there are no media queries in the array, define details
            if (item.length < 1) {
              var mediaObj = {};
              mediaObj.sortVal = parseFloat(rule.media.match( /\d+/g ));
              mediaObj.rule = rule.media;
              mediaObj.val = strMedia;
              mediaObj.rules = [];
              processedCSS.media.push(mediaObj);
            }

            // Compare the query to other queries
            var i = 0;
            processedCSS.media.forEach(function (elm) {
              if (elm.val !== strMedia) { i++; }
            });

            // Push every merged query
            rule.rules.forEach(function (mediaRule) {
              if (mediaRule.type === 'rule' || 'comment' ) {
                processedCSS.media[i].rules.push(mediaRule); 
              }              
            });

          } else if (rule.type === 'rule' || 'comment') {
            processedCSS.base.push(rule);
          }

        });

        // Sort media.minWidth queries ascending
        processedCSS.media.sort(function(a,b){
          return a.sortVal-b.sortVal;
        });

        // Check if base CSS was processed and print them
        if (processedCSS.base.length){
          output.base(processedCSS.base, function(){
            output.writeToFile('base', baseStyles);
          });
        }

        // Check if media queries were processed and print them in order     
        if (processedCSS.media.length){
          log('\nProcessed media queries:');
          output.media(processedCSS.media);
          log('');
        }

      });

      if ( error ) {
        grunt.fatal('No files found');
      }

    });

  });

};
