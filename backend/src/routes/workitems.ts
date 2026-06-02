import { Router } from 'express'
import { adoFetch } from '../proxy'
import { PROJECT_PATH, ADO_BASE, config } from '../config'
import { requireAuth } from '../auth/authMiddleware'
import { getUserPAT } from '../auth/getUserPAT'

const router = Router()

// Proteger todas las rutas de work items
router.use(requireAuth)

router.post('/batch', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitemsbatch`, {
      method: 'POST',
      body: req.body,
      patToken: getUserPAT(req),
    })
    if (status >= 400) {
      console.error('[batch] ADO error', status, JSON.stringify(data))
    }
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/batch] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener work items' })
  }
})

router.get('/:id', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}?$expand=all`, {
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/:id] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener detalle' })
  }
})

router.post('/', async (req, res) => {
  try {
    const { type, patches, parentId } = req.body
    const patchList: Array<{ op: string; path: string; value?: unknown }> = patches || []

    const statePatch = patchList.find((p) => p.path === '/fields/System.State')
    const creationPatches = patchList.filter((p) => p.path !== '/fields/System.State')

    const allPatches = [...creationPatches]

    if (parentId) {
      allPatches.push({
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `${ADO_BASE}/${config.ADO_PROJECT}/_apis/wit/workitems/${parentId}`,
        },
      })
    }

    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/$${type}`, {
      method: 'POST',
      body: allPatches,
      contentType: 'application/json-patch+json',
      patToken: getUserPAT(req),
    })

    const created = data as { id?: number }
    if (status >= 200 && status < 300 && statePatch && created.id) {
      await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${created.id}`, {
        method: 'PATCH',
        body: [statePatch],
        contentType: 'application/json-patch+json',
        patToken: getUserPAT(req),
      })
    }

    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/create] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al crear work item' })
  }
})

router.patch('/:id', async (req, res) => {
  try {
    const patches: Array<{ op: string; path: string; value?: unknown }> = req.body || []

    // Convert System.Parent field patches into proper ADO relation patches.
    // ADO stores parent-child as a link relation (Hierarchy-Reverse), not a field.
    // Only 'add' and 'replace' ops carry a value; 'remove' ops are not supported here
    // because removing a parent relation requires a separate DELETE call with relation ID.
    const parentPatches = patches.filter((p) =>
      p.path === '/fields/System.Parent' && (p.op === 'add' || p.op === 'replace') && p.value != null
    )
    const otherPatches = patches.filter((p) => p.path !== '/fields/System.Parent')

    const allPatches = [...otherPatches]

    for (const pp of parentPatches) {
      allPatches.push({
        op: 'add',
        path: '/relations/-',
        value: {
          rel: 'System.LinkTypes.Hierarchy-Reverse',
          url: `${ADO_BASE}/${config.ADO_PROJECT}/_apis/wit/workitems/${pp.value}`,
        },
      })
    }

    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}`, {
      method: 'PATCH',
      body: allPatches,
      contentType: 'application/json-patch+json',
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/patch] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al actualizar work item' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}`, {
      method: 'DELETE',
      patToken: getUserPAT(req),
    })
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/delete] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al eliminar work item' })
  }
})

router.get('/:id/comments', async (req, res) => {
  try {
    const { status, data } = await adoFetch(
      `${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.3`,
      { patToken: getUserPAT(req) }
    )
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/comments] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al obtener comentarios' })
  }
})

router.post('/:id/comments', async (req, res) => {
  try {
    const { status, data } = await adoFetch(
      `${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.3`,
      { method: 'POST', body: req.body, patToken: getUserPAT(req) }
    )
    res.status(status).json(data)
  } catch (err) {
    console.error('[workitems/comments] Error:', (err as Error).message)
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Error al crear comentario' })
  }
})

export default router
