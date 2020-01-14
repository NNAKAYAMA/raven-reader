import 'v8-compile-cache'

import Vue from 'vue'
import axios from 'axios'
import BootstrapVue from 'bootstrap-vue'
import Register from './components/register'
import PerfectScrollbar from 'vue2-perfect-scrollbar'
import SocialSharing from 'vue-social-sharing'
import Toasted from 'vue-toasted'
import {
  createGlobalProxyAgent
} from 'global-agent'
import vClickOutside from 'v-click-outside'
import urlParser from 'url'
import ntlm from './services/ntlm'
import https from 'https'
import { hostname } from 'os'

import App from './App'
import router from './router'
import store from './store'
import SettingsStore from 'electron-store'

import './helper/external_links.js'
import 'bootstrap/dist/css/bootstrap.css'
import 'bootstrap-vue/dist/bootstrap-vue.css'
import 'vue2-perfect-scrollbar/dist/vue2-perfect-scrollbar.css'
const httpsAgent = new https.Agent({ keepAlive: true })

// nodejs global proxy
const settingsStore = new SettingsStore()
const proxy = settingsStore.get('settings.proxy') ? settingsStore.get('settings.proxy') : null
if (proxy) {
  if (proxy.http) {
    process.env.http_proxy = proxy.http
  }
  if (proxy.https) {
    process.env.https_proxy = proxy.https
  }
  createGlobalProxyAgent({
    environmentletiableNamespace: '',
    forceGlobalAgent: true
  })
}

// ignore ssl error
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

Vue.use(BootstrapVue)
Vue.use(Toasted)
Vue.use(PerfectScrollbar)
Vue.use(SocialSharing)
Vue.use(vClickOutside)

Register.registerComponents()

const client = axios.create({
  httpsAgent,
  agent: httpsAgent,
  withCredentials: true,
  shouldKeepAlive: true,
  keepAlive: true,
  keepAliveMsecs: 3000,
  maxRedirects: 0,
  'Access-Control-Allow-Origin': '*'
})

client.interceptors.response.use(
  (response) => {
    // IF DEV console.log('Response:', response);
    return response
  },
  (err) => {
    // IF DEV console.log('Response error:',err);
    const error = err.response
    const options = new Options(err.config.url)
    if (error.status === 401 && error.headers['www-authenticate'] && error.headers['www-authenticate'] === 'Negotiate, NTLM' && !err.config.headers['X-retry']) {
      // TYPE 1 MESSAGE
      return sendType1Message(options)
    } else if (error.status === 401 && error.headers['www-authenticate'] && error.headers['www-authenticate'].substring(0, 4) === 'NTLM') {
      // TYPE 2 MESSAGE PARSE ANS TYPE 3 MESSAGE SEND
      return sendType3Message(error.headers['www-authenticate'], options)
    }
    return err
  }
)

client.interceptors.request.use((request) => {
  // IF DEV console.log('Starting Request', request);
  return request
})

class Options {
  constructor (url) {
    this.url = url
    this.domain = urlParser.parse(url).hostname
    const auth = store.get('settings.auth')
    this.username = auth.username
    this.password = auth.password
    this.workstation = hostname
  }
}

const sendType1Message = (options) => {
  const type1msg = ntlm.createType1Message()
  return client({
    method: 'get',
    url: options.url,
    headers: {
      Connection: 'keep-alive',
      Authorization: type1msg
    }
  })
}

const sendType3Message = (token, options) => {
  const type2msg = ntlm.parseType2Message(token, (err) => { console.log(err) })
  const type3msg = ntlm.createType3Message(type2msg, options)
  return client({
    method: 'get',
    url: options.url,
    headers: {
      'X-retry': 'false',
      Connection: 'Close',
      Authorization: type3msg
    }
  })
}

if (!process.env.IS_WEB) Vue.use(require('vue-electron'))
Vue.http = Vue.prototype.$http = client
Vue.prototype.$electronstore = settingsStore
Vue.config.productionTip = false
Vue.config.devtools = process.env.NODE_ENV === 'development'

/* eslint-disable no-new */
new Vue({
  components: { App },
  router,
  store,
  template: '<App/>'
}).$mount('#app')
