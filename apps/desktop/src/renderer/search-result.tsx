import type { ReactNode } from 'react'

type SearchResult = {
  profileId: string
  platform: 'whatsapp' | 'telegram'
  conversationId: string
  conversationTitle: string
  messageId: string
  sender: string
  text: string
  translatedText?: string
  timestamp: string
}

type SearchResultViewProps = {
  query: string
  results: SearchResult[]
  profiles: Array<{ id: string; name: string; provider: string }>
  onOpen: (result: SearchResult) => void
}

function providerLabel(platform: SearchResult['platform']) {
  return platform === 'whatsapp' ? 'WhatsApp' : 'Telegram'
}

export function SearchResultView({ query, results, profiles, onOpen }: SearchResultViewProps): ReactNode {
  if (!query.trim()) {
    return <section className="search-page"><div className="search-empty"><strong>Search everywhere</strong><span>Search across all Profiles and providers.</span></div></section>
  }

  return <section className="search-page">
    <div className="page-heading">
      <div><h2>Search</h2><p>{results.length} result{results.length === 1 ? '' : 's'} across Profiles</p></div>
    </div>
    <div className="search-results">
      {results.map((result) => {
        const profile = profiles.find((item) => item.id === result.profileId)
        return <button key={`${result.profileId}:${result.conversationId}:${result.messageId}`} className="search-result" onClick={() => onOpen(result)}>
          <div className="search-result-top"><strong>{result.conversationTitle}</strong><span>{providerLabel(result.platform)} · {profile?.name ?? result.profileId}</span></div>
          <div className="search-result-sender">{result.sender}</div>
          <div className="search-result-text">{result.text}</div>
          {result.translatedText && <div className="search-result-translation">{result.translatedText}</div>}
          <div className="search-result-time">{new Date(result.timestamp).toLocaleString()}</div>
        </button>
      })}
      {results.length === 0 && <div className="empty-state">No messages found.</div>}
    </div>
  </section>
}
