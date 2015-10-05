(function (host, console, esprima, escodegen) {
  //'use strict';

  if (host.jsRepl) {
    return;
  }

  var OUTPUT_PREFIX = '// > ';
  var MARKER_CLASS = 'jsrepl-marker';

  function wrapConsole(console, output) {
    function wrap(console, method) {
      var oldMethod = console[method];

      console[method] = function () {
        output.push({method: method, args: [].slice.apply(arguments)});
        oldMethod.apply(console, arguments);
      };

      //console[method].name = 'jsrepl:' + method; //TODO: look into Object.defineProperty
    }

    wrap(console, 'log');
  }

  //var output = [];
  var instanceCounter = 0;
  //wrapConsole(console, output);

  console.log(esprima);


  function insertArrayAfter(dest, idx, insertee) {
    dest.splice.apply(dest, [idx, 0].concat(insertee));
    return dest;
  }

  function saveSelection() {
    if (window.getSelection) {
      return window.getSelection().getRangeAt(0);
    } else if (document.selection) { //IE
      return document.selection.createRange();
    }
  }

  function restoreSelection(range) {
    if (window.getSelection) { //non IE and there is already a selection
      var selection = window.getSelection();
      if (selection.rangeCount > 0)
        selection.removeAllRanges();
      selection.addRange(range);
    } else if (document.createRange) { //non IE and no selection
      window.getSelection().addRange(range);
    } else if (document.selection) { //IE
      range.select();
    }
  }

  function createMarker(top, content) {
    var marker = document.createElement('div');
    marker.classList.add(MARKER_CLASS);
    marker.innerHTML = content;
    marker.style.top = top + 'px';
    marker.style.right = '0px';
    marker.style.position = 'absolute';
    return marker;
  }

  var jsRepl = host.jsRepl = {
    init: function init(elements) {
      function createConsoleOutputElement(replEl) {
        var outputEl = document.createElement('code');
        replEl.parentNode.appendChild(outputEl);
        return outputEl;
      }

      function updateOutput(replInstance) {
        replInstance.outputElement.innerHTML = output.map(function (logItem) {
          return logItem.args.join(' '); //TODO: pretty print?
        }).join('\n');
      }

      function removeAllMarkers(replInstance) {
        replInstance.markers = [];
        Array.prototype.forEach.call(replInstance.element.getElementsByClassName(MARKER_CLASS), function (node) {
          node.parentNode.removeChild(node);
        });
      }

      function initInstance(element) {
        var replInstance = {
          id: instanceCounter++,
          element: element,
          outputElement: createConsoleOutputElement(element), //TODO: pass as options
          output: [],
          markers: [],
          eval: function () {
            removeAllMarkers(replInstance);

            var script = element.textContent;

            var ast = esprima.parse(script, {tokens: true, range: true, comment: true, loc: true});
            ast = escodegen.attachComments(ast, ast.comments, ast.tokens);

            //var result = escodegen.generate(ast);
            //console.log(result);

            var result = script.split('\n').filter(function (line) {
              return line.indexOf(OUTPUT_PREFIX) !== 0;
            });

            //for (var lineIdx = 0; lineIdx < lines.length; lineIdx++) {
            //  var line = lines[lineIdx];
            //  result.push(line);
            //
            //  with (window) {
            //    var lineResult = eval(line);
            //    if (lineResult) {
            //      result.push('//> ' + lineResult.toString());
            //    }
            //  }
            //}

            var totalLines = result.length;

            function getLineOffset(lineNumber) {
              return element.getBoundingClientRect().height / totalLines * lineNumber;
            }

            for (var nodeIdx = 0; nodeIdx < ast.body.length; nodeIdx++) {
              with (window) {
                var lineResult = eval(escodegen.generate(ast.body[nodeIdx]));
                if (lineResult) {
                  var marker = createMarker(getLineOffset(ast.body[nodeIdx].loc.end.line), OUTPUT_PREFIX + lineResult);
                  element.appendChild(marker);
                  replInstance.markers.push(marker);
                  //insertArrayAfter(result, ast.body[nodeIdx].loc.end.line, [OUTPUT_PREFIX + lineResult])

                }
              }
            }

            //console.log(result.join('\n'));
            //element.innerHTML = result.join('\n');
            //updateOutput(replInstance);
          }
        };

        //TODO: try out Mutation Observers (supported by IE11+)
        function onCodeChange() {
          var savedRange = saveSelection();
          replInstance.eval();
          restoreSelection(savedRange);
        }

        element.addEventListener('input', onCodeChange);

        replInstance.eval();

        return replInstance;
      }

      jsRepl.bound = {};
      elements = elements instanceof NodeList ? elements : [elements]; //TODO: better check

      var replInstance;
      for (var i = 0; i < elements.length; i++) {
        replInstance = initInstance(elements[i]);
        //TODO: element.data to store the jsRepl instance?
        jsRepl.bound[replInstance.id] = replInstance;
      }
    }
  }
}(window, window.console, window.esprima, window.escodegen));