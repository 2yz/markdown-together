<template>
  <div class="container">
    <div class="home-title">
      <nav class="navbar navbar-default">
        <div class="container-fluid">
          <div class="navbar-header">
            <router-link class="navbar-brand" :to="{name:'home'}">Markdown Together</router-link>
          </div>
          <div class="collapse navbar-collapse">
            <form class="navbar-form navbar-left" v-on:submit.prevent="newDoc">
              <div class="form-group">
                <input type="text" class="form-control" placeholder="文档标题" v-model="newDid" />
              </div>
              <button type="button" class="btn btn-default" v-on:click="newDoc">新建</button>
            </form>
          </div>
        </div>
      </nav>
    </div>
    <div class="row home-list">
      <table class="table table-striped table-bordered">
        <tbody>
        <tr v-for="doc in docs">
          <td>
            <router-link :to="{ name: 'editor', params: { did: doc.id }}">{{ doc.id }}</router-link>
          </td>
        </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script>
  import Socket from '../lib/socket'

  export default {
    name: 'home',
    data () {
      return {
        newDid: '',
        docs: []
      }
    },
    created () {
      console.log('home created');
      Socket.shareConnection.createFetchQuery('docs', {}, {}, (err, docs) => {
        if (err) return;
        this.docs = docs;
      })
    },
    methods: {
      newDoc () {
        this.$router.push({name: 'editor', params: {did: this.newDid}});
      }
    }
  }
</script>

<style>
  .home-title {
    margin-top: 6px;
  }

  .home-list {
    margin: 10px 0;
  }

  .home-list a {
    color: #777;
    text-decoration: none;
  }

  .home-list a:hover {
    color: #5e5e5e;
    text-decoration: none;
  }
</style>
