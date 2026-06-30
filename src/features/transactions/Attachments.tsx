import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { addAttachment, deleteAttachment, listAttachments } from '../../db/attachmentsRepo'
import { compressImage, makeThumb } from '../../lib/image'
import { t } from '../../i18n/ar'
import type { Attachment } from '../../db/types'

export function Attachments({ transactionId }: { transactionId: string }) {
  const items = useLiveQuery(() => listAttachments(transactionId), [transactionId], [])
  const [busy, setBusy] = useState(false)

  const onFiles = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    e.target.value = ''
    if (!files.length) return
    setBusy(true)
    try {
      for (const f of files) {
        const blob = await compressImage(f)
        const thumb = await makeThumb(f)
        await addAttachment({ transactionId, blob, thumb, mime: 'image/jpeg' })
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {items.map((a) => <Thumb key={a.id} att={a} />)}
      </div>
      <label className="inline-flex cursor-pointer items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-sm font-medium text-ink">
        {busy ? '…' : t('addImage')}
        <input type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={onFiles} disabled={busy} />
      </label>
    </div>
  )
}

function Thumb({ att }: { att: Attachment }) {
  const [url, setUrl] = useState('')
  useEffect(() => {
    const u = URL.createObjectURL(att.thumb ?? att.blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [att.id])

  const openFull = () => {
    const u = URL.createObjectURL(att.blob)
    window.open(u, '_blank')
    setTimeout(() => URL.revokeObjectURL(u), 60000)
  }

  return (
    <div className="relative">
      <img src={url} alt="مرفق" className="h-20 w-20 rounded-lg object-cover" onClick={openFull} />
      <button
        type="button"
        aria-label={t('deleteImage')}
        onClick={() => deleteAttachment(att.id)}
        className="absolute -left-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-expense text-xs text-white"
      >×</button>
    </div>
  )
}
