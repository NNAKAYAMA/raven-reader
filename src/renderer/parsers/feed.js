import he from 'he'
import nodeFetch from 'node-fetch'
import RssParser from 'rss-parser'
import Store from 'electron-store'
import Shell from 'node-powershell'
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
      const ps = new Shell({
        executionPolicy: 'Bypass',
        noProfile: true
      })
      ps.addCommand('chcp 65001')
      ps.addCommand(`$secpasswd = ConvertTo-SecureString "${auth.pass}" -AsPlainText -Force`)
      ps.addCommand(`$cred = New-Object System.Management.Automation.PSCredential("${auth.user}", $secpasswd)`)
      ps.addCommand(`$res = Invoke-WebRequest -Uri "${feedUrl}" -Credential $cred`)
      ps.addCommand('$res.content')
      const str = await ps.invoke()
      feed = await parser.parseString(str.replace(/.*\r/, '').trimStart())
    } else {
      const res = await nodeFetch(feedUrl)
      const str = await res.text()
      feed = await parser.parseString(str)
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
