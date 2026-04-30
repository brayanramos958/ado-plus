import express from 'express'
import cors from 'cors'
import { config } from './config'
import workitemsRouter from './routes/workitems'
import wiqlRouter from './routes/wiql'
import iterationsRouter from './routes/iterations'
import membersRouter from './routes/members'

const app = express()

app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:3000'] }))
app.use(express.json())

app.use('/api/workitems', workitemsRouter)
app.use('/api/wiql', wiqlRouter)
app.use('/api/iterations', iterationsRouter)
app.use('/api/members', membersRouter)

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', org: config.ADO_ORG, project: config.ADO_PROJECT_NAME })
})

if (require.main === module) {
  app.listen(config.PORT, () => {
    console.log(`[backend] corriendo en http://localhost:${config.PORT}`)
    console.log(`[backend] org: ${config.ADO_ORG} | proyecto: ${config.ADO_PROJECT_NAME}`)
  })
}
