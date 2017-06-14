const sharedb = require('sharedb/lib/client');
const otText = require('ot-text');
const CodeMirror = require('codemirror');

const LOCAL_TAG = 'local';

sharedb.types.register(otText.type);

let socket = new WebSocket("ws://" + location.host + '/sharedb');
let shareConnection = new sharedb.Connection(socket);
let doc = shareConnection.get('docs', 'hello-world-6');

doc.subscribe(function (err) {
  if (err) throw err;
  if (doc.type === null) {
    doc.create('hello world', otText.type.name);
  }
  editor = CodeMirror.fromTextArea(document.getElementById('editor'), {
    lineNumbers: true,
    lineWrapping: true,
    mode: "markdown"
  });
  editor.setOption("theme", "solarized dark");
  editor.setValue(doc.data);
  editor.on('change', function (instance, changeObj) {
    if (changeObj.origin === LOCAL_TAG) return;
    let op = _createOpFromChange(editor, changeObj);
    doc.submitOp(op, {source: LOCAL_TAG})
  });
  doc.on('op', function (op, source) {
    if (source === LOCAL_TAG) return;
    _applyChangesFromOp(editor, op);
  })

  // quill.on('text-change', function(delta, oldDelta, source) {
  //   if (source !== 'user') return;
  //   doc.submitOp(delta, {source: quill});
  // });
  // doc.on('op', function(op, source) {
  //   if (source === quill) return;
  //   quill.updateContents(op);
  // });
});


let _applyChangesFromOp = function (editor, op) {
  let textIndex = 0;
  let from = 0;
  let to = 0;

  op.forEach(function (part) {
    switch (typeof part) {
      case 'number': // skip n chars
        textIndex += part;
        break;
      case 'string': // "chars" - insert "chars"
        from = editor.posFromIndex(textIndex);
        to = from;
        editor.replaceRange(part, from, to, LOCAL_TAG);
        textIndex += part.length;
        break;
      case 'object': // {d: num} - delete `num` chars
        from = editor.posFromIndex(textIndex);
        to = editor.posFromIndex(textIndex + part.d);
        editor.replaceRange('', from, to, LOCAL_TAG);
        break;
    }
  });
};

let _createOpFromChange = function (editor, change) {
  let op = [];
  let textIndex = 0;
  let startLine = change.from.line;

  for (let i = 0; i < startLine; i++) {
    textIndex += editor.lineInfo(i).text.length + 1; // + 1 for '\n'
  }

  textIndex += change.from.ch;

  if (textIndex > 0) {
    op.push(textIndex); // skip textIndex chars
  }

  if (change.to.line !== change.from.line || change.to.ch !== change.from.ch) {
    let delLen = 0;
    let numLinesRemoved = change.removed.length;

    for (let i = 0; i < numLinesRemoved; i++) {
      delLen += change.removed[i].length + 1; // +1 for '\n'
    }

    delLen -= 1; // last '\n' shouldn't be included

    op.push({d: delLen}) // delete delLen chars
  }

  if (change.text) {
    let text = change.text.join('\n');
    if (text) {
      op.push(text); // insert text
    }
  }

  return op;
};


document.getElementById('monkey').onclick = function () {
  setInterval(monkeyType, 50);
};

function monkeyType() {
  var textLength = editor.getValue().length;
  var pos = Math.floor(Math.random() * textLength);
  var from = editor.posFromIndex(pos);
  var editLength = randomInt(10)
  if (Math.random() < 0.9) {
    // Add text
    var text = randomString(editLength);
    editor.replaceRange(text, editor.posFromIndex(pos));
  } else {
    var endIndex = Math.max(pos + editLength, textLength - 1);
    var to = editor.posFromIndex(endIndex);
    editor.replaceRange('', from, to);
  }
}

function randomString(len) {
  var chars = "0123456789\nABCDEF\nGHIJKLM\nNOPQRSTUVWXTZ\nabcde\nfghiklmnop\nqrstuvwxyz";
  var result = '';
  for (var i = 0; i < len; i++) {
    var rnum = randomInt(chars.length);
    result += chars.substring(rnum, rnum + 1);
  }
  return result;
}

function randomInt(max) {
  return Math.floor(Math.random() * max);
}
