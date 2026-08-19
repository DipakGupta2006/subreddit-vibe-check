export default async function handler(req, res) {
  const { subreddit } = req.query
  if (!subreddit) return res.status(400).json({ error: 'Missing subreddit' })

  try {
    const response = await fetch(
      `https://www.reddit.com/r/${subreddit}/hot.json?limit=50&raw_json=1`,
      {
        headers: {
          'User-Agent': 'SubredditVibeCheck/1.0 by VibeCheckApp',
          'Accept': 'application/json',
        }
      }
    )

    if (!response.ok) {
      return res.status(response.status).json({ error: `Reddit returned ${response.status}` })
    }

    const data = await response.json()
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).json(data)
  } catch (e) {
    res.status(500).json({ error: 'Failed to fetch Reddit data' })
  }
}