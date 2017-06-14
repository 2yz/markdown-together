import Vue from 'vue'
import Router from 'vue-router'
import Home from '../component/Home.vue'
import Editor from '../component/Editor.vue'

Vue.use(Router);

export default new Router({
  routes: [
    {
      path: '/',
      name: 'home',
      component: Home
    },
    {
      path: '/editor/:did',
      name: 'editor',
      component: Editor
    }
  ]
})
