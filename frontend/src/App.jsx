import { Toaster } from 'react-hot-toast'
import HomePage from './pages/HomePage'

export default function App() {
  return (
    <>
      <Toaster position="top-center" toastOptions={{ duration: 3000 }} />
      <HomePage />
    </>
  )
}
