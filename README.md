# grunt-media-query-extractor

> Combine and extract media queries for mobile-first responsive design.

## Getting Started
This plugin requires Grunt `~0.4.2`

If you haven't used [Grunt](http://gruntjs.com/) before, be sure to check out the [Getting Started](http://gruntjs.com/getting-started) guide, as it explains how to create a [Gruntfile](http://gruntjs.com/sample-gruntfile) as well as install and use Grunt plugins. Once you're familiar with that process, you may install this plugin with this command:

```shell
npm install grunt-media-query-extractor --save-dev
```

Once the plugin has been installed, it may be enabled inside your Gruntfile with this line of JavaScript:

```js
grunt.loadNpmTasks('grunt-media-query-extractor');
```

## The "mqe" task

### Overview
In your project's Gruntfile, add a section named `mqe` to the data object passed into `grunt.initConfig()`.

```js
grunt.initConfig({
  mqe: {
    options: {
      // Task-specific options go here.
    },
    your_target: {
      // Target-specific file lists and/or options go here.
    },
  },
});
```

### Options

#### log

Type: `boolean`
Default: `false`

Log processed media queries.

#### hideComments

Type: `boolean`
Default: `false`

Remove comments from processed stylesheets.

#### breakpointCollections

Type: `boolean`
Default: `false`

Combine extracted media queries into collections for dynamic stylesheet loading 
based on breakpoint.

### Usage Examples

#### Default Options
In this example, all the css files in `test` are processed and moved to the folder `tmp`

```js
grunt.initConfig({
  mqe: {
    options: {
      log: true
    },
    your_target: {
      files: {
        'tmp': ['test/styles.css']
      }
    }
  }
})
```

## Contributing
In lieu of a formal styleguide, take care to maintain the existing coding style. Add unit tests for any new or changed functionality. Lint and test your code using [Grunt](http://gruntjs.com/).

## Acknowledgements
grunt-media-query-extractor is inspired by [grunt-combine-media-queries](https://github.com/buildingblocks/grunt-combine-media-queries) by [Building Blocks](https://github.com/buildingblocks)

## Release History
_(Nothing yet)_
