import { Router } from 'express'
import { adoFetch } from '../proxy'
import { config } from '../config'

const router = Router()

router.get('/', async (_req, res) => {
  const { status, data } = await adoFetch(
    `/_apis/projects/${config.ADO_PROJECT}/teams/${config.ADO_TEAM_ID}/members`
  )

  if (status !== 200 || !data || typeof data !== 'object') {
    return res.status(status).json(data)
  }

  const raw = data as { value: Array<{ isTeamAdmin?: boolean; identity: { uniqueName: string; displayName: string; imageUrl?: string } }> }

  const normalized = raw.value.map((m) => ({
    email: m.identity.uniqueName,
    displayName: m.identity.displayName,
    avatar: m.identity.imageUrl ?? null,
    isAdmin: !!m.isTeamAdmin,
  }))

  res.status(200).json({ value: normalized, count: normalized.length })
})


router.get('/wit/tags', async (_req, res) => {
  const { status, data } = await adoFetch(`/${config.ADO_PROJECT}/_apis/wit/tags`)
  res.status(status).json(data)
})

router.get('/wit/types', async (_req, res) => {
  const { status, data } = await adoFetch(`/${config.ADO_PROJECT}/_apis/wit/workitemtypes`)
  res.status(status).json(data)
})

router.get('/wit/states/:type', async (req, res) => {
  const { status, data } = await adoFetch(
    `/${config.ADO_PROJECT}/_apis/wit/workitemtypes/${encodeURIComponent(req.params.type)}/states`
  )
  res.status(status).json(data)
})

export default router
