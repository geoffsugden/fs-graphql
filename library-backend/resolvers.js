const { GraphQLError, subscribe } = require('graphql')
const { PubSub } = require('graphql-subscriptions')
const jwt = require('jsonwebtoken')
const Book = require('./models/book')
const Author = require('./models/author')
const User = require('./models/user')
const { BOOK_TITLE_MIN_LENGTH, AUTHOR_NAME_MIN_LENGTH } = require('./constants')

const pubsub = new PubSub()
/*
 * English:
 * It might make more sense to associate a book with its author by storing the author's id in the context of the book instead of the author's name
 * However, for simplicity, we will store the author's name in connection with the book
 */

const resolvers = {
  Query: {
    bookCount: async () => await Book.collection.countDocuments(),
    authorCount: async () => await Author.collection.countDocuments(),
    allBooks: async (root, args) => {
      const filter = {}
      if (args.genre) {
        filter.genres = args.genre
      }

      if (args.author) {
        const author = await Author.findOne({ name: args.author })
        if (!author) {
          return []
        }
        filter.author = author._id
      }

      return await Book.find(filter).populate('author')
    },
    allAuthors: async () => {
      return await Author.find({}).populate('books')
    },
    me: async (root, args, context) => context.currentUser,
  },
  Author: {
    bookCount: (root) => {
      const retval = root.books?.length ?? 0
      return retval
    },
  },
  Mutation: {
    addBook: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('Not Authenticated', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        })
      }
      try {
        let author = await Author.findOne({ name: args.author })
        if (!author) {
          author = new Author({ name: args.author })
          author = await author.save()
        }
        const book = new Book({ ...args, author: author })
        const newBook = await book.save()
        await Author.findOneAndUpdate({ _id: author.id }, { $push: { books: newBook.id } })
        pubsub.publish('BOOK_ADDED', { bookAdded: newBook })
        return newBook
      } catch (error) {
        if (error.code === 11000) {
          throw new GraphQLError(`Book title must be unique: '${args.title}'`, {
            extensions: {
              code: 'BAD_USER_INPUT',
              invalidArgs: args.title,
            },
          })
        } else if (error._message === 'Author validation failed') {
          /*
           * NOTE: Length validation is caught and reported here due to course instructions.
           * This should be validated before attempting to save the author, as a valid new author
           * will be saved even if book validation fails. My preference would be to let the
           * validation errors for length propgate, and validate the lengths at the start of this
           * mutator, throwing GraphQL errors at that point if there are any issues.
           */
          throw new GraphQLError(
            `Author name must be at least ${AUTHOR_NAME_MIN_LENGTH} characters long: '${args.author}'`,
            {
              extensions: {
                code: 'BAD_USER_INPUT',
                invalidArgs: args.author,
              },
            },
          )
        } else if (error._message === 'Book validation failed') {
          throw new GraphQLError(
            `Book title must be at least ${BOOK_TITLE_MIN_LENGTH} characters long: '${args.title}'`,
            {
              extensions: {
                code: 'BAD_USER_INPUT',
                invalidArgs: args.author,
              },
            },
          )
        }
        throw error
      }
    },
    editAuthor: async (root, args, context) => {
      if (!context.currentUser) {
        throw new GraphQLError('Not Authenticated', {
          extensions: {
            code: 'UNAUTHENTICATED',
          },
        })
      }
      const author = await Author.findOne({ name: args.name })
      if (!author) {
        return null
      }
      author.born = args.setBornTo

      return await author.save()
    },
    createUser: async (root, args) => {
      const user = new User({
        username: args.username,
        favoriteGenre: args.favoriteGenre,
      })
      try {
        return await user.save()
      } catch (error) {
        throw new GraphQLError(`Creating the user failed: ${error.message}`, {
          extensions: {
            code: 'BAD_USER_INPUT',
            invalidArgs: args.username,
            error,
          },
        })
      }
    },
    login: async (root, args) => {
      const user = await User.findOne({ username: args.username })

      if (!user || args.password !== 'secret') {
        throw new GraphQLError('incorrect credentials', {
          extensions: {
            code: 'BAD_USER_INPUT',
          },
        })
      }

      const userForToken = {
        username: user.username,
        id: user._id,
      }

      return {
        value: `${jwt.sign(userForToken, process.env.JWT_SECRET)}`,
      }
    },
    _resetDatabase: async () => {
      if (process.env.NODE_ENV !== 'test') {
        throw new GraphQLError('_resetDatabase is only available in test mode')
      }
      await Author.deleteMany({})
      await Book.deleteMany({})
      await User.deleteMany({})
      return true
    },
  },
  Subscription: {
    bookAdded: {
      subscribe: () => pubsub.asyncIterableIterator('BOOK_ADDED'),
    },
  },
}
module.exports = resolvers
