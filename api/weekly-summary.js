import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.headers['authorization'] !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const supabase = createClient(
    process.env.VITE_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )

  const dateTo   = new Date().toISOString().slice(0, 10)
  const dateFrom = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const { data: thoughts, error } = await supabase
    .from('thoughts')
    .select('*')
    .gte('datum', dateFrom)
    .order('datum')

  if (error) return res.status(500).json({ error: error.message })
  if (!thoughts?.length) return res.status(200).json({ message: 'Žádné myšlenky tento týden.' })

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const thoughtsText = thoughts
    .map(t => `[${t.datum}${t.projekt ? ` · ${t.projekt}` : ''}${t.priorita ? ` · priorita ${t.priorita}/5` : ''}]\n${t.text}`)
    .join('\n\n')

  const message = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Jsi asistent pro Dominika. Analyzuj jeho myšlenky z tohoto týdne a napiš stručný souhrn v češtině.

Myšlenky (${dateFrom} – ${dateTo}):
${thoughtsText}

Napiš souhrn v tomto formátu:
## Hlavní témata
[co se tento týden řešilo]

## Klíčové myšlenky
[nejdůležitější nápady, seřazené od nejdůležitějšího]

## Vyžaduje akci
[věci které potřebují follow-up nebo rozhodnutí]`,
    }],
  })

  const obsah = message.content[0].text

  await supabase.from('summaries').insert({
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    datum_od: dateFrom,
    datum_do: dateTo,
    obsah,
  })

  return res.status(200).json({ success: true })
}
