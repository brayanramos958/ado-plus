import { useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import UnderlineExt from '@tiptap/extension-underline'
import LinkExt from '@tiptap/extension-link'
import ImageExt from '@tiptap/extension-image'
import Placeholder from '@tiptap/extension-placeholder'

async function compressImage(file: File, maxWidth = 900, quality = 0.75): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxWidth / img.naturalWidth)
      const canvas = document.createElement('canvas')
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', quality))
    }
    img.src = url
  })
}
import {
  Bold, Italic, Underline, Strikethrough,
  Heading2, Heading3,
  List, ListOrdered,
  Code, SquareCode, Quote, Minus,
  Link as LinkIcon, Image as ImageIcon, Smile,
  X, Loader2, Send,
} from 'lucide-react'

type ActivePanel = 'link' | 'image' | 'emoji' | null

const EMOJIS: [string, string[]][] = [
  ['Frecuentes', ['👍', '👎', '❤️', '🎉', '🚀', '✅', '❌', '⚠️', '🔥', '💯', '🤔', '👀', '🙏', '💪', '😊', '😅', '😂', '🥳', '😍', '😎']],
  ['Trabajo',    ['💻', '📝', '📊', '📈', '🔧', '🐛', '✨', '🔴', '🟡', '🟢', '⏰', '📅', '🎯', '📌', '🔗', '📦', '🚧', '✍️', '🔍', '💡']],
]

interface RichTextEditorProps {
  onSubmit?: (html: string) => void
  onChange?: (html: string) => void
  isSubmitting?: boolean
  placeholder?: string
  initialContent?: string
}

function TBtn({ active, title, onClick, children }: {
  active?: boolean
  title: string
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={`w-7 h-7 flex items-center justify-center rounded-md transition-colors
        ${active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'}`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ onSubmit, onChange, isSubmitting, placeholder, initialContent }: RichTextEditorProps) {
  const [panel, setPanel] = useState<ActivePanel>(null)
  const [linkUrl, setLinkUrl] = useState('')
  const [imageUrl, setImageUrl] = useState('')

  const onChangeRef = { current: onChange }
  onChangeRef.current = onChange

  const editor = useEditor({
    content: initialContent ?? '',
    extensions: [
      // StarterKit v3 includes link + underline — disable to avoid duplicates
      StarterKit.configure({ link: false, underline: false } as Parameters<typeof StarterKit.configure>[0]),
      UnderlineExt,
      LinkExt.configure({
        openOnClick: false,
        HTMLAttributes: { target: '_blank', rel: 'noopener noreferrer' },
      }),
      ImageExt.configure({ allowBase64: true }),
      Placeholder.configure({ placeholder: placeholder ?? 'Deja una actualización, duda o bloqueo sobre esta tarea...' }),
    ],
    onUpdate: ({ editor: e }) => {
      onChangeRef.current?.(e.isEmpty ? '' : e.getHTML())
    },
    editorProps: {
      attributes: { class: 'tiptap min-h-[110px] px-4 py-3 text-sm outline-none' },
      handlePaste: (view, event) => {
        const items = Array.from(event.clipboardData?.items ?? [])
        const img = items.find((i) => i.type.startsWith('image/'))
        if (!img) return false
        const file = img.getAsFile()
        if (!file) return false
        // Compress before inserting to keep payload small
        compressImage(file).then((src) => {
          view.dispatch(
            view.state.tr.replaceSelectionWith(
              view.state.schema.nodes.image.create({ src })
            )
          )
        })
        return true
      },
    },
  })

  if (!editor) return null

  const togglePanel = (p: ActivePanel) => setPanel((cur) => cur === p ? null : p)

  const applyLink = () => {
    if (!linkUrl) return
    editor.chain().focus().extendMarkRange('link').setLink({ href: linkUrl }).run()
    setLinkUrl('')
    setPanel(null)
  }

  const applyImage = () => {
    if (!imageUrl) return
    editor.chain().focus().setImage({ src: imageUrl }).run()
    setImageUrl('')
    setPanel(null)
  }

  const handleSubmit = () => {
    if (editor.isEmpty || !onSubmit) return
    onSubmit(editor.getHTML())
    editor.commands.clearContent()
    setPanel(null)
  }

  const sep = <div className="w-px h-4 bg-muted-foreground/20 mx-0.5 flex-shrink-0" />

  return (
    <div className="border border-muted-foreground/15 rounded-2xl overflow-hidden bg-background focus-within:border-primary/30 transition-colors">

      {/* Toolbar */}
      <div className="border-b border-muted-foreground/10 px-3 py-2 flex flex-wrap items-center gap-0.5">
        <TBtn title="Negrita (Ctrl+B)" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
          <Bold className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Cursiva (Ctrl+I)" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
          <Italic className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Subrayado (Ctrl+U)" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
          <Underline className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Tachado" active={editor.isActive('strike')} onClick={() => editor.chain().focus().toggleStrike().run()}>
          <Strikethrough className="w-3.5 h-3.5" />
        </TBtn>

        {sep}

        <TBtn title="Encabezado H2" active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          <Heading2 className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Encabezado H3" active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          <Heading3 className="w-3.5 h-3.5" />
        </TBtn>

        {sep}

        <TBtn title="Lista de viñetas" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
          <List className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Lista numerada" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
          <ListOrdered className="w-3.5 h-3.5" />
        </TBtn>

        {sep}

        <TBtn title="Código inline" active={editor.isActive('code')} onClick={() => editor.chain().focus().toggleCode().run()}>
          <Code className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Bloque de código" active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()}>
          <SquareCode className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Cita" active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()}>
          <Quote className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Línea divisoria" active={false} onClick={() => editor.chain().focus().setHorizontalRule().run()}>
          <Minus className="w-3.5 h-3.5" />
        </TBtn>

        {sep}

        <TBtn title="Insertar enlace" active={editor.isActive('link') || panel === 'link'} onClick={() => togglePanel('link')}>
          <LinkIcon className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Insertar imagen" active={panel === 'image'} onClick={() => togglePanel('image')}>
          <ImageIcon className="w-3.5 h-3.5" />
        </TBtn>
        <TBtn title="Insertar emoji" active={panel === 'emoji'} onClick={() => togglePanel('emoji')}>
          <Smile className="w-3.5 h-3.5" />
        </TBtn>
      </div>

      {/* Sub-panel: link */}
      {panel === 'link' && (
        <div className="border-b border-muted-foreground/10 px-3 py-2 flex items-center gap-2 bg-muted/5">
          <LinkIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            type="url"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyLink()}
            placeholder="https://..."
            className="flex-1 text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          />
          <button type="button" onClick={applyLink} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold hover:opacity-90">
            Insertar
          </button>
          <button type="button" onClick={() => setPanel(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-panel: image URL */}
      {panel === 'image' && (
        <div className="border-b border-muted-foreground/10 px-3 py-2 flex items-center gap-2 bg-muted/5">
          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          <input
            autoFocus
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && applyImage()}
            placeholder="https://imagen.png"
            className="flex-1 text-xs bg-background border border-border rounded-lg px-2.5 py-1.5 outline-none focus:border-primary"
          />
          <button type="button" onClick={applyImage} className="text-xs bg-primary text-primary-foreground px-3 py-1.5 rounded-lg font-bold hover:opacity-90">
            Insertar
          </button>
          <button type="button" onClick={() => setPanel(null)} className="text-muted-foreground hover:text-foreground">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Sub-panel: emoji grid */}
      {panel === 'emoji' && (
        <div className="border-b border-muted-foreground/10 px-4 py-3 bg-muted/5 space-y-2">
          {EMOJIS.map(([label, emojis]) => (
            <div key={label}>
              <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1.5">{label}</p>
              <div className="flex flex-wrap gap-0.5">
                {emojis.map((e) => (
                  <button
                    key={e}
                    type="button"
                    onClick={() => { editor.chain().focus().insertContent(e).run(); setPanel(null) }}
                    className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded-lg transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor content */}
      <EditorContent editor={editor} />

      {/* Footer — solo en modo comentario (onSubmit) */}
      {onSubmit && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-muted-foreground/10 bg-muted/5">
          <span className="text-[10px] text-muted-foreground/40 hidden sm:block">
            Puedes pegar imágenes del portapapeles
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={isSubmitting || editor.isEmpty}
            className="ml-auto h-9 px-5 rounded-xl font-black text-[11px] uppercase tracking-widest bg-primary text-primary-foreground
              disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-all flex items-center gap-2"
          >
            {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            Comentar
          </button>
        </div>
      )}
    </div>
  )
}
