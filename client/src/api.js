// Shared home for requests to the Node server.
export async function getHealth() {
  const response = await fetch('/api/health')
  if (!response.ok) throw new Error('Health check failed')
  return response.json()
}
