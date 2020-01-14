import he from 'he'
// import nodeFetch from 'node-fetch'
import axios from 'axios'
import RssParser from 'rss-parser'
import Store from 'electron-store'
// import Shell from 'node-powershell'
import URL from 'url'
import ntlm from '../services/ntlm'
import https from 'https'
import { hostname } from 'os'
const httpsAgent = new https.Agent({ keepAlive: true })
const parser = new RssParser()
const store = new Store()
/**
 * Parse feed
 * @param  string feedUrl
 * @return array
 */
export async function parseFeed (feedUrl, faviconUrl = null) {
  try {
    let feed
    const auth = store.get('settings.auth')
    if (auth && feedUrl.match(/aspx$/)) {
      // const ps = new Shell({
      //   executionPolicy: 'Bypass',
      //   noProfile: true
      // })
      // ps.addCommand('chcp 65001')
      // ps.addCommand(`$secpasswd = ConvertTo-SecureString "${auth.pass}" -AsPlainText -Force`)
      // ps.addCommand(`$cred = New-Object System.Management.Automation.PSCredential("${auth.user}", $secpasswd)`)
      // ps.addCommand(`$res = Invoke-WebRequest -Uri "${feedUrl}" -Credential $cred`)
      // ps.addCommand('$res.content')
      // const str = await ps.invoke()
      // feed = await parser.parseString(str.replace(/.*\r/, '').trimStart())
      const res = await client({
        method: 'get',
        url: feedUrl
      })
      feed = await parser.parseString(res.data)
    } else {
      const res = await axios(feedUrl)
      feed = await parser.parseString(res.data)
    }
    return ParseFeedPost({
      meta: {
        link: feed.link,
        xmlurl: feed.feedUrl ? feed.feedUrl : feedUrl,
        favicon: faviconUrl,
        description: feed.description ? feed.description : null,
        title: feed.title
      },
      posts: feed.items
    })
  } catch (e) {
    console.error(e)
  }
}

/**
 * Custom parsing of the posts
 * @param array posts
 * @constructor
 */
export function ParseFeedPost (feed) {
  feed.posts.map((item) => {
    item.favourite = false
    item.read = false
    item.offline = false
    item.favicon = null
    item.feed_title = feed.meta.title
    item.feed_url = feed.meta.xmlurl
    item.feed_link = feed.meta.link
    if (item.content) {
      item.content = he.unescape(item.content)
    }
    return item
  })
  return feed
}

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
    // const options = new Options(err.config.url)
    const url = err.config.url
    const auth = store.get('settings.auth')
    const options = {
      url: url,
      domain: new URL(url).hostname,
      username: auth.username,
      password: auth.password,
      workstation: hostname
    }
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
