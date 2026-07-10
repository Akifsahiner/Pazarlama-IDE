# FAZ 12 — Piyasa (Market)

**Önkoşul:** Faz 1–11 production doğrulaması tamamlandı.  
**Ship modeli:** 4 bağımsız epic — tek PR değil, sıralı rollout.

## North Star (Faz 12 sonrası)

| Epic | Kullanıcı vaadi |
|------|-----------------|
| **12A Hosted tier** | Kayıt ol → anında backend; ücretsiz = scan + preview |
| **12B Team mode** | Çoklu kullanıcı onay + müşteri raporu paylaşımı |
| **12C Connector marketplace** | Meta read, LinkedIn, HubSpot — tek Settings kataloğu |
| **12D Eval loop** | Thumbs → kalite dashboard → skill tuning sinyali |

---

## 12A — Hosted tier

### Tier matrisi

| Tier | AI plan | Agent | Browser | Quota (plan/agent/browser min) |
|------|---------|-------|---------|------------------------------|
| `free` | ❌ | ❌ | ❌ | 0 / 0 / 0 |
| `pro` | ✅ | ✅ | ✅ | 20 / 200 / 30 |
| `team` | ✅ | ✅ | ✅ | 60 / 600 / 90 |
| `enterprise` | ✅ | ✅ | ✅ | 200 / 2000 / 300 |

### Server

- `server/src/tier/tiers.ts` — tier tanımları + feature flags
- `server/src/middleware/tierGate.ts` — `assertTierFeature(userId, feature)`
- `profiles.getOrCreate` — tier’a göre quota seed
- AI route’ları: `/plan`, `/agent`, `/anthropic/*`, `/browser` öncesi tier gate

### Desktop

- `desktop/src/shared/tierFeatures.ts` — client mirror
- `TierGateBanner` — upgrade CTA
- `/me` → `tier` + `features` render

### Çıkış kriterleri

- [ ] Free tier signed-in kullanıcı AI route’larına 403 alır (`tier_required`)
- [ ] Offline scan + preview outline çalışır (local, tier’dan bağımsız)
- [ ] Pro tier mevcut quota davranışını korur

---

## 12B — Team mode

### Şema (`0007_faz12_market.sql`)

- `organizations` — id, name, owner_id, tier default team
- `org_members` — org_id, user_id, role (`owner`|`admin`|`editor`|`approver`|`viewer`)
- `project_members` — project_id, user_id, role
- `approval_requests` — cross-user onay kuyruğu
- `report_shares` — paylaşılabilir client report token

### API

| Route | Açıklama |
|-------|----------|
| `GET/POST /team/org` | Org + üyeler |
| `POST /team/invites` | Davet token |
| `GET/POST /team/approvals` | Onay kuyruğu |
| `POST /reports/share` | Session report → share link |
| `GET /reports/shared/:token` | Public read-only HTML |

### Desktop

- Settings → **Team** sekmesi
- `TeamApprovalQueue` — bekleyen onaylar
- Session report → **Share with client**

### Çıkış kriterleri

- [ ] İki kullanıcı aynı projede `editor` rolüyle görünür
- [ ] `approver` rolü edit run’ı onaylayabilir
- [ ] Share link 30 gün geçerli, auth gerektirmez

---

## 12C — Connector marketplace

### Katalog

| Connector | Scope | Agent tool | OAuth env |
|-----------|-------|------------|-----------|
| GA4 | read | `ga4_query` | `GOOGLE_OAUTH_*` |
| Meta Ads | read | `meta_ads_read` | `META_OAUTH_*` |
| LinkedIn | read | — (v1 status) | `LINKEDIN_OAUTH_*` |
| HubSpot | read | — (v1 status) | `HUBSPOT_OAUTH_*` |

### Server

- `connectors/catalog.ts` — marketplace metadata
- `connectors/meta.ts` + `metaAdsQuery.ts`
- `connectors/linkedin.ts`, `connectors/hubspot.ts`
- `GET /connectors/catalog` — tüm connector kartları
- Generic `/connectors/:provider/connect|callback|sync`

### Desktop

- Settings → **Connectors** marketplace grid
- Performance + Ads yüzeylerinde bağlantı durumu

### Çıkış kriterleri

- [ ] Meta OAuth env varken connect → sync → snapshot
- [ ] Env yokken 501 + dürüst mesaj (GA4 pattern)
- [ ] Marketplace UI 4 connector kartı gösterir

---

## 12D — Eval loop

### Şema

`feedback_events` — user_id, target_kind, target_id, rating (-1|1), comment, skill_id, discipline, created_at

### API

| Route | Açıklama |
|-------|----------|
| `POST /feedback` | Thumb up/down |
| `GET /quality/summary` | Skill/discipline aggregate (30d) |

### Desktop

- `FeedbackThumbs` — decision + run complete kartlarında
- Settings → **Quality** — aggregate dashboard

### Çıkış kriterleri

- [ ] Thumb persist edilir (persistence on)
- [ ] Quality dashboard skill bazlı ortalama gösterir
- [ ] `server/evals/` CI yeşil kalır

---

## Rollout sırası

1. **12A** — tier gate (hosted billing öncesi feature truth)
2. **12C** — connector marketplace (yüksek görünürlük)
3. **12D** — feedback + quality (prod sinyal)
4. **12B** — team (en büyük şema değişikliği)

## Bilinçli dışarıda (Faz 12 sonrası)

- Stripe checkout otomasyonu (tier manuel veya webhook stub)
- Meta **publish** OAuth (read-only v1)
- Unsupervised bulk send
