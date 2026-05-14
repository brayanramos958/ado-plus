import { Router } from 'express'
import { adoFetch } from '../proxy'
import { PROJECT_PATH } from '../config'
import { requireAuth } from '../auth/authMiddleware'
import { getUserPAT } from '../auth/getUserPAT'

const router = Router()

router.use(requireAuth)

router.post('/', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/wiql`, {
      method: 'POST',
      body: req.body,
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[wiql] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al consultar Azure DevOps' })
  }
})

export default router
