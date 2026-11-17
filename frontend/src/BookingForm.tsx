import { Button, Stack, Text, TextInput } from '@mantine/core'
import { type FormEvent, useState } from 'react'

import { createBooking } from './api'

interface BookingFormProps {
  typeId: string
  startsAt: string
  onConfirmed: () => void
  onBack: () => void
}

export function BookingForm({ typeId, startsAt, onConfirmed, onBack }: BookingFormProps) {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ guestName?: string; guestEmail?: string }>({})
  const [failed, setFailed] = useState(false)

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const guestName = String(form.get('guestName')).trim()
    const guestEmail = String(form.get('guestEmail')).trim()
    const nextErrors: typeof errors = {}
    if (!guestName || [...guestName].length > 100)
      nextErrors.guestName = 'Введите имя длиной от 1 до 100 символов'
    if ([...guestEmail].length > 254 || !/^[^\s@]+@[^\s@]+$/u.test(guestEmail))
      nextErrors.guestEmail = 'Введите корректный email длиной до 254 символов'
    setErrors(nextErrors)
    setFailed(false)
    if (nextErrors.guestName || nextErrors.guestEmail) return
    setSaving(true)
    try {
      await createBooking({
        body: { meetingTypeId: typeId, startsAt, guestName, guestEmail },
        throwOnError: true,
      })
      onConfirmed()
    } catch {
      setFailed(true)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form noValidate onSubmit={confirm}>
      <Stack align="flex-start">
        <TextInput
          label="Имя"
          name="guestName"
          autoComplete="name"
          error={errors.guestName}
          required
        />
        <TextInput
          label="Email"
          name="guestEmail"
          type="email"
          autoComplete="email"
          error={errors.guestEmail}
          required
        />
        {failed && <Text role="alert">Не удалось подтвердить запись</Text>}
        <Button type="submit" loading={saving}>
          Подтвердить запись
        </Button>
        <Button type="button" variant="light" disabled={saving} onClick={onBack}>
          Выбрать другое время
        </Button>
      </Stack>
    </form>
  )
}
