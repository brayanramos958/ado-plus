import { Router } from 'express'
import { adoFetch } from '../proxy'
import { PROJECT_PATH, config } from '../config'

const router = Router()

router.get('/', async (_req, res) => {
  const { status, data } = await adoFetch(
    `/${config.ADO_PROJECT}/_apis/work/teamsettings/iterations?teamId=${config.ADO_TEAM_ID}`
  )
  res.status(status).json(data)
})

router.get('/current', async (_req, res) => {
  const { status, data } = await adoFetch(
    `/${config.ADO_PROJECT}/_apis/work/teamsettings/iterations?teamId=${config.ADO_TEAM_ID}&$timeframe=current`
  )
  res.status(status).json(data)
})

export default router
