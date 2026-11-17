import { Button, Stack, Text, TextInput, Textarea } from '@mantine/core'
import { Plus } from 'lucide-react'
import { type FormEvent, useState } from 'react'

import { MeetingTypeList } from './MeetingTypeList'
import { createMeetingType, type MeetingTypeInput } from './api'

export function OwnerMeetingTypes() {
  const [editing, setEditing] = useState(false)
  const [revision, setRevision] = useState(0)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Partial<Record<keyof MeetingTypeInput, string>>>({})
  const [failed, setFailed] = useState(false)

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const name = String(form.get('name')).trim()
    const description = String(form.get('description')).trim()
    const durationMinutes = Number(form.get('durationMinutes'))
    const nextErrors: Partial<Record<keyof MeetingTypeInput, string>> = {}
    if (!name || [...name].length > 100)
      nextErrors.name = 'Введите название длиной от 1 до 100 символов'
    if ([...description].length > 1000)
      nextErrors.description = 'Описание должно содержать до 1000 символов'
    if (!Number.isInteger(durationMinutes) || durationMinutes < 1 || durationMinutes > 540) {
      nextErrors.durationMinutes = 'Введите целое число минут от 1 до 540'
    }
    setErrors(nextErrors)
    setFailed(false)
    if (Object.keys(nextErrors).length) return
    setSaving(true)
    try {
      await createMeetingType({ body: { name, description, durationMinutes }, throwOnError: true })
      setEditing(false)
      setRevision((value) => value + 1)
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <div className="page-title title-actions">
        <div>
          <h1>Типы встреч</h1>
          <p>Форматы звонков, на которые могут записаться гости.</p>
        </div>
        {!editing && (
          <button className="action primary" onClick={() => setEditing(true)}>
            <Plus size={18} />
            Создать
          </button>
        )}
      </div>
      {editing && (
        <form className="panel owner-form" noValidate onSubmit={publish}>
          <h2>Новый тип встречи</h2>
          <Stack>
            <TextInput
              label="Название"
              name="name"
              placeholder="Например, знакомство"
              error={errors.name}
              required
            />
            <Textarea
              label="Описание"
              name="description"
              placeholder="Что обсудите на звонке?"
              error={errors.description}
              rows={3}
            />
            <TextInput
              label="Длительность в минутах"
              name="durationMinutes"
              defaultValue="30"
              min={1}
              max={540}
              error={errors.durationMinutes}
              type="number"
              required
            />
            {failed && <Text role="alert">Не удалось сохранить тип встречи</Text>}
            <div className="form-actions">
              <Button type="submit" loading={saving}>
                Сохранить
              </Button>
              <Button
                variant="default"
                disabled={saving}
                onClick={() => {
                  setErrors({})
                  setFailed(false)
                  setEditing(false)
                }}
              >
                Отмена
              </Button>
            </div>
          </Stack>
        </form>
      )}
      <MeetingTypeList key={revision} />
    </>
  )
}
