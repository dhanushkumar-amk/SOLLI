import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'

dotenv.config()
const app = express()
const port = process.env.PORT || 5000
app.use(cors())
app.use(express.json())
app.get('/api/health', (_request, response) => response.json({ status: 'ok', keyLoaded: Boolean(process.env.GNANI_API_KEY) }))
app.listen(port, () => console.log(`Solli server listening on port ${port}`))
