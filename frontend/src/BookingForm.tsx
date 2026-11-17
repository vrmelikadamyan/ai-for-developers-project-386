import { Button, Stack, Text, TextInput } from '@mantine/core'
import { type FormEvent, useState } from 'react'

import { type BookingInput, createBooking } from './api'

type GuestContact = Pick<BookingInput, 'guestName' | 'guestEmail'>

interface BookingFormProps {
  typeId: string
  startsAt: string
  onConfirmed: () => void
  contact: GuestContact
  onContactChange: (contact: GuestContact) => void
  onBack: (notice?: string) => void
}

export function BookingForm({
  typeId,
  startsAt,
  contact,
  onContactChange,
  onConfirmed,
  onBack,
}: BookingFormProps) {
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<{ guestName?: string; guestEmail?: string }>({})
  const [failed, setFailed] = useState(false)

  async function confirm(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const guestName = contact.guestName.trim()
    const guestEmail = contact.guestEmail.trim()
    const nextErrors: typeof errors = {}
    if (!guestName || [...guestName].length > 100)
      nextErrors.guestName = 'Введите имя длиной от 1 до 100 символов'
    if ([...guestEmail].length > 254 || !/^[^\s@]+@[^\s@]+$/u.test(guestEmail))
      nextErrors.guestEmail = 'Введите корректный email длиной до 254 символов'
    setErrors(nextErrors)
    setFailed(false)
    if (nextErrors.guestName || nextErrors.guestEmail) return
    setSaving(true)
    const { data, error, response } = await createBooking({
      body: { meetingTypeId: typeId, startsAt, guestName, guestEmail },
    })
    setSaving(false)
    if (response?.status === 201 && data) {
      onConfirmed()
    } else if (response?.status === 409 && error?.code === 'SLOT_TAKEN') {
      onBack('Это время уже занято. Выберите другой слот')
    } else if (response?.status === 400 && error?.code === 'INVALID_START') {
      onBack('Это время уже недоступно')
    } else if (
      response?.status === 400 &&
      error?.code === 'INVALID_INPUT' &&
      (error.field === 'guestName' || error.field === 'guestEmail') &&
      typeof error.message === 'string' &&
      error.message.trim()
    ) {
      setErrors({ [error.field]: error.message })
    } else {
      setFailed(true)
    }
  }

  return (
    <form noValidate onSubmit={confirm}>
      <Stack align="flex-start">
        <TextInput
          label="Имя"
          name="guestName"
          value={contact.guestName}
          disabled={saving}
          onChange={(event) =>
            onContactChange({ ...contact, guestName: event.currentTarget.value })
          }
          autoComplete="name"
          error={errors.guestName}
          required
        />
        <TextInput
          label="Email"
          name="guestEmail"
          value={contact.guestEmail}
          disabled={saving}
          onChange={(event) =>
            onContactChange({ ...contact, guestEmail: event.currentTarget.value })
          }
          type="email"
          autoComplete="email"
          error={errors.guestEmail}
          required
        />
        {failed && <Text role="alert">Не удалось подтвердить запись</Text>}
        <Button type="submit" loading={saving}>
          Подтвердить запись
        </Button>
        <Button type="button" variant="light" disabled={saving} onClick={() => onBack()}>
          Выбрать другое время
        </Button>
      </Stack>
    </form>
  )
}
