import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Building2, FolderOpen, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/services/api';

interface SearchResult {
  id: string;
  type: 'property' | 'project' | 'contractor';
  title: string;
  subtitle?: string;
  href: string;
}

export default function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  const search = useCallback(async (q: string) => {
    if (!q.trim()) { setResults([]); return; }
    setLoading(true);
    try {
      const [props, projs, conts] = await Promise.allSettled([
        api.get('/v1/properties', { params: { search: q, limit: 3 } }),
        api.get('/v1/projects', { params: { search: q, limit: 3 } }),
        api.get('/v1/contractors', { params: { search: q, limit: 3 } }),
      ]);

      const r: SearchResult[] = [];
      if (props.status === 'fulfilled') {
        props.value.data.data?.forEach((p: any) => r.push({ id: p.id, type: 'property', title: p.name, subtitle: `${p.city}, ${p.state}`, href: `/properties/${p.id}` }));
      }
      if (projs.status === 'fulfilled') {
        projs.value.data.data?.forEach((p: any) => r.push({ id: p.id, type: 'project', title: p.name, subtitle: p.properties?.name, href: `/projects/${p.id}` }));
      }
      if (conts.status === 'fulfilled') {
        conts.value.data.data?.forEach((c: any) => r.push({ id: c.id, type: 'contractor', title: c.company_name, subtitle: c.specialties?.join(', '), href: `/contractors/${c.id}` }));
      }
      setResults(r);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  const icons = { property: <Building2 className="w-4 h-4" />, project: <FolderOpen className="w-4 h-4" />, contractor: <Users className="w-4 h-4" /> };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-2 rounded-lg border border-[var(--border-default)] bg-[var(--bg-elevated)] px-3 h-8 text-sm text-[var(--text-tertiary)] hover:border-[var(--border-strong)] transition-colors w-48"
      >
        <Search className="w-3.5 h-3.5" />
        <span>Search…</span>
        <kbd className="ml-auto text-2xs bg-[var(--bg-overlay)] rounded px-1 py-0.5">⌘K</kbd>
      </button>

      <AnimatePresence>
        {open && (
          <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -12, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.97 }}
              transition={{ duration: 0.15 }}
              className="relative w-full max-w-lg rounded-2xl border border-[var(--border-default)] bg-[var(--bg-surface)] shadow-overlay overflow-hidden"
            >
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border-subtle)]">
                <Search className="w-4 h-4 text-[var(--text-tertiary)] flex-shrink-0" />
                <input
                  autoFocus
                  type="text"
                  placeholder="Search properties, projects, contractors…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  className="flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                />
              </div>
              <div className="max-h-80 overflow-y-auto">
                {loading && <div className="py-4 text-center text-sm text-[var(--text-tertiary)]">Searching…</div>}
                {!loading && results.length === 0 && query && (
                  <div className="py-8 text-center text-sm text-[var(--text-tertiary)]">No results for "{query}"</div>
                )}
                {results.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { navigate(r.href); setOpen(false); setQuery(''); }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-[var(--bg-elevated)] transition-colors text-left"
                  >
                    <span className="text-[var(--text-tertiary)]">{icons[r.type]}</span>
                    <div>
                      <p className="text-sm text-[var(--text-primary)]">{r.title}</p>
                      {r.subtitle && <p className="text-xs text-[var(--text-tertiary)]">{r.subtitle}</p>}
                    </div>
                    <span className="ml-auto text-2xs text-[var(--text-tertiary)] capitalize">{r.type}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
