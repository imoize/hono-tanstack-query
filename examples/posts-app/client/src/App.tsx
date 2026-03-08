import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { HomePage } from '@/pages/HomePage.js'
import { PostDetailPage } from '@/pages/PostDetailPage.js'
import { NewPostPage } from '@/pages/NewPostPage.js'

export function App(): React.JSX.Element {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/"           element={<HomePage />} />
        <Route path="/posts/new"  element={<NewPostPage />} />
        <Route path="/posts/:id"  element={<PostDetailPage />} />
      </Routes>
    </BrowserRouter>
  )
}
