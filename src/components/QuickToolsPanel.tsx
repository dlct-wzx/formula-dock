import { useEffect, useMemo, useState } from 'react'
import { ChevronDown, Clock3, CornerDownLeft, Search } from 'lucide-react'
import {
  quickToolCategories,
  quickToolCount,
  type QuickToolCategory,
  type QuickToolItem,
} from '../data/quickTools'
import { InlineMath } from './MathMarkup'
import { useI18n } from '../i18n/I18nContext'
import {
  localisedQuickCategory,
  localisedQuickGroupTitle,
  localisedQuickItemLabel,
} from '../i18n/content'

interface QuickToolsPanelProps {
  onInsert: (latex: string, cursorBack?: number) => void
}

interface IndexedItem {
  item: QuickToolItem
  category: QuickToolCategory
  groupTitle: string
}

const RECENT_STORAGE_KEY = 'formuladock:recent-tools'
const LEGACY_RECENT_STORAGE_KEY = 'latexlive-studio:recent-tools'

function itemCount(category: QuickToolCategory): number {
  return category.groups.reduce((total, group) => total + group.items.length, 0)
}

export function QuickToolsPanel({ onInsert }: QuickToolsPanelProps) {
  const { locale, t } = useI18n()
  const [query, setQuery] = useState('')
  const [openCategories, setOpenCategories] = useState<Set<string>>(() => new Set())
  const [recentIds, setRecentIds] = useState<string[]>([])

  useEffect(() => {
    try {
      const stored =
        localStorage.getItem(RECENT_STORAGE_KEY) || localStorage.getItem(LEGACY_RECENT_STORAGE_KEY)
      if (stored) {
        const ids = JSON.parse(stored) as string[]
        setRecentIds(ids)
        localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(ids))
        localStorage.removeItem(LEGACY_RECENT_STORAGE_KEY)
      }
    } catch {
      setRecentIds([])
    }
  }, [])

  const indexedItems = useMemo<IndexedItem[]>(
    () =>
      quickToolCategories.flatMap((category) =>
        category.groups.flatMap((group) =>
          group.items.map((item) => ({ item, category, groupTitle: group.title })),
        ),
      ),
    [],
  )

  const itemById = useMemo(
    () =>
      new Map(
        indexedItems.map(({ item, category, groupTitle }) => [
          item.id,
          { item, category, groupTitle },
        ]),
      ),
    [indexedItems],
  )

  const recentItems = recentIds
    .map((id) => itemById.get(id))
    .filter((entry): entry is IndexedItem => Boolean(entry))
    .slice(0, 10)

  const normalisedQuery = query.trim().toLowerCase()
  const searchResults = useMemo(() => {
    if (!normalisedQuery) return []
    return indexedItems.filter(({ item, category, groupTitle }) => {
      const localisedCategory = localisedQuickCategory(category, locale)
      const localisedGroup = localisedQuickGroupTitle(groupTitle, locale)
      const localisedLabel = localisedQuickItemLabel(item, locale)
      const haystack =
        `${item.label} ${localisedLabel} ${item.latex} ${category.title} ${localisedCategory.title} ${groupTitle} ${localisedGroup}`.toLowerCase()
      return haystack.includes(normalisedQuery)
    })
  }, [indexedItems, locale, normalisedQuery])

  const rememberItem = (item: QuickToolItem) => {
    const next = [item.id, ...recentIds.filter((id) => id !== item.id)].slice(0, 12)
    setRecentIds(next)
    try {
      localStorage.setItem(RECENT_STORAGE_KEY, JSON.stringify(next))
    } catch {
      // Local storage is optional.
    }
  }

  const insertItem = (item: QuickToolItem) => {
    onInsert(item.latex, item.cursorBack)
    rememberItem(item)
  }

  const toggleCategory = (categoryId: string) => {
    setOpenCategories((previous) => {
      const next = new Set(previous)
      if (next.has(categoryId)) next.delete(categoryId)
      else next.add(categoryId)
      return next
    })
  }

  return (
    <div className="tool-panel quick-tools-panel">
      <div className="panel-search-row">
        <label className="search-field">
          <Search size={16} aria-hidden="true" />
          <span className="sr-only">{t('quick.searchAria')}</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={t('quick.searchPlaceholder')}
          />
          {query && <kbd>{searchResults.length}</kbd>}
        </label>
        <span className="panel-count">{t('quick.count', { count: quickToolCount })}</span>
      </div>

      {recentItems.length > 0 && !normalisedQuery && (
        <section className="recent-strip" aria-labelledby="recent-tools-title">
          <div className="section-kicker" id="recent-tools-title">
            <Clock3 size={14} aria-hidden="true" />
            {t('quick.recent')}
          </div>
          <div className="recent-items">
            {recentItems.map(({ item }) => (
              <button
                key={item.id}
                type="button"
                className="recent-item"
                onClick={() => insertItem(item)}
                title={`${localisedQuickItemLabel(item, locale)} · ${item.latex}`}
              >
                <InlineMath latex={item.latex} />
                <span>{localisedQuickItemLabel(item, locale)}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {normalisedQuery ? (
        <section className="quick-search-results" aria-live="polite">
          <div className="section-heading">
            <div>
              <span className="section-kicker">{t('quick.results')}</span>
              <h3>“{query.trim()}”</h3>
            </div>
            <span className="section-note">{t('quick.clickInsert')}</span>
          </div>
          {searchResults.length > 0 ? (
            <div className="quick-item-grid quick-item-grid--search">
              {searchResults.map(({ item, category, groupTitle }) => (
                <button
                  key={item.id}
                  type="button"
                  className="quick-item"
                  onClick={() => insertItem(item)}
                  title={`${localisedQuickItemLabel(item, locale)} · ${localisedQuickCategory(category, locale).title} / ${localisedQuickGroupTitle(groupTitle, locale)} · ${item.latex}`}
                >
                  <span className="quick-item__math">
                    <InlineMath latex={item.latex} />
                  </span>
                  <span className="quick-item__label">
                    {localisedQuickItemLabel(item, locale)}
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="empty-state empty-state--compact">
              <Search size={24} aria-hidden="true" />
              <p>{t('quick.noResults')}</p>
            </div>
          )}
        </section>
      ) : (
        <div className="quick-category-grid">
          {quickToolCategories.map((category, categoryIndex) => {
            const isOpen = openCategories.has(category.id)
            const localisedCategory = localisedQuickCategory(category, locale)
            return (
              <article
                className={`quick-category ${isOpen ? 'quick-category--open' : ''}`}
                key={category.id}
              >
                <button
                  type="button"
                  className="quick-category__toggle"
                  onClick={() => toggleCategory(category.id)}
                  aria-expanded={isOpen}
                  aria-controls={`category-panel-${category.id}`}
                >
                  <span className="category-index">
                    {String(categoryIndex + 1).padStart(2, '0')}
                  </span>
                  <span className="category-symbol" aria-hidden="true">
                    {category.symbol}
                  </span>
                  <span className="category-copy">
                    <strong>{localisedCategory.title}</strong>
                    <small>{localisedCategory.description}</small>
                  </span>
                  <span className="category-count">{itemCount(category)}</span>
                  <ChevronDown size={17} className="category-chevron" aria-hidden="true" />
                </button>

                {isOpen && (
                  <div className="quick-category__body" id={`category-panel-${category.id}`}>
                    {category.groups.map((group) => (
                      <section className="quick-group" key={`${category.id}-${group.title}`}>
                        <div className="quick-group__title">
                          <span>{localisedQuickGroupTitle(group.title, locale)}</span>
                          <span>{String(group.items.length).padStart(2, '0')}</span>
                        </div>
                        <div className="quick-item-grid">
                          {group.items.map((item) => (
                            <button
                              key={item.id}
                              type="button"
                              className="quick-item"
                              onClick={() => insertItem(item)}
                              title={`${localisedQuickItemLabel(item, locale)} · ${item.latex}`}
                            >
                              <span className="quick-item__math">
                                <InlineMath latex={item.latex} />
                              </span>
                              <span className="quick-item__label">
                                {localisedQuickItemLabel(item, locale)}
                              </span>
                            </button>
                          ))}
                        </div>
                      </section>
                    ))}
                    <div className="quick-category__footer">
                      <CornerDownLeft size={14} aria-hidden="true" />
                      {t('quick.insertHint')}
                    </div>
                  </div>
                )}
              </article>
            )
          })}
        </div>
      )}
    </div>
  )
}
