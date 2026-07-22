import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from './assets/vite.svg'
import heroImg from './assets/hero.png'
import './App.css'
import YouTubeDownloader from './YoutubeDownloader'

function App() {
  const [count, setCount] = useState(0)

  return (
    <YouTubeDownloader />
  )
}

export default App
