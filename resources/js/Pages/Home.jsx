// @vitejs/plugin-react
import { useState } from 'react'

export default function Home({ name }) {
  const [count, setCount] = useState(0)
  
  return (
    <div style={{ padding: 24 }}>
      <h1>Hello   {name}</h1>
      <button onClick={() => setCount(c => c + 1)}>
        Count is sdsd: {count}
      </button>
    </div>
  )
}