import { Anchor, Container, Text, Title } from '@mantine/core'

const homePage = {
  title: 'Календарь звонков',
  description: 'Здесь можно записаться на звонок с владельцем календаря без регистрации',
  href: '/book',
  linkText: 'Записаться',
}

const bookingPage = {
  title: 'Запись на звонок',
  description: 'Онлайн-запись пока недоступна',
  href: '/',
  linkText: 'На главную',
}

export default function App() {
  const page = window.location.pathname === '/book' ? bookingPage : homePage

  return (
    <Container component="main" size="sm" py="xl">
      <Title order={1}>{page.title}</Title>
      <Text my="md">{page.description}</Text>
      <Anchor href={page.href}>{page.linkText}</Anchor>
    </Container>
  )
}
