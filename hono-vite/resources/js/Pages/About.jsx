// @vitejs/plugin-react
import { useState } from 'react'

export default function About({ team }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div style={{ padding: 24 }}>
      <h1>About: {team}</h1>
      <button onClick={() => setExpanded(e => !e)}>
        {expanded ? 'Show Less' : 'Show More'}
      </button>
      {expanded && (
        <p>This is a demo of Inertia.js with Hono and React!</p>
      )}
    </div>
  )
}