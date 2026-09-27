import { useState } from 'react'
import { useApolloClient, useQuery, useSubscription } from '@apollo/client/react'
import { addBookToCache } from './utils/apolloCache'
import Authors from './components/Authors'
import Books from './components/Books'
import NewBook from './components/NewBook'
import LoginForm from './components/LoginForm'
import { CURRENT_USER, BOOK_ADDED } from './queries'

const App = () => {
  const [page, setPage] = useState('authors')
  const [token, setToken] = useState(localStorage.getItem('library-user-token'))
  const [isCreatingBook, setIsCreatingBook] = useState(false)
  const currentUser = useQuery(CURRENT_USER, {
    skip: !token,
  })

  const client = useApolloClient()

  useSubscription(BOOK_ADDED, {
    onData: ({ data }) => {
      const book = data.data.bookAdded
      window.alert(`Created Book ${book.title}`)
      console.log('Book Added: ', book.title)
      addBookToCache(client.cache, book)
    },
  })

  const handleCreatingBookChange = (creatingBook) => {
    setIsCreatingBook(creatingBook)
  }

  const handleLogin = (token) => {
    setToken(token)
    setPage('authors')
  }

  const handleLogout = () => {
    localStorage.removeItem('library-user-token')
    setToken('')
  }
  return (
    <div>
      <div>
        <button onClick={() => setPage('authors')}>authors</button>
        <button disabled={isCreatingBook} onClick={() => setPage('books')}>
          books
        </button>
        {token && <button onClick={() => setPage('add')}>add book</button>}
        {token && (
          <button disabled={isCreatingBook} onClick={() => setPage('recommend')}>
            recommend
          </button>
        )}
        {!token && <button onClick={() => setPage('login')}>login</button>}
        {token && <button onClick={() => handleLogout()}>logout</button>}
      </div>

      <Authors show={page === 'authors'} token={token} />

      <Books show={page === 'books'} />

      <NewBook show={page === 'add'} onCreatingBookChange={handleCreatingBookChange} />

      <Books show={page === 'recommend'} currentUser={currentUser} />

      <LoginForm show={page === 'login'} handleLogin={handleLogin} />
    </div>
  )
}

export default App
