import { useState } from 'react'
import Sentiment from 'sentiment'
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts'
import './App.css'

const sentimentLib = new Sentiment()

const QUICK_PICKS = ['worldnews', 'india', 'cricket', 'technology', 'gaming', 'movies']
const COLORS = { positive: '#4ade80', neutral: '#94a3b8', negative: '#f87171' }

function classifyScore(score) {
  if (score > 0) return 'pos'
  if (score < 0) return 'neg'
  return 'neu'
}

function labelOf(cls) {
  return cls === 'pos' ? 'Positive' : cls === 'neg' ? 'Negative' : 'Neutral'
}

function VibeEmoji({ cls }) {
  return cls === 'pos' ? '🟢 Mostly Positive' : cls === 'neg' ? '🔴 Mostly Negative' : '⚪ Mixed / Neutral'
}

export default function App() {
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)
  const [filter, setFilter] = useState('all')

  async function fetchData(sub) {
    const subreddit = (sub || query).trim().replace(/^r\//i, '')
    if (!subreddit) return
    setLoading(true)
    setError('')
    setData(null)
    setFilter('all')
    try {
      const redditUrl = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50&raw_json=1`
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(redditUrl)}`
      const res = await fetch(proxyUrl)
      if (!res.ok) throw new Error(`Could not reach Reddit. Try again.`)
      const proxyData = await res.json()
      const json = JSON.parse(proxyData.contents)
      if (!res.ok) throw new Error(`Subreddit "r/${subreddit}" not found or private.`)
      const json = await res.json()
      const posts = json.data.children
        .filter(p => !p.data.stickied)
        .slice(0, 50)
        .map(p => {
          const result = sentimentLib.analyze(p.data.title)
          const cls = classifyScore(result.score)
          return {
            title: p.data.title,
            score: result.score,
            cls,
            ups: p.data.ups,
            comments: p.data.num_comments,
            author: p.data.author,
            url: `https://reddit.com${p.data.permalink}`
          }
        })

      const pos = posts.filter(p => p.cls === 'pos').length
      const neg = posts.filter(p => p.cls === 'neg').length
      const neu = posts.filter(p => p.cls === 'neu').length
      const avgScore = posts.reduce((a, b) => a + b.score, 0) / posts.length
      const overallCls = classifyScore(Math.round(avgScore))

      // Score distribution for bar chart
      const dist = { '-5 to -3': 0, '-2 to -1': 0, '0': 0, '1 to 2': 0, '3 to 5': 0, '5+': 0 }
      posts.forEach(p => {
        if (p.score <= -3) dist['-5 to -3']++
        else if (p.score < 0) dist['-2 to -1']++
        else if (p.score === 0) dist['0']++
        else if (p.score <= 2) dist['1 to 2']++
        else if (p.score <= 5) dist['3 to 5']++
        else dist['5+']++
      })

      setData({ subreddit, posts, pos, neg, neu, overallCls, avgScore, dist })
    } catch (e) {
      setError(e.message || 'Something went wrong. Try again.')
    } finally {
      setLoading(false)
    }
  }

  const filtered = data?.posts.filter(p =>
    filter === 'all' ? true : p.cls === filter
  ) || []

  const pieData = data ? [
    { name: 'Positive', value: data.pos },
    { name: 'Neutral', value: data.neu },
    { name: 'Negative', value: data.neg },
  ] : []

  const barData = data ? Object.entries(data.dist).map(([k, v]) => ({ range: k, count: v })) : []

  return (
    <div className="app">
      <header className="header">
        <div className="header-logo">📡</div>
        <div>
          <h1>Subreddit Vibe Check</h1>
          <p>Sentiment analysis on Reddit's top 50 hot posts</p>
        </div>
      </header>

      <main className="main">
        {/* SEARCH */}
        <div className="search-section">
          <div className="search-label">Enter Subreddit</div>
          <div className="search-row">
            <input
              className="search-input"
              placeholder="e.g. india, gaming, cricket..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchData()}
            />
            <button className="search-btn" onClick={() => fetchData()} disabled={loading}>
              {loading ? 'Analyzing...' : '⚡ Analyze'}
            </button>
          </div>
          <div className="quick-picks">
            <span className="quick-label">Quick pick:</span>
            {QUICK_PICKS.map(s => (
              <button key={s} className="quick-chip" onClick={() => { setQuery(s); fetchData(s) }}>
                r/{s}
              </button>
            ))}
          </div>
        </div>

        {/* ERROR */}
        {error && <div className="error-box">⚠️ {error}</div>}

        {/* LOADING */}
        {loading && (
          <div className="loading-state">
            <div className="spinner" />
            <p>Fetching posts from r/{query.replace(/^r\//i, '')}...</p>
          </div>
        )}

        {/* RESULTS */}
        {data && !loading && (
          <>
            {/* STATS */}
            <div className="stats-grid">
              <div className="stat-card total">
                <div className="stat-label">Posts Analyzed</div>
                <div className="stat-value">{data.posts.length}</div>
                <div className="stat-sub">r/{data.subreddit}</div>
              </div>
              <div className="stat-card positive">
                <div className="stat-label">Positive</div>
                <div className="stat-value">{data.pos}</div>
                <div className="stat-sub">{Math.round(data.pos / data.posts.length * 100)}% of posts</div>
              </div>
              <div className="stat-card negative">
                <div className="stat-label">Negative</div>
                <div className="stat-value">{data.neg}</div>
                <div className="stat-sub">{Math.round(data.neg / data.posts.length * 100)}% of posts</div>
              </div>
              <div className="stat-card neutral">
                <div className="stat-label">Neutral</div>
                <div className="stat-value">{data.neu}</div>
                <div className="stat-sub">{Math.round(data.neu / data.posts.length * 100)}% of posts</div>
              </div>
            </div>

            {/* VIBE BAR */}
            <div className="vibe-section">
              <div className="section-title">Overall Sentiment Distribution</div>
              <div className="vibe-bar-wrap">
                <div className="vibe-bar">
                  <div className="vibe-seg pos" style={{ width: `${data.pos / data.posts.length * 100}%` }} />
                  <div className="vibe-seg neu" style={{ width: `${data.neu / data.posts.length * 100}%` }} />
                  <div className="vibe-seg neg" style={{ width: `${data.neg / data.posts.length * 100}%` }} />
                </div>
                <div className="vibe-legend">
                  {['pos', 'neu', 'neg'].map(cls => (
                    <div key={cls} className="legend-item">
                      <div className="legend-dot" style={{ background: cls === 'pos' ? COLORS.positive : cls === 'neg' ? COLORS.negative : COLORS.neutral }} />
                      <span style={{ color: 'var(--text2)' }}>{labelOf(cls)}: </span>
                      <span style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>
                        {cls === 'pos' ? data.pos : cls === 'neg' ? data.neg : data.neu}
                      </span>
                    </div>
                  ))}
                  <div className={`overall-vibe ${data.overallCls}`} style={{ marginLeft: 'auto' }}>
                    <VibeEmoji cls={data.overallCls} />
                  </div>
                </div>
              </div>
            </div>

            {/* CHARTS */}
            <div className="chart-row">
              <div className="chart-card">
                <h3>Sentiment Breakdown</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => (
                        <Cell key={i} fill={Object.values(COLORS)[i]} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                      formatter={(v, n) => [v + ' posts', n]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="chart-card">
                <h3>Score Distribution</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                    <XAxis dataKey="range" tick={{ fill: 'var(--text2)', fontSize: 10 }} />
                    <YAxis tick={{ fill: 'var(--text2)', fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)' }}
                    />
                    <Bar dataKey="count" fill="var(--accent)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* POSTS */}
            <div className="posts-section">
              <div className="posts-header">
                <h3>All Posts</h3>
                <div className="filter-tabs">
                  {['all', 'pos', 'neu', 'neg'].map(f => (
                    <button key={f} className={`filter-tab ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
                      {f === 'all' ? 'All' : labelOf(f)}
                    </button>
                  ))}
                </div>
              </div>
              {filtered.map((post, i) => (
                <a key={i} className="post-item" href={post.url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', color: 'inherit', display: 'flex' }}>
                  <div className={`post-sentiment ${post.cls}`} />
                  <div className="post-content">
                    <div className="post-title">{post.title}</div>
                    <div className="post-meta">
                      <span>👆 {post.ups.toLocaleString()}</span>
                      <span>💬 {post.comments.toLocaleString()}</span>
                      <span>u/{post.author}</span>
                    </div>
                  </div>
                  <div className={`post-score ${post.cls}`}>
                    {post.score > 0 ? '+' : ''}{post.score}
                  </div>
                </a>
              ))}
            </div>
          </>
        )}

        {/* EMPTY STATE */}
        {!data && !loading && !error && (
          <div className="empty-state">
            <div className="empty-icon">🔍</div>
            <h2>Enter a subreddit to begin</h2>
            <p>We'll fetch the top 50 hot posts and analyze the sentiment of each title.</p>
          </div>
        )}
      </main>
    </div>
  )
}
