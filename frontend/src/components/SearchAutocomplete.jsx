/**
 * SearchAutocomplete.jsx — GeoServe Smart Search v1.0
 *
 * Real-time autocomplete for the User Dashboard search bar.
 * Suggestions are grouped into three sections:
 *   1. Categories  — matched by name (supports any future category automatically)
 *   2. Workers     — matched by worker name
 *   3. Skills      — matched by worker skills array
 *
 * When a category suggestion is selected:
 *   • The search input is cleared
 *   • onCategorySelect(categoryId) fires → parent sets catFilter
 *
 * When a worker or skill suggestion is selected:
 *   • The search input is filled with the item's label
 *   • The parent's search filter takes effect naturally
 *
 * Keyboard navigation: ArrowUp / ArrowDown to move, Enter to select, Escape to close.
 * All text matches are highlighted with <mark> tags.
 * Fully accessible: role="listbox", role="option", aria-selected, aria-expanded.
 */

import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import { useTranslation } from "react-i18next";
import Icon, { CategoryLabel } from "./Icon";
import { getLocalizedName } from "../utils/localizedName";

/* ── How many of each group to show ───────────────────────────── */
const MAX_CATS    = 5;
const MAX_WORKERS = 4;
const MAX_SKILLS  = 3;

/* ── Highlight the matching substring ─────────────────────────── */
function Highlight({ text, query }) {
  if (!query) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="gs-ac-mark">{text.slice(idx, idx + query.length)}</mark>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ── Group label row ───────────────────────────────────────────── */
function GroupLabel({ icon, label }) {
  return (
    <div className="gs-ac-group-label" aria-hidden="true">
      <Icon name={icon} size={11} color="var(--muted)" />
      <span>{label}</span>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
export default function SearchAutocomplete({
  value          = "",
  onChange,
  categories     = [],
  workers        = [],
  onCategorySelect,   // (categoryId: string) => void
  placeholder    = "Search…",
}) {
  const { t, i18n } = useTranslation();
  const [open,      setOpen]      = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);

  const inputRef   = useRef(null);
  const dropRef    = useRef(null);
  const containerRef = useRef(null);

  /* ── Build flat suggestions list ───────────────────────────── */
  const suggestions = useMemo(() => {
    const q = (value || "").trim().toLowerCase();
    if (!q) return [];

    /* 1 — Categories */
    const catMatches = categories
      .filter(c => c.name.toLowerCase().includes(q))
      .slice(0, MAX_CATS)
      .map(c => ({ type: "category", id: c.id, name: c.name, icon: c.icon, label: c.name }));

    /* 2 — Workers (unique workers only; matched across both English and
           displayed in the currently selected app language) */
    const seenWorkerIds = new Set();
    const workerMatches = workers
      .filter(w => {
        if (seenWorkerIds.has(w.id)) return false;
        const nm   = (w.name   || "").toLowerCase();
        const nmEn = (w.nameEn || "").toLowerCase();
        const isMatch = nm.includes(q) || nmEn.includes(q) ;
        if (!isMatch) return false;
        seenWorkerIds.add(w.id);
        return true;
      })
      .slice(0, MAX_WORKERS)
      .map(w => {
        const cat = categories.find(c => c.id === w.categoryId);
        const displayName = getLocalizedName(w, i18n.language) || w.name || "";
        return {
          type:    "worker",
          id:      w.id,
          name:    displayName,
          catName: cat?.name || "",
          label:   displayName,
        };
      });

    /* 3 — Skills (unique keywords across all workers) */
    const seenSkills = new Set();
    const skillMatches = [];
    for (const w of workers) {
      if (!Array.isArray(w.skills)) continue;
      for (const s of w.skills) {
        const sl = s.toLowerCase();
        if (sl.includes(q) && !seenSkills.has(sl)) {
          seenSkills.add(sl);
          skillMatches.push({ type: "skill", name: s, label: s });
          if (skillMatches.length >= MAX_SKILLS) break;
        }
      }
      if (skillMatches.length >= MAX_SKILLS) break;
    }

    return [...catMatches, ...workerMatches, ...skillMatches];
  }, [value, categories, workers, i18n.language]);

  /* ── Open / close based on suggestions ─────────────────────── */
  useEffect(() => {
    if (suggestions.length > 0 && (value || "").trim()) {
      setOpen(true);
      setActiveIdx(-1);
    } else {
      setOpen(false);
    }
  }, [suggestions.length, value]);

  /* ── Close on outside click ─────────────────────────────────── */
  useEffect(() => {
    const handler = (e) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target)
      ) {
        setOpen(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* ── Select an item ─────────────────────────────────────────── */
  const handleSelect = useCallback((item) => {
    if (item.type === "category") {
      // Clear search, activate category chip filter
      onChange("");
      onCategorySelect?.(String(item.id));
    } else {
      // Fill search with the item label
      onChange(item.label);
    }
    setOpen(false);
    setActiveIdx(-1);
    // Return focus to input after a tiny delay so the blur→blur chain settles
    setTimeout(() => inputRef.current?.focus(), 0);
  }, [onChange, onCategorySelect]);

  /* ── Keyboard navigation ─────────────────────────────────────── */
  const handleKeyDown = (e) => {
    if (!open || suggestions.length === 0) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx(i => Math.max(i - 1, -1));
        break;
      case "Enter":
        if (activeIdx >= 0) {
          e.preventDefault();
          handleSelect(suggestions[activeIdx]);
        }
        break;
      case "Escape":
        setOpen(false);
        setActiveIdx(-1);
        break;
      default:
        break;
    }
  };

  /* ── Scroll active item into view ───────────────────────────── */
  useEffect(() => {
    if (activeIdx < 0 || !dropRef.current) return;
    const active = dropRef.current.querySelector(`[data-idx="${activeIdx}"]`);
    active?.scrollIntoView({ block: "nearest" });
  }, [activeIdx]);

  /* ── Group splits for rendering ─────────────────────────────── */
  const cats    = suggestions.filter(s => s.type === "category");
  const wrks    = suggestions.filter(s => s.type === "worker");
  const skills  = suggestions.filter(s => s.type === "skill");

  const q = (value || "").trim();

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div
      ref={containerRef}
      className="gs-search-autocomplete"
      role="combobox"
      aria-expanded={open}
      aria-haspopup="listbox"
      aria-owns="gs-ac-listbox"
    >
      {/* Search icon */}
      <span className="gs-ac-search-icon" aria-hidden="true">
        <Icon name="search" size={15} color="var(--muted-light)" />
      </span>

      {/* Input */}
      <input
        ref={inputRef}
        id="gs-search-input"
        className={`gs-ac-input${open ? " gs-ac-input--open" : ""}`}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => suggestions.length > 0 && setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        aria-label={placeholder}
        aria-controls="gs-ac-listbox"
        aria-activedescendant={activeIdx >= 0 ? `gs-ac-opt-${activeIdx}` : undefined}
      />

      {/* Clear button — appears when there is any text */}
      {value && (
        <button
          className="gs-ac-clear"
          onMouseDown={(e) => {
            e.preventDefault(); // prevent input blur before clearing
            onChange("");
            setOpen(false);
            setActiveIdx(-1);
            inputRef.current?.focus();
          }}
          aria-label={t("search.clear", { defaultValue: "Clear search" })}
          tabIndex={-1}
        >
          <Icon name="x" size={13} color="var(--muted)" />
        </button>
      )}

      {/* Dropdown */}
      {open && suggestions.length > 0 && (
        <div
          ref={dropRef}
          id="gs-ac-listbox"
          className="gs-ac-dropdown"
          role="listbox"
          aria-label={t("search.suggestions", { defaultValue: "Search suggestions" })}
        >

          {/* ── Categories group ── */}
          {cats.length > 0 && (
            <div className="gs-ac-group">
              <GroupLabel
                icon="grid"
                label={t("search.groupCategories", { defaultValue: "Categories" })}
              />
              {cats.map(item => {
                const idx = suggestions.indexOf(item);
                return (
                  <button
                    key={`cat-${item.id}`}
                    id={`gs-ac-opt-${idx}`}
                    data-idx={idx}
                    className={`gs-ac-item${idx === activeIdx ? " gs-ac-item--active" : ""}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="gs-ac-item-icon gs-ac-item-icon--cat">
                      <CategoryLabel name={item.name} icon={item.icon} size={15} color="var(--primary)" showName={false} />
                    </span>
                    <span className="gs-ac-item-text">
                      <Highlight text={item.name} query={q} />
                    </span>
                    <span className="gs-ac-badge gs-ac-badge--cat">
                      {t("search.tagCategory", { defaultValue: "Category" })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Workers group ── */}
          {wrks.length > 0 && (
            <div className="gs-ac-group">
              <GroupLabel
                icon="users"
                label={t("search.groupWorkers", { defaultValue: "Workers" })}
              />
              {wrks.map(item => {
                const idx = suggestions.indexOf(item);
                return (
                  <button
                    key={`wrk-${item.id}`}
                    id={`gs-ac-opt-${idx}`}
                    data-idx={idx}
                    className={`gs-ac-item${idx === activeIdx ? " gs-ac-item--active" : ""}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="gs-ac-item-icon gs-ac-item-icon--worker">
                      <Icon name="user" size={14} color="var(--muted)" />
                    </span>
                    <span className="gs-ac-item-text">
                      <Highlight text={item.name} query={q} />
                    </span>
                    {item.catName && (
                      <span className="gs-ac-badge gs-ac-badge--worker">
                        {item.catName}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* ── Skills group ── */}
          {skills.length > 0 && (
            <div className="gs-ac-group">
              <GroupLabel
                icon="zap"
                label={t("search.groupSkills", { defaultValue: "Skills" })}
              />
              {skills.map(item => {
                const idx = suggestions.indexOf(item);
                return (
                  <button
                    key={`skl-${item.name}`}
                    id={`gs-ac-opt-${idx}`}
                    data-idx={idx}
                    className={`gs-ac-item${idx === activeIdx ? " gs-ac-item--active" : ""}`}
                    role="option"
                    aria-selected={idx === activeIdx}
                    onMouseDown={e => { e.preventDefault(); handleSelect(item); }}
                    onMouseEnter={() => setActiveIdx(idx)}
                  >
                    <span className="gs-ac-item-icon gs-ac-item-icon--skill">
                      <Icon name="zap" size={14} color="var(--amber)" />
                    </span>
                    <span className="gs-ac-item-text">
                      <Highlight text={item.name} query={q} />
                    </span>
                    <span className="gs-ac-badge gs-ac-badge--skill">
                      {t("search.tagSkill", { defaultValue: "Skill" })}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Footer hint */}
          <div className="gs-ac-footer" aria-hidden="true">
            <Icon name="arrow-up" size={10} color="var(--muted-light)" />
            <Icon name="arrow-down" size={10} color="var(--muted-light)" />
            <span>{t("search.keyHint", { defaultValue: "navigate" })}</span>
            <span className="gs-ac-footer-sep" />
            <span className="gs-ac-kbd">↵</span>
            <span>{t("search.selectHint", { defaultValue: "select" })}</span>
            <span className="gs-ac-footer-sep" />
            <span className="gs-ac-kbd">Esc</span>
            <span>{t("search.dismissHint", { defaultValue: "dismiss" })}</span>
          </div>
        </div>
      )}
    </div>
  );
}
