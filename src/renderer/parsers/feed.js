import he from 'he'
import axios from 'axios'
import FeedParser from 'feedparser'
import Store from 'electron-store'
import * as spauth from 'node-sp-auth'

const store = new Store()

/**
 * Parse feed
 * @param  string feedUrl
 * @return array
 */
export async function parseFeed (feedUrl, faviconUrl = null) {
  // let feed
  const feeditem = {
    meta: '',
    posts: []
  }
  const auth = store.get('settings.auth') || {}
  let options = await spauth.getAuth(feedUrl, {
    username: auth.user || '',
    password: auth.pass || ''
  })
  const stream = await axios.get(feedUrl,
    {
      headers: options.headers,
      responseType: 'stream'
    })
  const feed = await parseFeedParser(stream.data)

  feeditem.meta = {
    link: feed.link,
    xmlurl: feed.feedUrl ? feed.feedUrl : feedUrl,
    favicon: typeof faviconUrl !== 'undefined' ? faviconUrl : null,
    description: feed.description ? feed.description : null,
    title: feed.title
  }
  feeditem.posts = feed.items
  const response = await ParseFeedPost(feeditem)
  return response
}

export async function parseFeedParser (stream) {
  const feed = {
    items: []
  }
  return new Promise((resolve, reject) => {
    stream.pipe(new FeedParser())
      .on('error', reject)
      .on('end', () => {
        resolve(feed)
      })
      .on('readable', function () {
        const streamFeed = this
        feed.link = this.meta.link
        feed.feedUrl = this.meta.xmlurl
        feed.description = this.meta.description
        feed.title = this.meta.title
        let item
        while ((item = streamFeed.read())) {
          feed.items.push(item)
        }
      })
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

parseFeed('https://news.yahoo.co.jp/pickup/rss.xml')
