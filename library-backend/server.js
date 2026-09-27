const { ApolloServer } = require('@apollo/server')
const { ApolloServerPluginDrainHttpServer } = require('@apollo/server/plugin/drainHttpServer')
const { expressMiddleware } = require('@as-integrations/express5')
const cors = require('cors')
const express = require('express')
const { makeExecutableSchema } = require('@graphql-tools/schema')
const http = require('http')
const jwt = require('jsonwebtoken')
const { WebSocketServer } = require('ws')
const { useServer } = require('graphql-ws/use/ws')

const resolvers = require('./resolvers')
const typeDefs = require('./schema')
const User = require('./models/user')

getUserFromAuthHeader = async (auth) => {
  const bearerPrefix = 'Bearer '
  if (!auth || !auth.startsWith(bearerPrefix)) {
    return null
  }

  const decodedToken = jwt.verify(auth.substring(bearerPrefix.length), process.env.JWT_SECRET)
  const user = await User.findById(decodedToken.id)
  return user
}

const startServer = async (port) => {
  const app = express()
  const httpServer = http.createServer(app)

  const wsServer = new WebSocketServer({
    server: httpServer,
    path: '/',
  })

  const schema = makeExecutableSchema({ typeDefs, resolvers })
  const serverCleanup = useServer({ schema }, wsServer)
  const server = new ApolloServer({
    schema,
    plugins: [
      ApolloServerPluginDrainHttpServer({ httpServer }),
      {
        async serverWillStart() {
          return {
            async drainServer() {
              await serverCleanup.dispose()
            },
          }
        },
      },
    ],
  })

  await server.start()
  app.use(
    '/',
    cors(),
    express.json(),
    expressMiddleware(server, {
      context: async ({ req }) => {
        const auth = req.headers.authorization
        const currentUser = await getUserFromAuthHeader(auth)
        return { currentUser }
      },
    }),
  )

  httpServer.listen(port, () => console.log(`Server is now running on http://localhost:${port}`))
}
module.exports = startServer
