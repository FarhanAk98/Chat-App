import { createRoot } from 'react-dom/client'
import './index.css'
import NavBar from './NavBar'
import { BrowserRouter } from 'react-router-dom'

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <NavBar />
  </BrowserRouter>,
)
