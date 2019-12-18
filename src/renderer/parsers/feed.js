import he from 'he'
import RssParser from 'rss-parser'
import Store from 'electron-store'
import spauth from 'node-sp-auth'
const parser = new RssParser()
const decoder = new TextDecoder()
const store = new Store()
/**
 * Parse feed
 * @param  string feedUrl
 * @return array
 */
export async function parseFeed (feedUrl, faviconUrl = null) {
  try{
    const auth = store.get("stettings.auth")
    const opt = await spauth(feedUrl,{username:atuth.user,password:auth.pass})
    console.log(opt)  
  }catch(e){
    console.error(e)
  }
  const res = await fetch(url)
  const reader = await res.body.getReader()
  const {value} = await reader.read()
  const feed = await parser.parseString(decoder.decode(value))
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
