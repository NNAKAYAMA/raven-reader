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
      <form v-on:submit.prevent="fetchFeed">
        <b-input-group size="md">
          <b-input-group-text slot="prepend">
            <strong>
              追加
              <feather-icon name="plus" />
            </strong>
          </b-input-group-text>
          <b-input-group-text slot="append">
            <loader v-if="loading" />
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
        <b-input-group size="md">
          <b-form-input v-model="feeddata.meta.title"></b-form-input>
        </b-input-group>
        <b-form-text id="inputLiveHelp" class="mb-3">{{ feeddata.meta.xmlurl }}</b-form-text>
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
import helper from '../services/helpers'
import uuid from 'uuid-by-string'
import { parseFeed } from '../parsers/feed'
export default {
  name: 'addfeed-modal',
  data () {
    return {
      feed_url: '',
      loading: false,
      feeddata: null,
      newcategory: null,
      showAddCat: false,
      selectedCat: null
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
    async fetchFeed () {
      this.loading = true
      if (!this.$store.state.Setting.offline) {
        if (this.feed_url) {
          try {
            this.feeddata = await parseFeed(this.feed_url)
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
      if (this.newcategory) {
        this.$store.dispatch('addCategory', { id: uuid(this.newcategory), title: this.newcategory, type: 'category' })
      } else {
        this.newcategory = this.selectedCat
      }
      helper.subscribe([this.feeddata], this.newcategory, '', false)
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
