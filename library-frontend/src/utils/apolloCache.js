import { ALL_BOOKS } from '../queries'

export const addBookToCache = (cache, bookToAdd) => {
  cache.updateQuery({ query: ALL_BOOKS }, ({ filteredBooks, allGenres }) => {
    const bookExists = filteredBooks.some((book) => book.id === bookToAdd.id)

    if (bookExists) {
      return { filteredBooks, allGenres }
    }

    return {
      filteredBooks: filteredBooks.concat(bookToAdd),
      allGenres,
    }
  })
}
