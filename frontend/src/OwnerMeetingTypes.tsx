import { Anchor, Button, Stack, Text, TextInput, Textarea, Title } from '@mantine/core'
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
      <Title order={1}>Типы встреч</Title>
      {editing ? (
        <form noValidate onSubmit={publish}>
          <Stack>
            <TextInput label="Название" name="name" error={errors.name} required />
            <Textarea label="Описание" name="description" error={errors.description} />
            <TextInput
              label="Длительность в минутах"
              name="durationMinutes"
              error={errors.durationMinutes}
              type="number"
              required
            />
            {failed && <Text role="alert">Не удалось сохранить тип встречи</Text>}
            <Button type="submit" loading={saving}>
              Сохранить
            </Button>
          </Stack>
        </form>
      ) : (
        <Button onClick={() => setEditing(true)}>Создать</Button>
      )}
      <MeetingTypeList key={revision} />
      <Anchor href="/">На главную</Anchor>
    </>
  )
}
