<template>
  <div class="container">
    <nav class="navbar navbar-default editor-nav">
      <div class="container-fluid">
        <div class="navbar-header">
          <router-link class="navbar-brand" :to="{name:'home'}">
            <span class="glyphicon glyphicon-home" aria-hidden="true"></span>
          </router-link>
        </div>
        <div class="collapse navbar-collapse">
          <p class="navbar-text">{{ did }}</p>
        </div>
      </div>
    </nav>
    <div class="md-panel" v-bind:class="{ fullscreen: isFullScreen }" v-bind:style="{ height: mdPanelHeight + 'px' }">
      <div class="md-menubar">
        <ul class="md-modebar">
          <li class="tb-btn pull-right">
            <a v-bind:class="previewActive" v-on:click="changeMode('preview')" title="预览模式">
              <i class="fa fa-eye"></i>
            </a>
          </li>
          <li class="tb-btn pull-right">
            <a v-bind:class="splitActive" v-on:click="changeMode('split')" title="分屏模式">
              <i class="fa fa-columns"></i>
            </a>
          </li>
          <li class="tb-btn pull-right">
            <a v-bind:class="editActive" v-on:click="changeMode('edit')" title="编辑模式">
              <i class="fa fa-pencil"></i>
            </a>
          </li>
          <li class="tb-btn spliter pull-right"></li>
          <li class="tb-btn pull-right">
            <a title="全屏模式" v-on:click="toggleFullScreen"><i class="fa fa-arrows-alt"></i></a>
          </li>
        </ul>
      </div>
      <div class="md-editor" v-bind:class="editorClass">
        <textarea id="code-mirror" title="编辑器">Connecting...</textarea>
      </div>
      <div class="md-preview markdown" v-bind:class="previewClass">
        <div class="md-preview-html" v-html="previewHtml"></div>
      </div>
      <div class="md-spliter"></div>
    </div>
  </div>
</template>

<script>
  import Router from 'vue-router'
  import CodeMirror from 'codemirror'
  import otText from 'ot-text'
  import Socket from '../lib/socket'
  import Transform from '../lib/transform'
  import marked from 'marked'
  import uuid from 'uuid'
  import randomColor from 'randomcolor'
  import 'codemirror/mode/markdown/markdown'

  const uid = uuid.v1();
  const uc = randomColor({luminosity: 'light'});

  export default {
    name: 'app',
    data () {
      return {
        uid: '',
        uc: '',
        did: '',
        doc: null,
        editor: null,
        mode: 'split',
        previewHtml: 'hello world',
        isFullScreen: false,
        mdPanelHeight: '360',
      }
    },
    created () {
      console.log('editor created');
      this.uid = uid;
      this.uc = uc;
      this.did = this.$route.params.did;
      this.doc = Socket.shareConnection.get('docs', this.did);
      this.setMdPanelHeight();
      window.addEventListener("resize", this.setMdPanelHeight);
    },
    mounted () {
      this.editor = CodeMirror.fromTextArea(document.getElementById('code-mirror'), {
        lineNumbers: true,
        lineWrapping: true,
        mode: "markdown"
      });
      window.editor = this.editor;
      //this.editor.setOption("theme", "solarized dark");
      this.editor.on('change', (instance, changeObj) => {
        if (changeObj.origin === Transform.REMOTE_TAG || changeObj.origin === 'setValue') return;
        let op = Transform._createOpFromChange(instance, changeObj);
        //console.log('change:', op);
        this.doc.submitOp(op, {source: Transform.LOCAL_TAG})
      });
      this.editor.on('changes', () => {
        this.renderPreview();
      });

      this.doc.subscribe(err => {
        if (err) throw err;
        if (this.doc.type === null) {
          this.doc.create('# ' + this.did, otText.type.name);
        }
        this.editor.setValue(this.doc.data);
        this.renderPreview();
        this.doc.on('op', (op, source) => {
          if (source === Transform.LOCAL_TAG) return;
          //console.log('op:', op);
          Transform._applyChangesFromOp(this.editor, op);
        });
      });

      this.cursorHandler();
    },
    methods: {
      cursorHandler () {
        let cws = Socket.cws;
        let cursorMap = {};
        cws.addEventListener('open', () => {
          cws.send(JSON.stringify({fn: "init", uid: this.uid, uc: this.uc, did: this.did}));
          this.editor.on('cursorActivity', (instance) => {
            let doc = instance.doc;
            let head = doc.getCursor('head');
            let from = doc.getCursor('from');
            let to = doc.getCursor('to');
            let data = {
              fn: 'pub',
              cursor: {
                head: {ch: head.ch, line: head.line},
                from: {ch: from.ch, line: from.line},
                to: {ch: to.ch, line: to.line}
              }
            };
            console.log('cursor:', data);
            cws.send(JSON.stringify(data))
          });
        });
        cws.addEventListener('message', (event) => {
          //console.log('msg:', event.data);
          let data = JSON.parse(event.data);

          if (data.type === 'pub') {
            if (cursorMap[data.uid]) {
              cursorMap[data.uid].clear()
            }
            let cursor = data.cursor;
            if (cursor.from.line === cursor.to.line && cursor.from.ch === cursor.to.ch) {
              let line = this.editor.doc.getLine(cursor.head.line);
              let from = cursor.head;
              let to = {line: cursor.head.line, ch: cursor.head.ch + 1};
              if (line) {
                if (cursor.head.ch === line.length) {
                  from.ch -= 1;
                  to.ch -= 1;
                }
                cursorMap[data.uid] = this.editor.doc.markText(cursor.head, to, {css: `background-color: ${data.uc};`})
              }
            } else {
              cursorMap[data.uid] = this.editor.doc.markText(cursor.from, cursor.to, {css: `background-color: ${data.uc};`})
            }
          } else if (data.type === 'close') {
            console.log(cursorMap[data.uid]);
            if (cursorMap[data.uid]) {
              cursorMap[data.uid].clear()
            }
          }

          //console.log(cursorMap)
        });
      },
      renderPreview () {
        this.previewHtml = marked(this.editor.getValue());
      },
      setMdPanelHeight () {
        if (!this.isFullScreen) {
          let height = window.innerHeight - 82;
          this.mdPanelHeight = height > 360 ? height : 360;
        } else {
          this.mdPanelHeight = window.innerHeight;
        }
      },
      changeMode (mode) {
        this.mode = mode
      },
      toggleFullScreen () {
        this.isFullScreen = !this.isFullScreen;
        this.setMdPanelHeight();
      }
    },
    computed: {
      editorClass () {
        return {
          expand: this.mode === 'edit',
          shrink: this.mode === 'preview'
        }
      },
      previewClass () {
        return {
          expand: this.mode === 'preview',
          shrink: this.mode === 'edit'
        }
      },
      previewActive () {
        return {active: this.mode === 'preview'}
      },
      splitActive () {
        return {active: this.mode === 'split'}
      },
      editActive () {
        return {active: this.mode === 'edit'}
      }
    }
  }
</script>

<style>
  .CodeMirror {
    height: 100%;
  }

  .md-panel {
    margin: 10px 0;
  }

  .editor-nav {
    margin-top: 10px;
  }

  .navbar {
    margin-bottom: 10px;
  }

</style>
