import Mercury from '@postlight/mercury-parser'

export async function parseArticle (url) {
  try {
    const result = await Mercury.parse(url)
    return result
  } catch (e) {
    return null
  }
}
