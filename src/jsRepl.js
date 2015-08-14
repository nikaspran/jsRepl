(function (host, console) {
  'use strict';

  if (host.jsRepl) {
    return;
  }

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

  var output = [];
  wrapConsole(console, output);

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

      function initInstance(element) {
        var replInstance = {
          element: element,
          outputElement: createConsoleOutputElement(element), //TODO: pass as options
          output: [],
          eval: function () {
            eval(element.textContent); //TODO: can we tie this to a specific instance?
            updateOutput(replInstance);
          }
        };

        //TODO: try out Mutation Observers (supported by IE11+)
        element.addEventListener('input', replInstance.eval.bind(replInstance));
        //TODO: element.data to store the jsRepl instance?
        jsRepl.bound.push(replInstance);

        replInstance.eval();
      }

      jsRepl.bound = [];
      elements = elements instanceof NodeList ? elements : [elements]; //TODO: better check

      for (var i = 0; i < elements.length; i++) {
        initInstance(elements[i]);
      }
    }
  }
}(window, window.console));