<template>
  <b-modal
    id="addfeed"
    ref="addFeedModal"
    hide-header
    :hide-footer="feeddata === null"
    size="lg"
    @shown="focusMyElement"
    centered
    @hidden="onHidden"
  >
      <form v-on:submit.prevent="_fetchFeed">
        <b-input-group size="md">
          <b-input-group-text slot="prepend">
            <strong>
              追加
              <feather-icon name="plus"></feather-icon>
            </strong>
          </b-input-group-text>
          <b-input-group-text slot="append">
            <loader v-if="loading"></loader>
            <!-- <div class="favicon-img" v-if="feeddata !== null && !loading">
              <img v-if="feeddata.site.favicon" :src="feeddata.site.favicon" height="20" />
            </div> -->
          </b-input-group-text>
          <b-form-input
            class="no-border"
            placeholder="Enter website or feed url"
            ref="focusThis"
            v-model="feed_url"
          ></b-form-input>
        </b-input-group>
      </form>
      <div v-if="feeddata !== null" class="subscription-content col pt-3">
        <template v-for="(feed) in feeddata.feedUrls">
          <b-input-group size="md">
            <b-input-group-text slot="append">
              <b-form-checkbox v-model="selected_feed" :value="feed"></b-form-checkbox>
            </b-input-group-text>
            <b-form-input v-model="feed.title"></b-form-input>
          </b-input-group>
          <b-form-text id="inputLiveHelp" class="mb-3">{{ feed.url }}</b-form-text>
        </template>
          <b-form-select v-model="selectedCat" :options="categoryItems" class="mb-3">
            <template slot="first">
              <option :value="null">カテゴリーを選んでください</option>
            </template>
          </b-form-select>
          <p><button class="btn btn-link pl-0" type="button" @click="addCategory">カテゴリー追加する</button></p>
          <p v-if="showAddCat"><b-form-input v-model="newcategory" placeholder="Enter new category"></b-form-input></p>
      </div>
    <div slot="modal-footer">
      <button type="button" class="btn btn-secondary" @click="hideModal">閉じる</button>
      <button
        type="button"
        class="btn btn-primary"
        @click="subscribe"
        :disabled="disableSubscribe"
      >購読する</button>
    </div>
  </b-modal>
</template>
<script>
import finder from 'rss-finder'
import normalizeUrl from 'normalize-url'
import he from 'he'
import helper from '../services/helpers'
import uuid from 'uuid-by-string'
import axios from 'axios'
import FeedParser from 'feedparser'

export default {
  name: 'addfeed-modal',
  data () {
    return {
      feed_url: '',
      loading: false,
      feeddata: null,
      newcategory: null,
      showAddCat: false,
      selectedCat: null,
      selected_feed: []
    }
  },
  computed: {
    categoryItems () {
      return this.$store.state.Category.categories.map((item) => {
        return { value: item.title, text: item.title }
      })
    },
    disableSubscribe () {
      return this.$store.state.Setting.offline
    }
  },
  methods: {
    addCategory () {
      this.showAddCat = !this.showAddCat
    },
    async isContentXML (link) {
      const user = this.$store.state.Setting.auth || ''
      const pass = this.$store.state.Setting.pass || ''
      const content = await axios.get(link, { auth: { username: user, password: pass } })
      return content.headers['content-type'] === 'application/xml'
    },
    async parseFeedParser (stream) {
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
            feed.favicon = this.meta.favicon || ''
            let item
            while ((item = streamFeed.read())) {
              feed.items.push(item)
            }
          })
      })
    },
    ParseFeedPost (feed) {
      feed.posts.map((item) => {
        item.favourite = false
        item.read = false
        item.offline = false
        item.favicon = ''
        item.feed_title = feed.meta.title
        item.feed_url = feed.meta.xmlurl
        item.feed_link = feed.meta.link
        if (item.content) {
          item.content = he.unescape(item.content)
        }
        return item
      })
      return feed
    },
    async _fetchFeed () {
      // const self = this
      this.loading = true
      if (!this.$store.state.Setting.offline) {
        if (this.feed_url) {
          try {
            const auth = this.$store.state.Setting.auth
            const stream = await axios.get(this.feed_url,
              {
                auth: {
                  username: auth.user || '',
                  password: auth.pass || ''
                },
                responseType: 'stream'
              })
            const feed = await this.parseFeedParser(stream.data)
            const feeditem = {
              meta: '',
              posts: []
            }
            feeditem.meta = {
              link: feed.link,
              xmlurl: feed.feedUrl ? feed.feedUrl : this.feed_url,
              favicon: '',
              description: feed.description ? feed.description : null,
              title: feed.title
            }

            feeditem.posts = feed.items
            this.selected_feed = []
            this.selected_feed.push(this.feed_url)
            this.feeddata = {}
            this.feeddata.feedUrls = []
            this.feeddata.feedUrls = this.ParseFeedPost(feeditem)
            this.loading = false
          } catch (e) {
            console.error(e)
            this.showError()
          }
        } else {
          this.showError()
        }
      } else {
        this.$toasted.show('There is no internet connection', {
          theme: 'outline',
          position: 'top-center',
          duration: 2000
        })
        this.loading = false
      }
    },
    async fetchFeed () {
      const self = this
      this.loading = true
      if (!this.$store.state.Setting.offline) {
        if (this.feed_url) {
          try {
            const isXML = await this.isContentXML(normalizeUrl(this.feed_url, { stripWWW: false, removeTrailingSlash: false }))
            finder(normalizeUrl(this.feed_url, { stripWWW: false, removeTrailingSlash: false }), { feedParserOptions: { feedurl: this.feed_url } }).then(
              res => {
                this.loading = false
                res.feedUrls.map(item => {
                  item.title = he.unescape(item.title)
                  if (isXML) {
                    item.url = self.feed_url
                  }
                  return item
                })
                if (res.feedUrls.length === 0) {
                  this.showError()
                } else {
                  this.selected_feed = []
                  this.selected_feed.push(res.feedUrls[0])
                  this.feeddata = res
                }
              },
              error => {
                if (error) {
                }
                this.showError()
              }
            )
          } catch (e) {
            this.showError()
          }
        } else {
          this.showError()
        }
      } else {
        this.$toasted.show('There is no internet connection', {
          theme: 'outline',
          position: 'top-center',
          duration: 2000
        })
        this.loading = false
      }
    },
    showError () {
      this.loading = false
      this.feeddata = null
      this.$toasted.show('No feed found', {
        theme: 'outline',
        position: 'top-center',
        duration: 2000
      })
    },
    focusMyElement (e) {
      this.$refs.focusThis.focus()
    },
    resetForm () {
      this.feed_url = ''
      this.feeddata = null
      this.url = ''
      this.selected_feed = []
      this.loading = false
      this.newcategory = null
      this.showAddCat = false
      this.selectedCat = null
    },
    hideModal () {
      this.resetForm()
      this.$refs.addFeedModal.hide()
    },
    subscribe () {
      // const favicon = this.feeddata.site.favicon ? this.feeddata.site.favicon : null
      if (this.newcategory) {
        this.$store.dispatch('addCategory', { id: uuid(this.newcategory), title: this.newcategory, type: 'category' })
      } else {
        this.newcategory = this.selectedCat
      }
      helper.subscribe(this.selected_feed, this.newcategory, '', false)
      this.hideModal()
    },
    onHidden () {
      this.resetForm()
    }
  }
}
</script>
<style lang="scss">
.app-sunsetmode {
  #addfeed {
    form {
      background: var(--background-color);
      color: var(--text-color);
    }

    .no-border {
      background: var(--background-color);
      color: var(--text-color);
      &:focus {
        color: #000;
      }
    }

    .input-group-text {
      color: #000;
    }

    .subscription-content {
      background: var(--background-color);
      border-color: var(--border-color);
    }
  }
}
.app-darkmode {
  #addfeed {
    form {
      background: var(--background-color);
      color: var(--text-color);
    }

    .no-border {
      background: var(--background-color);
      color: var(--text-color);
      &:focus {
        color: #fff;
      }
    }

    .input-group-text {
      color: #fff;
    }

    .subscription-content {
      background: var(--background-color);
      border-color: var(--border-color);
    }
  }
}
#addfeed {
  form {
    background: #f4f6f8;
    padding: 0.8rem;
  }

  .modal-body {
    padding: 0rem;
  }
  .input-group-text {
    background: transparent;
    border: 0;
  }
  .no-border {
    border: 0;
    background: #f4f6f8;

    &:focus {
      outline: 0;
      box-shadow: none;
    }
  }
}

@keyframes bouncing-loader {
  from {
    opacity: 1;
    transform: translateY(0);
  }
  to {
    opacity: 0.1;
    transform: translateY(-1rem);
  }
}
.bouncing-loader {
  display: flex;
  justify-content: center;
}
.bouncing-loader > div {
  width: 0.4rem;
  height: 0.4rem;
  margin: 1rem 0rem;
  background: #000;
  border-radius: 50%;
  animation: bouncing-loader 0.6s infinite alternate;
}
.bouncing-loader > div:nth-child(2) {
  animation-delay: 0.2s;
}
.bouncing-loader > div:nth-child(3) {
  animation-delay: 0.4s;
}

.favicon-img {
  display: flex;
  justify-content: center;
}

.subscription-content {
  background: #fff;
  border-top: 1px solid #f4f6f8;
}
</style>
