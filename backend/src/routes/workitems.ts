import { Router } from 'express'
import { adoFetch } from '../proxy'
import { PROJECT_PATH, ADO_BASE, config } from '../config'

const router = Router()

router.post('/batch', async (req, res) => {
  const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitemsbatch`, {
    method: 'POST',
    body: req.body,
  })
  res.status(status).json(data)
})

router.get('/:id', async (req, res) => {
  const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}?$expand=all`)
  res.status(status).json(data)
})

router.post('/', async (req, res) => {
  const { type, patches, parentId } = req.body
  const patchList: Array<{ op: string; path: string; value?: unknown }> = patches || []

  // ADO only accepts the initial state at creation time; other states must be
  // set via a subsequent PATCH. Extract the state patch and apply it separately.
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
  })

  const created = data as { id?: number }
  if (status >= 200 && status < 300 && statePatch && created.id) {
    await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${created.id}`, {
      method: 'PATCH',
      body: [statePatch],
      contentType: 'application/json-patch+json',
    })
  }

  res.status(status).json(data)
})

router.patch('/:id', async (req, res) => {
  const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}`, {
    method: 'PATCH',
    body: req.body,
    contentType: 'application/json-patch+json',
  })
  res.status(status).json(data)
})

router.delete('/:id', async (req, res) => {
  const { status, data } = await adoFetch(`${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}`, {
    method: 'DELETE',
  })
  res.status(status).json(data)
})

router.get('/:id/comments', async (req, res) => {
  const { status, data } = await adoFetch(
    `${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.3`
  )
  res.status(status).json(data)
})

router.post('/:id/comments', async (req, res) => {
  const { status, data } = await adoFetch(
    `${PROJECT_PATH}/_apis/wit/workitems/${req.params.id}/comments?api-version=7.0-preview.3`,
    { method: 'POST', body: req.body }
  )
  res.status(status).json(data)
})

export default router
