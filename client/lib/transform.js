export default {
  LOCAL_TAG: 'local',
  REMOTE_TAG: 'remote',

  _applyChangesFromOp (editor, op) {
    let textIndex = 0;
    let from = 0;
    let to = 0;

    op.forEach((part) => {
      switch (typeof part) {
        case 'number': // skip n chars
          textIndex += part;
          break;
        case 'string': // "chars" - insert "chars"
          from = editor.posFromIndex(textIndex);
          to = from;
          editor.replaceRange(part, from, to, this.REMOTE_TAG);
          textIndex += part.length;
          break;
        case 'object': // {d: num} - delete `num` chars
          from = editor.posFromIndex(textIndex);
          to = editor.posFromIndex(textIndex + part.d);
          editor.replaceRange('', from, to, this.REMOTE_TAG);
          break;
      }
    });
  },

  _createOpFromChange (editor, change) {
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
  }
}