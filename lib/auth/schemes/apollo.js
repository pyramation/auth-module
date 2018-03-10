const DEFAULTS = {
  tokenRequired: true,
  tokenType: 'Bearer',
  globalToken: true
}

import signIn from '~/apollo/queries/users/signIn'
import currentUser from '~/apollo/queries/users/user'

export default class ApolloScheme {
  constructor (auth, options) {
    this.auth = auth
    this.name = options._name

    this.options = Object.assign({}, DEFAULTS, options)
  }

  _setToken (token) {
    if (this.options.globalToken) {
      // Set Authorization token for all axios requests
      this.auth.ctx.app.$axios.setToken(token, this.options.tokenType)
    }
  }

  _clearToken () {
    if (this.options.globalToken) {
      // Clear Authorization token for all axios requests
      this.auth.ctx.app.$axios.setToken(false)
    }
  }

  mounted () {
    if (this.options.tokenRequired) {
      const token = this.auth.syncToken(this.name)
      this._setToken(token)
    }

    return this.auth.fetchUserOnce()
  }

  async login (endpoint) {
    if (!this.options.endpoints.login) {
      return
    }

    const {
      data: { signIn: { jwtToken } }
    } = await this.app.apolloProvider.clients.defaultClient.mutate({
      mutation: signIn,
      variables: {
        input: this.options.endpoints.login
      }
    })

    if (this.options.tokenRequired) {
      const token = this.options.tokenType
        ? this.options.tokenType + ' ' + jwtToken
        : jwtToken

      this.auth.setToken(this.name, token)
      this._setToken(token)
    }

    return this.fetchUser()
  }

  async fetchUser (endpoint) {
    // User endpoint is disabled.
    if (!this.options.endpoints.user) {
      this.auth.setUser({})
      return
    }

    // Token is required but not available
    if (this.options.tokenRequired && !this.auth.getToken(this.name)) {
      return
    }

    // Try to fetch user and then set
    // const user = await this.auth.requestWith(
    //   this.name,
    //   endpoint,
    //   this.options.endpoints.user
    // )
    // this.auth.setUser(user)

    const { data } = await this.app.apolloProvider.clients.defaultClient.query({
      query: currentUser
    })

    // const data = await this._request('user', endpoint);

    if (!data.currentUser) {
      return
    }

    this.auth.setUser(data)
  }

  async logout (endpoint) {
    if (!this.options.endpoints.logout) {
      return
    }

    await this.auth
      .requestWith(this.name, endpoint, this.options.endpoints.logout)
      .catch(() => {})

    if (this.options.tokenRequired) {
      this._clearToken()
    }

    return this.auth.reset()
  }
}
