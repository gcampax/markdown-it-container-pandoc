# markdown-it-container-pandoc

> Plugin for creating block-level custom containers for [markdown-it](https://github.com/markdown-it/markdown-it) markdown parser.

This plugin was derived from [markdown-it-container](https://github.com/markdown-it/markdown-it-container)

```
::: { .warning }
*here be dragons*
:::
```

Markup is the same as for [fenced divs in Pandoc](http://pandoc.org/MANUAL.html#extension_fenced-divs).

## Installation

node.js, browser:

```bash
$ npm install markdown-it-container-pandoc --save
$ bower install markdown-it-container-pandoc --save
```


## API

```js
var md = require('markdown-it')().use(require('markdown-it-container-pandoc'));
```

## License

[MIT](https://github.com/markdown-it/markdown-it-container/blob/master/LICENSE)
