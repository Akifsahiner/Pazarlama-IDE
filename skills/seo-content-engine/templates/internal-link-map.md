# Internal link graph template

Map hub → spoke → conversion. Update in repo as you ship cluster.

```
HOME (/)
├── /docs                    [hub — highest trust]
│   ├── /docs/getting-started → /compare/you-vs-competitor-a
│   ├── /docs/integrations    → /alternatives/competitor-a-alternatives
│   └── /docs/api             → /signup?utm_source=docs
├── /blog                    [hub — informational]
│   ├── /blog/how-to-[job]    → /alternatives/... (commercial)
│   └── /blog/changelog-*     → /docs (not competing commercial URL)
├── /alternatives/[x]        [commercial spoke]
│   ├── → /compare/you-vs-a
│   ├── → /compare/you-vs-b
│   └── → /signup
├── /compare/you-vs-a        [commercial spoke]
│   ├── → /alternatives/[x]
│   └── → /docs/getting-started
└── /compare/you-vs-b
```

## Rules
1. Every commercial page: ≥2 inbound internal links before index request
2. Every docs article: 1 commercial + 1 product link max in body
3. Blog changelog: never cannibalize comparison keywords
4. Footer: persistent link to primary alternatives page

## Acceptance
- [ ] 0 orphan URLs in cluster (crawl from hub in Screaming Frog or manual)
- [ ] Anchor text varies (not all "click here")
- [ ] UTM only on external campaigns — internal links clean
