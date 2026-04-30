import { Router } from 'express'
import { adoFetch } from '../proxy'
import { PROJECT_PATH } from '../config'

const router = Router()

router.post('/', async (req, res) => {
  const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/wiql`, {
    method: 'POST',
    body: req.body,
  })
  res.status(status).json(data)
})

export default router
