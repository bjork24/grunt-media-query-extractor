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

    // Require stuff
    var parseCss = require('css-parse');
    var path = require('path');
    var error = true;
    
    // Default options
    var options = this.options({
      log: false,
      ext: false 
    });
    
    // Log info only when 'options.log' is set to true
    var log = function(message){
      if (options.log){
        grunt.log.writeln(message);
      }
    };
    
    // Process comments
    var processComment = function(comment) {
      var strCss = '/*' + comment.comment + '*/';
      return strCss;
    };
    
    // Process declaration
    var processDeclaration = function(declaration) {
      var strCss = declaration.property + ': ' + declaration.value + ';';
      return strCss;
    };
    
    // Check declarations type
    var commentOrDeclaration = function(declarations) {
      var strCss = '';
      if(declarations.type === 'declaration'){
        strCss += '\n\t' + processDeclaration(declarations);
      } else if(declarations.type === 'comment'){
        strCss += ' ' + processComment(declarations);
      }
      return strCss;
    };
    
    // Process normal CSS rule
    var processRule = function(rule) {
      var strCss = '';
      strCss += rule.selectors.join(',\n') + ' {';
      rule.declarations.forEach(function (rules) {
        strCss += commentOrDeclaration(rules);
      });
      strCss += '\n}\n\n';
      return strCss;
    };
    
    // Check rule type
    var commentOrRule = function(rule) {
      var strCss = '';
      if (rule.type === 'rule') {
        strCss += processRule(rule);  
      } else if (rule.type === 'comment') {
        strCss += processComment(rule) + '\n\n';
      }
      return strCss;
    };
    
    // Check keyframe type
    var commentOrKeyframe = function(frame){
      var strCss = '';
      if (frame.type === 'keyframe'){
        strCss += frame.values.join(',') + ' {';
        frame.declarations.forEach(function (declaration) {
          strCss += commentOrDeclaration(declaration);
        });
        strCss += '\n}\n\n';
      } else if (frame.type === 'comment'){
        strCss += processComment(frame) + '\n\n';
      }
      return strCss;
    };
    
    // Process media queries
    var processMedia = function(media) {
      var strCss = '';
      strCss += '@media ' + media.rule + ' {\n\n';
      media.rules.forEach(function (rule) {
        strCss += commentOrRule(rule);
      });
      strCss += '}\n\n';
      log('@media ' + media.rule + ' - ' + media.rules.length + ' rules');
      return strCss;
    };
    
    // Process keyframes
    var processKeyframes = function(key) {
      var strCss = '';
      strCss += '@' + (typeof key.vendor !=='undefined'? key.vendor: '') + 'keyframes ' + key.name + ' {\n\n';
      key.keyframes.forEach(function (keyframe) {
        strCss += commentOrKeyframe(keyframe);
      });
      strCss += '}\n\n';
      
      return strCss;
    };

    this.files.forEach(function(f) {

      f.src.forEach(function (filepath) {

        error = false;

        grunt.log.ok('File ' + filepath + ' found');

        var destpath = f.dest;
        var filename = filepath.replace(/(.*)\//gi, '');

        if (destpath.indexOf(filename) === -1) {
          destpath = path.join(f.dest, filename);
        }

        var source = grunt.file.read(filepath);
        var cssJson = parseCss(source);

        var strStyles = '';
        var baseStyles = '';
        var keyframeStyles = '';
        var processedCSS = {};
        processedCSS.base = [];
        processedCSS.media = [];
        processedCSS.media.minWidth = [];
        processedCSS.media.blank = [];
        processedCSS.keyframes = [];
        
        // For every rule in the stylesheet...
        cssJson.stylesheet.rules.forEach( function (rule) {

          // if the rule is a media query...
          if (rule.type === 'media') {

            // Create 'id' based on the query (stripped from spaces and dashes etc.)
            var strMedia = rule.media.replace('(','').replace(')','').replace(' ','').replace(':','-');
            
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
            
          } else if (rule.type === 'keyframes') {
            processedCSS.keyframes.push(rule); 
            
          } else if (rule.type === 'rule' || 'comment') {
            processedCSS.base.push(rule);
          }
        });

        // Sort media queries by kind, this is needed to output them in the right order
        processedCSS.media.forEach(function (item) {
          if (item.rule.match( /min-width/ )){
            processedCSS.media.minWidth.push(item);
          } else {
            processedCSS.media.blank.push(item); 
          }   
        });
        
        // Sort media.minWidth queries ascending
        processedCSS.media.minWidth.sort(function(a,b){
          return a.sortVal-b.sortVal;
        });
        
        // Function to output base CSS
        var outputBase = function(base, callback){
          base.forEach(function (rule) {
            baseStyles += commentOrRule(rule);
          });
          callback();
        };
        
        // Function to output media queries
        var outputMedia = function(media){
          media.forEach(function(item){
            var mediaStyles = '';
            mediaStyles += processMedia(item);
            var mediaFile = destpath.replace('.css','-' + item.val + '.css');
            mediaStyles = grunt.util.normalizelf(mediaStyles);
            grunt.file.write(mediaFile, mediaStyles);
            grunt.log.ok(mediaFile + ' written successfully');
          });
        };
        
        // Function to output keyframes
        var outputKeyFrames = function(keyframes, callback){
          keyframes.forEach(function (keyframe) {
            keyframeStyles += processKeyframes(keyframe);
          });
          callback();
        };

        // Check if base CSS was processed and print them
        if (processedCSS.base.length){
          outputBase(processedCSS.base, function(){
            var baseFile = destpath.replace('.css','-base.css');
            baseStyles = grunt.util.normalizelf(baseStyles);
            grunt.file.write(baseFile, baseStyles);
            grunt.log.ok(baseFile + ' written successfully');
          });
        }

        // Check if media queries were processed and print them in order     
        if (processedCSS.media.length){
          log('\nProcessed media queries:');
          if(processedCSS.media.blank.length) {
            outputMedia(processedCSS.media.blank);
          }
          outputMedia(processedCSS.media.minWidth);
          log('');
        }
        
        // Check if keyframes were processed and print them               
        if (processedCSS.keyframes.length){
          outputKeyFrames(processedCSS.keyframes, function(){
            var keyframeFile = destpath.replace('.css','-keyframes.css');
            keyframeStyles = grunt.util.normalizelf(keyframeStyles);
            grunt.file.write(keyframeFile, keyframeStyles);
            grunt.log.ok(keyframeFile + ' written successfully');
          });
        }

      });

      if(error){
        grunt.fatal('No files found');
      }

    });

  });

};
