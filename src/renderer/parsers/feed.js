import he from 'he'
import nodeFetch from 'node-fetch'
import RssParser from 'rss-parser'
const parser = new RssParser()

/**
 * Parse feed
 * @param  string feedUrl
 * @return array
 */
export async function parseFeed (feedUrl, faviconUrl = null) {
  const res = await nodeFetch(feedUrl)
  const body = await res.text()
  const feed = await parser.parseString(body)
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
