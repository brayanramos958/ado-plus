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
  const allPatches = [...(patches || [])]

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
