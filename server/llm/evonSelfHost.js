// Route C: Evon Self-Hosted (vLLM / SGLang on rented GPU)
// Verified from Hugging Face model card: gnani/gnani-evon-v3.3

import { buildUserPrompt, parseLlmResponse, SYSTEM_PROMPT } from './prompts.js'

export function isConfigured() {
  const hostUrl = process.env.EVON_SELFHOST_URL
  return Boolean(hostUrl && hostUrl.trim() !== '')
}

/**
 * Route C client for OpenAI-compatible vLLM/SGLang chat endpoints
 * Configured per gnani/gnani-evon-v3.3 model card recommendations:
 * - Reasoning disabled via chat_template_kwargs.enable_thinking: false
 * - Recommended deterministic settings: temperature 0.6, top_p 0.95, repetition_penalty 1.1
 */
export async function extract({ field, transcript, context = {} }) {
  if (!isConfigured()) {
    throw new Error('Evon Self-Host not configured: EVON_SELFHOST_URL is missing or unverified')
  }

  const startTime = Date.now()
  const hostUrl = process.env.EVON_SELFHOST_URL.replace(/\/+$/, '')
  const endpoint = `${hostUrl}/v1/chat/completions`
  const modelName = process.env.EVON_MODEL_NAME || 'model'

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), 8000)

  try {
    const userMessage = buildUserPrompt({ field, transcript, context })

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: userMessage },
        ],
        temperature: 0.6,
        top_p: 0.95,
        repetition_penalty: 1.1,
        max_tokens: 2048,
        chat_template_kwargs: {
          enable_thinking: false,
        },
        stream: false,
      }),
      signal: controller.signal,
    })

    if (!response.ok) {
      throw new Error(`Self-hosted Evon responded with HTTP ${response.status}`)
    }

    const data = await response.json()
    const content = data.choices?.[0]?.message?.content
    const parsed = parseLlmResponse(content)

    return {
      ...parsed,
      latencyMs: Date.now() - startTime,
      provider: 'evon-selfhost',
    }
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new Error('Evon Self-Host request timed out after 8000ms')
    }
    throw err
  } finally {
    clearTimeout(timer)
  }
}
