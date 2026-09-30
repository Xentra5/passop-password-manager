import { useState } from 'react'

/**
 * Extracts a clean, normalized domain from any URL or string.
 * e.g. "https://www.youtube.com/watch?v=123" -> "youtube.com"
 */
export function extractDomain(urlOrSite) {
  if (!urlOrSite || typeof urlOrSite !== 'string') return ''
  let cleaned = urlOrSite.trim()
  if (!cleaned) return ''

  if (!/^https?:\/\//i.test(cleaned)) {
    cleaned = 'https://' + cleaned
  }

  try {
    const url = new URL(cleaned)
    return url.hostname.replace(/^www\./i, '').toLowerCase()
  } catch {
    const match = urlOrSite.replace(/^https?:\/\/(www\.)?/i, '').split('/')[0].split('?')[0]
    return match ? match.toLowerCase() : ''
  }
}

/**
 * Deterministic color generator for avatar fallback
 */
export function getDomainColor(domain) {
  if (!domain) return { bg: 'bg-slate-700', text: 'text-slate-200', border: 'border-slate-600' }
  const palettes = [
    { bg: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' },
    { bg: 'bg-sky-500/15 text-sky-700 border-sky-500/30' },
    { bg: 'bg-indigo-500/15 text-indigo-700 border-indigo-500/30' },
    { bg: 'bg-purple-500/15 text-purple-700 border-purple-500/30' },
    { bg: 'bg-rose-500/15 text-rose-700 border-rose-500/30' },
    { bg: 'bg-amber-500/15 text-amber-700 border-amber-500/30' },
    { bg: 'bg-teal-500/15 text-teal-700 border-teal-500/30' },
    { bg: 'bg-cyan-500/15 text-cyan-700 border-cyan-500/30' },
    { bg: 'bg-blue-500/15 text-blue-700 border-blue-500/30' },
  ]
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = (hash << 5) - hash + domain.charCodeAt(i)
    hash |= 0
  }
  return palettes[Math.abs(hash) % palettes.length]
}

/**
 * Expanded list of curated popular services for quick-add chips
 */
export const POPULAR_SERVICES = [
  { name: 'Google', domain: 'google.com', defaultUrl: 'https://google.com', category: 'Tech' },
  { name: 'YouTube', domain: 'youtube.com', defaultUrl: 'https://youtube.com', category: 'Entertainment' },
  { name: 'GitHub', domain: 'github.com', defaultUrl: 'https://github.com', category: 'Developer' },
  { name: 'X / Twitter', domain: 'x.com', defaultUrl: 'https://x.com', category: 'Social' },
  { name: 'Netflix', domain: 'netflix.com', defaultUrl: 'https://netflix.com', category: 'Entertainment' },
  { name: 'Spotify', domain: 'spotify.com', defaultUrl: 'https://spotify.com', category: 'Music' },
  { name: 'Discord', domain: 'discord.com', defaultUrl: 'https://discord.com', category: 'Social' },
  { name: 'ChatGPT', domain: 'chatgpt.com', defaultUrl: 'https://chatgpt.com', category: 'AI' },
  { name: 'Claude', domain: 'claude.ai', defaultUrl: 'https://claude.ai', category: 'AI' },
  { name: 'Amazon', domain: 'amazon.com', defaultUrl: 'https://amazon.com', category: 'Shopping' },
  { name: 'Figma', domain: 'figma.com', defaultUrl: 'https://figma.com', category: 'Design' },
  { name: 'Notion', domain: 'notion.so', defaultUrl: 'https://notion.so', category: 'Productivity' },
  { name: 'Slack', domain: 'slack.com', defaultUrl: 'https://slack.com', category: 'Work' },
  { name: 'LinkedIn', domain: 'linkedin.com', defaultUrl: 'https://linkedin.com', category: 'Work' },
  { name: 'Steam', domain: 'steampowered.com', defaultUrl: 'https://store.steampowered.com', category: 'Gaming' },
  { name: 'PayPal', domain: 'paypal.com', defaultUrl: 'https://paypal.com', category: 'Finance' },
]

/**
 * Comprehensive Famous Brands with Crisp Authentic SVGs
 */
export const FAMOUS_BRANDS = {
  youtube: {
    name: 'YouTube',
    category: 'Entertainment',
    match: /(^|\.)(youtube\.com|youtu\.be)$/i,
    renderIcon: () => (
      <svg className="w-full h-full" viewBox="0 0 24 24" fill="none">
        <rect width="24" height="24" rx="6" fill="#FF0000" />
        <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="white" />
      </svg>
    ),
  },
  google: {
    name: 'Google',
    category: 'Search & Productivity',
    match: /(^|\.)(google\.[a-z.]+|gmail\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-white" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.8-2.4 3.66v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.15z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.94H1.24v3.13C3.26 21.36 7.33 24 12 24z" />
        <path fill="#FBBC05" d="M5.28 14.26c-.25-.72-.38-1.49-.38-2.26s.13-1.54.38-2.26V6.61H1.24C.45 8.19 0 9.99 0 12s.45 3.81 1.24 5.39l4.04-3.13z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.24 6.61l4.04 3.13c.95-2.84 3.6-4.99 6.72-4.99z" />
      </svg>
    ),
  },
  github: {
    name: 'GitHub',
    category: 'Developer',
    match: /(^|\.)github\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#1e2327] text-white" viewBox="0 0 24 24" fill="currentColor">
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
      </svg>
    ),
  },
  openai: {
    name: 'ChatGPT',
    category: 'AI',
    match: /(^|\.)(openai\.com|chatgpt\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#10A37F]" viewBox="0 0 24 24" fill="none">
        <path d="M20.2 10.3A5.4 5.4 0 0 0 19 6.2a5.4 5.4 0 0 0-4.8-2.6 5.5 5.5 0 0 0-1.8.3A5.4 5.4 0 0 0 7.8 5a5.4 5.4 0 0 0-3.6 2.6 5.4 5.4 0 0 0 .5 6.2 5.4 5.4 0 0 0 1.2 4.1 5.4 5.4 0 0 0 4.8 2.6c.6 0 1.2-.1 1.8-.3a5.4 5.4 0 0 0 4.6-1.1 5.4 5.4 0 0 0 3.6-2.6 5.4 5.4 0 0 0-.5-6.2zm-7.8 9.3a4.2 4.2 0 0 1-2.4-.7l.1-.1 3.5-2a.6.6 0 0 0 .3-.5v-4.4l1.3.8v3.9a4.2 4.2 0 0 1-2.8 3zm-6.2-3.1a4.2 4.2 0 0 1-.5-2.5l.1.1 3.5 2a.6.6 0 0 0 .6 0l3.8-2.2v1.5l-3.4 2a4.2 4.2 0 0 1-4.1-.9zm-1.8-6.5a4.2 4.2 0 0 1 1.9-1.7v4.1a.6.6 0 0 0 .3.5l3.8 2.2-1.3.8-3.4-2a4.2 4.2 0 0 1-1.3-3.9zm11.7 1.8l-3.8-2.2 1.3-.8 3.4 2a4.2 4.2 0 0 1 1.3 3.9 4.2 4.2 0 0 1-1.9 1.7v-4.1a.6.6 0 0 0-.3-.5zm1.8-2.2l-.1-.1-3.5-2a.6.6 0 0 0-.6 0l-3.8 2.2v-1.5l3.4-2a4.2 4.2 0 0 1 4.1.9c.3.5.5 1.1.5 1.7v.8zm-7.5-1.9a4.2 4.2 0 0 1 2.4.7l-.1.1-3.5 2a.6.6 0 0 0-.3.5v4.4l-1.3-.8V8.7a4.2 4.2 0 0 1 2.8-3zm-.7 4.9l1.8-1 1.8 1v2.1l-1.8 1-1.8-1v-2.1z" fill="white" />
      </svg>
    ),
  },
  claude: {
    name: 'Claude',
    category: 'AI',
    match: /(^|\.)(anthropic\.com|claude\.ai)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#D97757]" viewBox="0 0 24 24" fill="none">
        <path d="M12 2L13.8 8.6L19.5 5.5L16.4 11.2L23 13L16.4 14.8L19.5 20.5L13.8 17.4L12 24L10.2 17.4L4.5 20.5L7.6 14.8L1 13L7.6 11.2L4.5 5.5L10.2 8.6L12 2Z" fill="white" />
      </svg>
    ),
  },
  twitter: {
    name: 'X (Twitter)',
    category: 'Social',
    match: /(^|\.)(x\.com|twitter\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1.5 bg-black text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
      </svg>
    ),
  },
  facebook: {
    name: 'Facebook',
    category: 'Social',
    match: /(^|\.)(facebook\.com|fb\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full bg-[#1877F2]" viewBox="0 0 24 24" fill="none">
        <path d="M16.5 12H13.5V21H9.75V12H8V8.75H9.75V6.75C9.75 4.54 11.1 3 13.78 3C15.06 3 16 3.1 16 3.1V5.9H14.61C13.51 5.9 13.5 6.44 13.5 7.15V8.75H16.25L16.5 12Z" fill="white" />
      </svg>
    ),
  },
  instagram: {
    name: 'Instagram',
    category: 'Social',
    match: /(^|\.)instagram\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1" viewBox="0 0 24 24" fill="none">
        <defs>
          <radialGradient id="instaGrad2" cx="30%" cy="107%" r="150%">
            <stop offset="0%" stopColor="#fdf497" />
            <stop offset="45%" stopColor="#fd5949" />
            <stop offset="60%" stopColor="#d6249f" />
            <stop offset="90%" stopColor="#285AEB" />
          </radialGradient>
        </defs>
        <rect width="24" height="24" rx="6" fill="url(#instaGrad2)" />
        <rect x="5.5" y="5.5" width="13" height="13" rx="3.5" stroke="white" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="3.2" stroke="white" strokeWidth="1.8" />
        <circle cx="15.8" cy="8.2" r="1" fill="white" />
      </svg>
    ),
  },
  linkedin: {
    name: 'LinkedIn',
    category: 'Professional',
    match: /(^|\.)linkedin\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full bg-[#0A66C2]" viewBox="0 0 24 24" fill="none">
        <path d="M6.5 9H9V17H6.5V9ZM7.75 5.5C8.58 5.5 9.25 6.17 9.25 7C9.25 7.83 8.58 8.5 7.75 8.5C6.92 8.5 6.25 7.83 6.25 7C6.25 6.17 6.92 5.5 7.75 5.5ZM10.5 9H13V10.1C13.4 9.4 14.3 8.8 15.6 8.8C18.2 8.8 18.7 10.5 18.7 12.8V17H16.2V13.2C16.2 12.3 16.2 11.1 14.9 11.1C13.6 11.1 13.4 12.1 13.4 13.1V17H10.9V9H10.5Z" fill="white" />
      </svg>
    ),
  },
  netflix: {
    name: 'Netflix',
    category: 'Entertainment',
    match: /(^|\.)netflix\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#141414]" viewBox="0 0 24 24" fill="none">
        <path d="M7 5H10V19H7V5Z" fill="#B81D24" />
        <path d="M14 5H17V19H14V5Z" fill="#B81D24" />
        <path d="M7 5L17 19H14L7 8.5V5Z" fill="#E50914" />
      </svg>
    ),
  },
  spotify: {
    name: 'Spotify',
    category: 'Music',
    match: /(^|\.)spotify\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5 bg-[#121212]" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#1DB954" />
        <path d="M17.5 10.2C14.2 8.2 8.8 8.0 5.6 9.0C5.1 9.2 4.6 8.9 4.4 8.4C4.3 7.9 4.6 7.4 5.1 7.2C8.8 6.1 14.8 6.3 18.6 8.6C19.1 8.9 19.2 9.5 18.9 10.0C18.6 10.4 18.0 10.5 17.5 10.2ZM17.4 13.0C17.1 13.4 16.6 13.5 16.2 13.3C13.4 11.6 9.2 11.1 6.0 12.1C5.6 12.2 5.1 12.0 5.0 11.6C4.8 11.2 5.1 10.7 5.5 10.6C9.2 9.4 13.8 10.0 17.0 12.0C17.4 12.2 17.5 12.7 17.4 13.0ZM16.3 15.8C16.1 16.1 15.7 16.2 15.3 16.0C13.0 14.6 9.9 14.3 6.4 15.1C6.0 15.2 5.7 14.9 5.6 14.6C5.5 14.2 5.8 13.9 6.1 13.8C10.0 12.9 13.4 13.3 16.0 14.9C16.3 15.1 16.4 15.5 16.3 15.8Z" fill="#121212" />
      </svg>
    ),
  },
  discord: {
    name: 'Discord',
    category: 'Communication',
    match: /(^|\.)(discord\.com|discord\.gg)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#5865F2]" viewBox="0 0 24 24" fill="none">
        <path d="M18.8 6.5C17.5 5.9 16.1 5.5 14.6 5.3C14.4 5.7 14.2 6.1 14.0 6.6C12.4 6.4 10.8 6.4 9.2 6.6C9.0 6.1 8.8 5.7 8.6 5.3C7.1 5.5 5.7 5.9 4.4 6.5C2.0 10.1 1.4 13.6 1.7 17.0C3.4 18.2 5.0 19.0 6.5 19.5C6.9 19.0 7.3 18.4 7.6 17.8C7.0 17.6 6.5 17.3 6.0 17.0C6.1 16.9 6.2 16.8 6.4 16.7C9.6 18.2 13.1 18.2 16.3 16.7C16.4 16.8 16.6 16.9 16.7 17.0C16.2 17.3 15.6 17.6 15.1 17.8C15.4 18.4 15.8 19.0 16.2 19.5C17.7 19.0 19.3 18.2 21.0 17.0C21.4 13.0 20.3 9.6 18.8 6.5ZM8.5 15.0C7.5 15.0 6.7 14.1 6.7 13.0C6.7 11.9 7.5 11.0 8.5 11.0C9.5 11.0 10.3 11.9 10.3 13.0C10.3 14.1 9.5 15.0 8.5 15.0ZM14.7 15.0C13.7 15.0 12.9 14.1 12.9 13.0C12.9 11.9 13.7 11.0 14.7 11.0C15.7 11.0 16.5 11.9 16.5 13.0C16.5 14.1 15.7 15.0 14.7 15.0Z" fill="white" />
      </svg>
    ),
  },
  reddit: {
    name: 'Reddit',
    category: 'Social',
    match: /(^|\.)reddit\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#FF4500" />
        <path d="M19.5 12C19.5 11.2 18.8 10.5 18 10.5C17.5 10.5 17.1 10.7 16.8 11.0C15.7 10.3 14.2 9.8 12.5 9.7L13.5 5.5L16.5 6.2C16.6 6.8 17.1 7.2 17.8 7.2C18.6 7.2 19.2 6.6 19.2 5.8C19.2 5.0 18.6 4.4 17.8 4.4C17.2 4.4 16.6 4.8 16.5 5.4L13.1 4.6C12.9 4.6 12.7 4.7 12.6 4.9L11.5 9.7C9.8 9.8 8.3 10.3 7.2 11.0C6.9 10.7 6.5 10.5 6 10.5C5.2 10.5 4.5 11.2 4.5 12C4.5 12.6 4.9 13.1 5.4 13.3C5.3 13.6 5.3 13.8 5.3 14.1C5.3 16.5 8.3 18.4 12 18.4C15.7 18.4 18.7 16.5 18.7 14.1C18.7 13.8 18.7 13.6 18.6 13.3C19.1 13.1 19.5 12.6 19.5 12ZM9 12.8C9.6 12.8 10.1 13.3 10.1 13.9C10.1 14.5 9.6 15 9 15C8.4 15 7.9 14.5 7.9 13.9C7.9 13.3 8.4 12.8 9 12.8ZM14.4 16.6C13.7 17.0 12.9 17.1 12 17.1C11.1 17.1 10.3 17.0 9.6 16.6C9.4 16.5 9.4 16.2 9.5 16.1C9.6 15.9 9.9 15.9 10.1 16.0C10.6 16.3 11.3 16.4 12 16.4C12.7 16.4 13.4 16.3 13.9 16.0C14.1 15.9 14.4 15.9 14.5 16.1C14.6 16.2 14.6 16.5 14.4 16.6ZM15 15.0C14.4 15.0 13.9 14.5 13.9 13.9C13.9 13.3 14.4 12.8 15 12.8C15.6 12.8 16.1 13.3 16.1 13.9C16.1 14.5 15.6 15.0 15 15.0Z" fill="white" />
      </svg>
    ),
  },
  amazon: {
    name: 'Amazon',
    category: 'Shopping',
    match: /(^|\.)amazon\.[a-z.]+$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#232F3E]" viewBox="0 0 24 24" fill="none">
        <path d="M17.8 16.5C14.5 18.7 9.8 18.7 6.4 16.8C5.9 16.5 6.4 15.9 6.8 16.1C9.8 17.8 14.1 17.8 17.2 15.6C17.6 15.3 18.1 15.9 17.8 16.5Z" fill="#FF9900" />
        <path d="M18.7 15.2C18.4 14.8 16.8 15.1 16.1 15.3C15.9 15.3 15.9 15.1 16.1 15.0C17.1 14.2 18.7 13.8 18.9 14.2C19.1 14.6 18.8 16.2 17.9 17.1C17.7 17.3 17.6 17.2 17.7 17.0C18.0 16.5 18.9 15.7 18.7 15.2Z" fill="#FF9900" />
        <path d="M12.9 8.2C12.9 8.9 12.9 9.6 12.8 10.3C12.1 10.1 11.3 10.0 10.6 10.2C9.5 10.5 8.9 11.3 9.0 12.2C9.1 13.1 9.9 13.7 11.0 13.6C11.9 13.5 12.6 12.9 12.9 12.1C13.0 12.7 13.4 13.2 14.1 13.2C14.5 13.2 14.8 13.0 15.0 12.8L14.7 11.9C14.5 12.0 14.4 12.1 14.2 12.1C13.9 12.1 13.8 11.8 13.8 11.3V8.8C13.8 7.7 13.2 7.0 11.9 7.0C10.7 7.0 9.8 7.6 9.5 8.5L10.5 8.9C10.7 8.3 11.2 7.9 11.8 7.9C12.5 7.9 12.9 8.2 12.9 8.8V8.2ZM12.9 11.4C12.6 12.0 12.0 12.5 11.2 12.6C10.6 12.7 10.1 12.3 10.1 11.7C10.0 11.2 10.4 10.8 11.0 10.7C11.6 10.6 12.3 10.7 12.9 11.0V11.4Z" fill="white" />
      </svg>
    ),
  },
  apple: {
    name: 'Apple',
    category: 'Tech',
    match: /(^|\.)(apple\.com|icloud\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-black text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.84c.62-.75 1.04-1.8 0.92-2.84-.9.04-1.99.6-2.63 1.35-.57.65-1.07 1.72-.94 2.74 1 .08 2.03-.5 2.65-1.25z" />
      </svg>
    ),
  },
  microsoft: {
    name: 'Microsoft',
    category: 'Tech & Cloud',
    match: /(^|\.)(microsoft\.com|live\.com|outlook\.com|office\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1.5 bg-white" viewBox="0 0 24 24">
        <rect x="2" y="2" width="9" height="9" fill="#F25022" rx="1" />
        <rect x="13" y="2" width="9" height="9" fill="#7FBA00" rx="1" />
        <rect x="2" y="13" width="9" height="9" fill="#00A4EF" rx="1" />
        <rect x="13" y="13" width="9" height="9" fill="#FFB900" rx="1" />
      </svg>
    ),
  },
  figma: {
    name: 'Figma',
    category: 'Design',
    match: /(^|\.)figma\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#1E1E1E]" viewBox="0 0 24 24">
        <path d="M8 12a4 4 0 1 1 0-8h4v8H8z" fill="#F24E1E" />
        <path d="M12 4h4a4 4 0 1 1 0 8h-4V4z" fill="#FF7262" />
        <path d="M12 12h4a4 4 0 1 1 0 8h-4v-8z" fill="#1ABCFE" />
        <path d="M8 20a4 4 0 1 1 4-4v4H8z" fill="#0ACF83" />
        <path d="M8 12a4 4 0 1 1 4-4v8a4 4 0 0 1-4-4z" fill="#A259FF" />
      </svg>
    ),
  },
  notion: {
    name: 'Notion',
    category: 'Productivity',
    match: /(^|\.)(notion\.so|notion\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-black text-white" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l11.203-.794c.42-.046.887-.233.887.234v13.535c0 .7-.28 1.073-1.073 1.166l-12.043.7c-.7.047-.98-.28-.98-.84V4.768c0-.373.187-.56.578-.56zm4.11 3.267v8.914l4.573-6.44v6.44h1.774V7.475l-4.713 6.44v-6.44H8.569z" />
      </svg>
    ),
  },
  slack: {
    name: 'Slack',
    category: 'Communication',
    match: /(^|\.)slack\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-white" viewBox="0 0 24 24">
        <path d="M6 15a2 2 0 1 1-2-2h2v2zm1 0a2 2 0 1 1 4 0v5a2 2 0 1 1-4 0v-5z" fill="#E01E5A" />
        <path d="M9 6a2 2 0 1 1 2-2v2H9zm0 1a2 2 0 1 1 0 4H4a2 2 0 1 1 0-4h5z" fill="#36C5F0" />
        <path d="M18 9a2 2 0 1 1 2 2h-2V9zm-1 0a2 2 0 1 1-4 0V4a2 2 0 1 1 4 0v5z" fill="#2EB67D" />
        <path d="M15 18a2 2 0 1 1-2 2v-2h2zm0-1a2 2 0 1 1 0-4h5a2 2 0 1 1 0 4h-5z" fill="#ECB22E" />
      </svg>
    ),
  },
  steam: {
    name: 'Steam',
    category: 'Gaming',
    match: /(^|\.)(steampowered\.com|steamcommunity\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#171a21]" viewBox="0 0 24 24" fill="white">
        <path d="M12 2C6.47 2 2 6.47 2 12c0 4.54 3.03 8.37 7.18 9.55l2.45-3.5a3.5 3.5 0 0 1-.63-1.05l-4.5 1.83A7.95 7.95 0 0 1 4 12c0-4.41 3.59-8 8-8s8 3.59 8 8c0 4.14-3.16 7.55-7.19 7.96l-2.31-3.32a3.5 3.5 0 0 1 .5-.64l3.5-.88a2.5 2.5 0 1 0-.96-1.74l-3.32.83a3.5 3.5 0 1 1-4.72 1.34l-3.23 1.32A10 10 0 1 1 12 2z" />
      </svg>
    ),
  },
  paypal: {
    name: 'PayPal',
    category: 'Finance',
    match: /(^|\.)paypal\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#003087]" viewBox="0 0 24 24" fill="white">
        <path d="M7.5 4h6.2c2.8 0 4.8 1.4 4.3 4.4-.4 2.8-2.5 4.6-5.3 4.6h-2l-1 6.5H5.8L7.5 4zm4.8 6.5c1.4 0 2.4-.8 2.6-2.1.2-1.3-.6-2.1-2-2.1H9.8l-.7 4.2h3.2z" fill="#0079C1" />
        <path d="M9.5 8h6.2c2.8 0 4.8 1.4 4.3 4.4-.4 2.8-2.5 4.6-5.3 4.6h-2l-1 6.5H7.8L9.5 8zm4.8 6.5c1.4 0 2.4-.8 2.6-2.1.2-1.3-.6-2.1-2-2.1h-3.1l-.7 4.2h3.2z" fill="#00457C" />
      </svg>
    ),
  },
  stripe: {
    name: 'Stripe',
    category: 'Finance',
    match: /(^|\.)stripe\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full bg-[#635BFF]" viewBox="0 0 24 24" fill="white">
        <path d="M14.5 10.2c0-.8-.7-1.3-1.8-1.3-1.6 0-3.6.5-5.2 1.4V6.2C9.2 5.5 11.2 5 12.7 5c3.7 0 6 1.8 6 5.1 0 4.9-6.8 4.2-6.8 6.3 0 .9.8 1.2 2 1.2 1.8 0 4-.7 5.7-1.7v4.1c-1.8.8-3.9 1.2-5.7 1.2-3.8 0-6.3-1.9-6.3-5.2 0-5.3 6.9-4.5 6.9-5.8z" />
      </svg>
    ),
  },
  shopify: {
    name: 'Shopify',
    category: 'E-Commerce',
    match: /(^|\.)shopify\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#95BF47]" viewBox="0 0 24 24" fill="white">
        <path d="M18.8 6.2c-.1-.1-.3-.1-.4 0l-1.5.5c-.4-.9-1-1.7-1.7-2.3-.9-.7-2-1.1-3.2-1.1-.2 0-.3 0-.5.1C11.3 3.6 11 4 10.8 4.6c-.3.8-.3 1.7-.1 2.5L7.9 8.2c-.3.1-.4.4-.3.7l2.8 11.3c.1.3.3.4.6.4h8.3c.3 0 .5-.2.6-.4l3.1-13.4c0-.3-.1-.5-.4-.6h-.1zm-5.7-1.5c.7.2 1.4.6 1.8 1.2l-3.3 1.1c.1-.8.6-1.7 1.5-2.3z" />
      </svg>
    ),
  },
  tiktok: {
    name: 'TikTok',
    category: 'Social',
    match: /(^|\.)tiktok\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-black" viewBox="0 0 24 24">
        <path d="M16.5 4a5.5 5.5 0 0 0 4 1.8V9a8 8 0 0 1-4-1.2v6.6a5.4 5.4 0 1 1-5.4-5.4c.5 0 1 .1 1.4.2v3.1a2.4 2.4 0 1 0 1.5 2.1V4h2.5z" fill="#25F4EE" />
        <path d="M15.5 5a5.5 5.5 0 0 0 4 1.8V10a8 8 0 0 1-4-1.2v6.6a5.4 5.4 0 1 1-5.4-5.4c.5 0 1 .1 1.4.2v3.1a2.4 2.4 0 1 0 1.5 2.1V5h2.5z" fill="#FE2C55" />
        <path d="M16 4.5a5.5 5.5 0 0 0 4 1.8V9.5a8 8 0 0 1-4-1.2v6.6a5.4 5.4 0 1 1-5.4-5.4c.5 0 1 .1 1.4.2v3.1a2.4 2.4 0 1 0 1.5 2.1V4.5h2.5z" fill="white" />
      </svg>
    ),
  },
  pinterest: {
    name: 'Pinterest',
    category: 'Social',
    match: /(^|\.)pinterest\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#E60023" />
        <path d="M12 4a8 8 0 0 0-2.8 15.5c0-.6.1-1.6.3-2.3l1-4.2s-.3-.5-.3-1.3c0-1.2.7-2.1 1.6-2.1.8 0 1.1.6 1.1 1.3 0 .8-.5 1.9-.8 3-.2.9.5 1.6 1.4 1.6 1.7 0 2.8-2.1 2.8-4.7 0-2-1.4-3.5-3.8-3.5-2.7 0-4.4 2-4.4 4.3 0 .8.3 1.6.7 2.1.1.1.1.2 0 .4l-.3 1.1c0 .2-.2.2-.3.1-1.5-.7-2.2-2.5-2.2-4.1 0-3 2.5-6.6 7.5-6.6 4 0 6.6 2.9 6.6 6 0 4.1-2.3 7.1-5.7 7.1-1.1 0-2.2-.6-2.6-1.3l-.7 2.7c-.3 1-1 2.3-1.5 3.1A8 8 0 1 0 12 4z" fill="white" />
      </svg>
    ),
  },
  snapchat: {
    name: 'Snapchat',
    category: 'Social',
    match: /(^|\.)snapchat\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#FFFC00]" viewBox="0 0 24 24">
        <path d="M12 4.5c-2.4 0-4.3 1.8-4.3 4.2 0 .5.1 1.1.2 1.6-.6.2-1.3.6-1.5 1.2-.2.6.2 1.2.8 1.4-.1.4-.4.8-.8 1.1-.3.3-.5.7-.3 1.1.2.4.7.5 1.2.4.4-.1 1.1-.5 1.7-.5.5 0 .9.2 1.3.5.8.6 1.4.6 1.7.6s.9 0 1.7-.6c.4-.3.8-.5 1.3-.5.6 0 1.3.4 1.7.5.5.1 1 0 1.2-.4.2-.4 0-.8-.3-1.1-.4-.3-.7-.7-.8-1.1.6-.2 1-.8.8-1.4-.2-.6-.9-1-1.5-1.2.1-.5.2-1.1.2-1.6 0-2.4-1.9-4.2-4.3-4.2z" fill="white" stroke="black" strokeWidth="1.2" />
      </svg>
    ),
  },
  twitch: {
    name: 'Twitch',
    category: 'Streaming',
    match: /(^|\.)twitch\.tv$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#9146FF]" viewBox="0 0 24 24" fill="none">
        <path d="M4.5 3.5L3 7.5V19.5H7.5V22.5L10.5 19.5H14L20.5 13V3.5H4.5ZM19 12L16 15H13L10.5 17.5V15H7.5V5H19V12ZM16 7.5H14.5V12.5H16V7.5ZM11.5 7.5H10V12.5H11.5V7.5Z" fill="white" />
      </svg>
    ),
  },
  telegram: {
    name: 'Telegram',
    category: 'Communication',
    match: /(^|\.)(telegram\.org|t\.me)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#24A1DE" />
        <path d="M17.5 7.5L5.5 12.1C4.7 12.4 4.7 12.9 5.3 13.1L8.4 14.1L15.6 9.6C15.9 9.4 16.2 9.5 16.0 9.7L10.2 15.0H10.1L10.1 15.1L9.9 17.8C10.2 17.8 10.3 17.7 10.5 17.5L12.0 16.0L15.1 18.3C15.7 18.6 16.1 18.5 16.3 17.8L18.3 8.3C18.5 7.5 18.0 7.1 17.5 7.5Z" fill="white" />
      </svg>
    ),
  },
  whatsapp: {
    name: 'WhatsApp',
    category: 'Communication',
    match: /(^|\.)whatsapp\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#25D366" />
        <path d="M16.5 14.1C16.3 14.0 14.9 13.3 14.7 13.2C14.4 13.1 14.3 13.1 14.1 13.3C13.9 13.6 13.5 14.1 13.3 14.3C13.2 14.4 13.1 14.5 12.8 14.3C12.6 14.2 11.9 13.9 11.0 13.1C10.3 12.5 9.8 11.7 9.7 11.5C9.6 11.2 9.7 11.1 9.8 11.0C9.9 10.9 10.0 10.7 10.2 10.6C10.3 10.4 10.3 10.3 10.4 10.1C10.5 9.9 10.4 9.8 10.4 9.7C10.3 9.6 9.8 8.4 9.6 7.9C9.4 7.4 9.2 7.5 9.1 7.5C8.9 7.5 8.7 7.5 8.6 7.5C8.4 7.5 8.1 7.6 7.9 7.8C7.6 8.1 7.0 8.7 7.0 9.8C7.0 11.0 7.9 12.1 8.0 12.3C8.1 12.4 9.7 14.9 12.2 16.0C14.0 16.8 14.7 16.8 15.4 16.6C16.1 16.5 17.1 15.9 17.3 15.2C17.5 14.6 17.5 14.0 17.4 13.9C17.3 13.8 17.1 13.7 16.8 13.6L16.5 14.1Z" fill="white" />
      </svg>
    ),
  },
  zoom: {
    name: 'Zoom',
    category: 'Communication',
    match: /(^|\.)zoom\.us$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#2D8CFF]" viewBox="0 0 24 24" fill="white">
        <rect x="4" y="7" width="11" height="10" rx="2" />
        <path d="M16 10.5l4-3v9l-4-3v-3z" />
      </svg>
    ),
  },
  dropbox: {
    name: 'Dropbox',
    category: 'Storage',
    match: /(^|\.)dropbox\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#0061FF]" viewBox="0 0 24 24" fill="white">
        <path d="M6 6l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zM6 14l6 4-6 4-6-4 6-4zm12 0l6 4-6 4-6-4 6-4zm-6 4.5l6-4 6 4-6 4-6-4z" />
      </svg>
    ),
  },
  docker: {
    name: 'Docker',
    category: 'Developer',
    match: /(^|\.)docker\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#0DB7ED]" viewBox="0 0 24 24" fill="white">
        <rect x="7" y="9" width="2" height="2" rx="0.3" />
        <rect x="10" y="9" width="2" height="2" rx="0.3" />
        <rect x="13" y="9" width="2" height="2" rx="0.3" />
        <rect x="10" y="6" width="2" height="2" rx="0.3" />
        <rect x="13" y="6" width="2" height="2" rx="0.3" />
        <path d="M22 13c-.3 0-1.4.1-2 .7-.6-.4-1.6-.5-2.5-.2-.4-1.2-1.3-1.5-1.5-1.5H3.5C2.5 12 2 13.5 2 15c0 3 3 5 8 5 5.5 0 9.5-3 10-7h2z" />
      </svg>
    ),
  },
  gitlab: {
    name: 'GitLab',
    category: 'Developer',
    match: /(^|\.)gitlab\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#FC6D26]" viewBox="0 0 24 24">
        <path d="M22.65 14.39L20.61 8.1a.7.7 0 0 0-1.33 0l-2.04 6.29H6.76L4.72 8.1a.7.7 0 0 0-1.33 0L1.35 14.39a1 1 0 0 0 .36 1.12l10.29 7.49 10.29-7.49a1 1 0 0 0 .36-1.12z" fill="#E24329" />
        <path d="M12 23l-5.24-8.61h10.48L12 23z" fill="#FC6D26" />
        <path d="M12 23l-5.24-8.61H1.35L12 23z" fill="#FCA326" />
        <path d="M12 23l5.24-8.61h5.41L12 23z" fill="#FCA326" />
      </svg>
    ),
  },
  vercel: {
    name: 'Vercel',
    category: 'Developer',
    match: /(^|\.)vercel\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1.5 bg-black" viewBox="0 0 24 24" fill="white">
        <path d="M12 3L22 20H2L12 3Z" />
      </svg>
    ),
  },
  adobe: {
    name: 'Adobe',
    category: 'Design',
    match: /(^|\.)adobe\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#FA0F00]" viewBox="0 0 24 24" fill="white">
        <path d="M14.5 4H20v16l-5.5-16zM9.5 4H4v16l5.5-16zM12 11.5l3.2 8.5h-2.5l-1.1-3H9.4l1.8-4.5h.8z" />
      </svg>
    ),
  },
  canva: {
    name: 'Canva',
    category: 'Design',
    match: /(^|\.)canva\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#00C4CC" />
        <path d="M14.5 9c-.5-.8-1.5-1.2-2.5-1.2-2.2 0-3.8 1.8-3.8 4.2 0 2.5 1.6 4.2 3.8 4.2 1.1 0 2.1-.5 2.6-1.3l-1.2-.9c-.3.5-.8.8-1.4.8-1.4 0-2.3-1.1-2.3-2.8s.9-2.8 2.3-2.8c.6 0 1.1.3 1.4.8l1.1-.9z" fill="white" />
      </svg>
    ),
  },
  disney: {
    name: 'Disney+',
    category: 'Entertainment',
    match: /(^|\.)(disneyplus\.com|disney\.com)$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-1 bg-[#113CCF]" viewBox="0 0 24 24" fill="white">
        <path d="M12 6a7 7 0 0 0-7 7c0 2.8 1.6 5.2 4 6.3-.5-.8-.7-1.7-.7-2.6 0-3 2.4-5.4 5.4-5.4.8 0 1.6.2 2.3.5C15 8.7 13.6 6 12 6zm6.5 7h-2.5v-2.5h-1.5V13H12v1.5h2.5V17h1.5v-2.5h2.5V13z" />
      </svg>
    ),
  },
  coinbase: {
    name: 'Coinbase',
    category: 'Finance',
    match: /(^|\.)coinbase\.com$/i,
    renderIcon: () => (
      <svg className="w-full h-full p-0.5" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" fill="#0052FF" />
        <path d="M12 7a5 5 0 0 0-4.9 4H10a2.2 2.2 0 0 1 2-1.5 2.5 2.5 0 0 1 0 5 2.2 2.2 0 0 1-2-1.5H7.1A5 5 0 1 0 12 7z" fill="white" />
      </svg>
    ),
  },
}

/**
 * Returns matching famous brand metadata or null
 */
export function getFamousBrand(site) {
  const domain = extractDomain(site)
  if (!domain) return null

  for (const key of Object.keys(FAMOUS_BRANDS)) {
    const brand = FAMOUS_BRANDS[key]
    if (brand.match.test(domain)) {
      return { id: key, domain, ...brand }
    }
  }
  return null
}

/**
 * Primary SiteLogo Component:
 * 1. Checks if it's a known famous brand (renders authentic crisp SVG)
 * 2. If not, fetches favicon via Google Favicon API (128px high-res)
 * 3. Falls back to DuckDuckGo Favicon API
 * 4. Falls back to stylized deterministic gradient letter avatar
 */
export default function SiteLogo({ site, size = 'md', className = '', alt = '' }) {
  const [imgError, setImgError] = useState(false)
  const [fallbackTried, setFallbackTried] = useState(false)
  const domain = extractDomain(site)
  const famousBrand = getFamousBrand(site)

  const sizeClasses = {
    xs: 'w-5 h-5 text-[10px] rounded',
    sm: 'w-6 h-6 text-xs rounded-md',
    md: 'w-8 h-8 text-xs rounded-lg',
    lg: 'w-10 h-10 text-sm rounded-xl',
  }[size] || 'w-8 h-8 text-xs rounded-lg'

  // 1. If it's a famous brand, render authentic SVG directly (instant, crisp, zero latency!)
  if (famousBrand) {
    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden shadow-xs border border-black/10 ${sizeClasses} ${className}`}
        title={`${famousBrand.name} (${domain})`}
      >
        {famousBrand.renderIcon()}
      </div>
    )
  }

  // Fallback avatar letter
  const fallbackLetter = (domain ? domain[0] : (site ? site[0] : 'W')).toUpperCase()
  const domainColor = getDomainColor(domain)

  // 2. Dynamic CDN Favicon for any other website
  const googleFaviconUrl = domain ? `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=128` : null
  const duckDuckGoFaviconUrl = domain ? `https://icons.duckduckgo.com/ip3/${encodeURIComponent(domain)}.ico` : null

  if (domain && !imgError) {
    const currentSrc = fallbackTried ? duckDuckGoFaviconUrl : googleFaviconUrl

    return (
      <div
        className={`relative inline-flex items-center justify-center shrink-0 overflow-hidden bg-white shadow-xs border border-[#ddd8d0] p-1 ${sizeClasses} ${className}`}
        title={domain}
      >
        <img
          src={currentSrc}
          alt={alt || domain}
          loading="lazy"
          className="w-full h-full object-contain transition-opacity duration-200"
          onError={() => {
            if (!fallbackTried) {
              setFallbackTried(true)
            } else {
              setImgError(true)
            }
          }}
        />
      </div>
    )
  }

  // 3. Graceful fallback to styled initial badge
  return (
    <div
      className={`inline-flex items-center justify-center shrink-0 font-bold border ${domainColor.bg} ${sizeClasses} ${className}`}
      title={domain || site}
    >
      <span>{fallbackLetter}</span>
    </div>
  )
}
