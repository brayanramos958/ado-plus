import { Router } from 'express'
import { adoFetch } from '../proxy'
import { config } from '../config'
import { requireAuth } from '../auth/authMiddleware'
import { getUserPAT } from '../auth/getUserPAT'

const router = Router()

router.use(requireAuth)

router.get('/', async (req, res) => {
  try {
    const { status, data } = await adoFetch(
      `/${config.ADO_PROJECT}/_apis/work/teamsettings/iterations?teamId=${config.ADO_TEAM_ID}`,
      { patToken: getUserPAT(req) }
    )
    res.status(status).json(data)
  } catch (err) {
    console.error('[iterations] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener iteraciones' })
  }
})

router.get('/current', async (req, res) => {
  try {
    const { status, data } = await adoFetch(
      `/${config.ADO_PROJECT}/_apis/work/teamsettings/iterations?teamId=${config.ADO_TEAM_ID}&$timeframe=current`,
      { patToken: getUserPAT(req) }
    )
    res.status(status).json(data)
  } catch (err) {
    console.error('[iterations] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener iteración actual' })
  }
})

export default router
