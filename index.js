// Process block-level custom containers
//
'use strict';

module.exports = function container_plugin(md) {
  /* eslint max-len: "off" */
  var NMSTARTCHAR_REGEXP = '[A-Z_a-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD]';
  var NAMECHAR_REGEXP = '(?:' + NMSTARTCHAR_REGEXP + '|[-0-9.\\u00B7\\u0300-\\u036F\\u203F-\\u2040])';
  var NAME_FENCE_REGEXP = new RegExp('^:{3,}\\s*(' + NMSTARTCHAR_REGEXP + NAMECHAR_REGEXP + '*)\\s*:*\\s*$');

  var ATTRIBUTE_PATTERN = '\\.' + NMSTARTCHAR_REGEXP + NAMECHAR_REGEXP + '*|#' + NMSTARTCHAR_REGEXP + NAMECHAR_REGEXP + '*|' + NMSTARTCHAR_REGEXP + NAMECHAR_REGEXP + '*="[^<>\'"]*"';
  var ATTRIBUTE_FENCE_REGEXP = new RegExp('^:{3,}\\s*\\{\\s*(?:(' + ATTRIBUTE_PATTERN + ')\\s*)+\\}\\s*:*\\s*$');

  function validate(params) {
    return NAME_FENCE_REGEXP.test(params) || ATTRIBUTE_FENCE_REGEXP.test(params);
  }

  function render(tokens, idx, _options, env, slf) {
    if (tokens[idx].nesting === 1) {
      var tokenInfo = tokens[idx].info;
      var bareName = NAME_FENCE_REGEXP.exec(tokenInfo);
      if (bareName !== null) {
        // bare name: add it as a class
        tokens[idx].attrJoin('class', bareName[1]);
      } else {
        tokenInfo = tokenInfo.replace(/^:{3,}\s*\{\s*/, '');
        var attrRegexp = new RegExp(ATTRIBUTE_PATTERN, 'g');

        var match;
        while ((match = attrRegexp.exec(tokenInfo)) !== null) {
          var attribute = match[0];
          if (attribute.startsWith('.')) {
            tokens[idx].attrJoin('class', attribute.substring(1).replace('.', ' '));
          } else if (attribute.startsWith('#')) {
            tokens[idx].attrSet('id', attribute.substring(1));
          } else {
            var split = attribute.split('=');
            var attrname = split[0];
            var value = split.slice(1).join('=').substring(1, split[1].length - 1);
            tokens[idx].attrPush([ attrname, value ]);
          }
        }
      }

      // add a class to the opening tag
    }

    return slf.renderToken(tokens, idx, _options, env, slf);
  }

  var min_markers = 3, marker_char = ':';

  function container(state, startLine, endLine, silent) {
    var pos, nextLine, marker_count, markup, params, token,
        old_parent, old_line_max,
        auto_closed = false,
        start = state.bMarks[startLine] + state.tShift[startLine],
        max = state.eMarks[startLine];

    // Check out the first character quickly,
    // this should filter out most of non-containers
    //
    if (marker_char !== state.src[start]) { return false; }

    // Check out the rest of the marker string
    //
    for (pos = start + 1; pos <= max; pos++) {
      if (marker_char !== state.src[pos]) {
        break;
      }
    }

    marker_count = Math.floor(pos - start);
    if (marker_count < min_markers) { return false; }
    pos -= pos - start;

    markup = state.src.slice(start, pos);
    params = state.src.slice(pos, max);
    if (!validate(params)) { return false; }

    // Since start is found, we can report success here in validation mode
    //
    if (silent) { return true; }

    // Search for the end of the block
    //
    nextLine = startLine;

    for (;;) {
      nextLine++;
      if (nextLine >= endLine) {
        // unclosed block should be autoclosed by end of document.
        // also block seems to be autoclosed by end of parent
        break;
      }

      start = state.bMarks[nextLine] + state.tShift[nextLine];
      max = state.eMarks[nextLine];

      if (start < max && state.sCount[nextLine] < state.blkIndent) {
        // non-empty line with negative indent should stop the list:
        // - ```
        //  test
        break;
      }

      if (marker_char !== state.src[start]) { continue; }

      if (state.sCount[nextLine] - state.blkIndent >= 4) {
        // closing fence should be indented less than 4 spaces
        continue;
      }

      for (pos = start + 1; pos <= max; pos++) {
        if (marker_char !== state.src[pos]) {
          break;
        }
      }

      // closing code fence must be at least as long as the opening one
      if ((pos - start) < marker_count) { continue; }

      // make sure tail has spaces only
      pos = state.skipSpaces(pos);
      if (pos < max) { continue; }

      // found!
      auto_closed = true;
      break;
    }

    old_parent = state.parentType;
    old_line_max = state.lineMax;
    state.parentType = 'container';

    // this will prevent lazy continuations from ever going past our end marker
    state.lineMax = nextLine;

    token        = state.push('container_open', 'div', 1);
    token.markup = markup;
    token.block  = true;
    token.info   = params;
    token.map    = [ startLine, nextLine ];

    state.md.block.tokenize(state, startLine + 1, nextLine);

    token        = state.push('container_close', 'div', -1);
    token.markup = state.src.slice(start, pos);
    token.block  = true;

    state.parentType = old_parent;
    state.lineMax = old_line_max;
    state.line = nextLine + (auto_closed ? 1 : 0);

    return true;
  }

  md.block.ruler.before('fence', 'container', container, {
    alt: [ 'paragraph', 'reference', 'blockquote', 'list' ]
  });
  md.renderer.rules.container_open = render;
  md.renderer.rules.container_close = render;
};
