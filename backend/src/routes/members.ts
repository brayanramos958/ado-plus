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
      `/_apis/projects/${config.ADO_PROJECT}/teams/${config.ADO_TEAM_ID}/members`,
      { patToken: getUserPAT(req) }
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
  } catch (err) {
    console.error('[members] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener miembros' })
  }
})

router.get('/wit/tags', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`/${config.ADO_PROJECT}/_apis/wit/tags?api-version=7.1-preview.1`, {
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[members] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener tags' })
  }
})

router.get('/wit/types', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`/${config.ADO_PROJECT}/_apis/wit/workitemtypes`, {
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[members] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener tipos' })
  }
})

router.get('/wit/states/:type', async (req, res) => {
  try {
    const { status, data } = await adoFetch(
      `/${config.ADO_PROJECT}/_apis/wit/workitemtypes/${encodeURIComponent(req.params.type)}/states`,
      { patToken: getUserPAT(req) }
    )
    res.status(status).json(data)
  } catch (err) {
    console.error('[members] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener estados' })
  }
})

export default router
