# OutdoorIntel Community Platform Blueprint
# "The Reddit of the Outdoor World"

> A comprehensive technical spec for transforming OutdoorIntel.ca from a static content site
> into a community-driven platform with Reddit-style features and sustainable monetization.

---

## Table of Contents
1. [Concept Validation](#1-concept-validation)
2. [Architecture Overview](#2-architecture-overview)
3. [Tech Stack](#3-tech-stack)
4. [Database Schema](#4-database-schema)
5. [Feature Breakdown by Phase](#5-feature-breakdown-by-phase)
6. [API Design](#6-api-design)
7. [Community Structure ("Boards")](#7-community-structure-boards)
8. [Monetization Strategy](#8-monetization-strategy)
9. [Migration Plan](#9-migration-plan)
10. [Cost Estimates](#10-cost-estimates)

---

## 1. Concept Validation

### Why This Is a Good Idea

**The gap in the market:**
- Reddit outdoor subs are fragmented: r/Fishing (1.1M), r/CampingAndHiking (3.2M), r/hunting (425k), r/Kayaking, r/skiing — each isolated, none Canada-focused
- No single platform combines community discussion with structured location intelligence
- Outdoor enthusiasts actively want to share trip reports, conditions, and local knowledge
- Canada's outdoor recreation market is massive and underserved digitally

**OutdoorIntel's competitive advantages:**
- Already has 499+ verified spots with structured data (coordinates, species, seasons, regulations)
- 1,100+ SEO-optimized pages already indexed by Google
- Bilingual (EN/FR) — critical for Canadian market
- Spot data creates a natural "anchor" for community discussions (Reddit has no location layer)
- Each spot page is a ready-made community thread topic

**Key differentiator vs. Reddit:**
Reddit is generic text threads. OutdoorIntel would be **location-aware, activity-specific community discussions layered on top of structured outdoor intelligence** — think Reddit meets AllTrails meets iNaturalist.

### Risks to Manage

| Risk | Mitigation |
|------|------------|
| Cold-start problem (no users = no content) | Seed with curated content, cross-post from Reddit, invite known anglers/hunters |
| Moderation burden | Start with report-based moderation, add automod rules later |
| Spam/low-quality posts | Require email verification, karma thresholds for posting |
| Infrastructure costs before revenue | Use generous free tiers (Supabase, Vercel), scale only when needed |
| Competing with Reddit directly | Don't compete — complement. Focus on Canada + location data + structured intel |

---

## 2. Architecture Overview

### Hybrid Architecture: Static Content + Dynamic Community

```
┌─────────────────────────────────────────────────────┐
│                    VERCEL (Frontend)                 │
│                                                     │
│  ┌──────────────┐  ┌─────────────────────────────┐  │
│  │ Static Pages  │  │    Next.js App (Community)  │  │
│  │ (Existing)    │  │                             │  │
│  │ 1,100+ HTML   │  │  /community/*               │  │
│  │ Spot pages    │  │  /profile/*                 │  │
│  │ Blog posts    │  │  /auth/*                    │  │
│  │ Directories   │  │  /api/* (serverless)        │  │
│  └──────────────┘  └─────────────────────────────┘  │
│         │                       │                    │
│         │    Spot pages embed   │                    │
│         │◄── community widget ──┤                    │
│         │    (comments/votes)   │                    │
└─────────┴───────────────────────┴────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│                 SUPABASE (Backend)                   │
│                                                     │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  PostgreSQL  │ │   Auth   │ │  Realtime (WS)   │ │
│  │  Database    │ │  (OAuth  │ │  (live comments, │ │
│  │             │ │  + email)│ │   vote counts)   │ │
│  └─────────────┘ └──────────┘ └──────────────────┘ │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐ │
│  │  Storage    │ │   Edge   │ │  Row Level       │ │
│  │  (images)   │ │Functions │ │  Security (RLS)  │ │
│  └─────────────┘ └──────────┘ └──────────────────┘ │
└─────────────────────────────────────────────────────┘
```

### Why This Architecture?

1. **Preserve SEO**: The existing 1,100+ static pages keep their rankings untouched
2. **Incremental migration**: Add community features without rewriting the whole site
3. **Cost-effective**: Supabase free tier covers early growth (50k MAU, 500MB DB, 1GB storage)
4. **Vercel-native**: Next.js on Vercel gives you serverless APIs, edge functions, ISR
5. **Realtime capable**: Supabase Realtime for live vote counts and new comments

---

## 3. Tech Stack

### Recommended Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| **Frontend (new)** | Next.js 15 (App Router) | SSR for community pages, API routes, Vercel-native |
| **Frontend (existing)** | Static HTML (keep as-is) | Preserves SEO, zero migration risk |
| **Styling** | Tailwind CSS v4 | Already using Tailwind via CDN, upgrade to build step |
| **Auth** | Supabase Auth | OAuth (Google, GitHub, Apple) + email/password, free tier |
| **Database** | Supabase (PostgreSQL) | Free tier generous, RLS for security, Realtime built-in |
| **Storage** | Supabase Storage | User-uploaded photos (catch photos, trail pics) |
| **Hosting** | Vercel | Already deployed here, serverless functions included |
| **Search** | Supabase full-text search (pg_trgm) | Free, built into Postgres, upgrade to Meilisearch later |
| **Email** | Resend (free tier: 100/day) | Transactional emails (welcome, notifications) |
| **Analytics** | GA4 (existing) + PostHog (free) | Existing GA4 stays, PostHog for product analytics |

### Why Supabase over Firebase?

- **PostgreSQL** (relational) is better for Reddit-like data (posts → comments → votes with complex queries)
- **Row Level Security** means authorization logic lives in the database, not scattered across API routes
- **Generous free tier**: 50,000 monthly active users, 500MB database, 1GB file storage, 2GB bandwidth
- **Realtime subscriptions** for live vote counts and comment streams
- **Open source** — no vendor lock-in, can self-host later if needed

---

## 4. Database Schema

### Core Tables

```sql
-- ============================================
-- USERS & PROFILES
-- ============================================

-- Supabase Auth handles the auth.users table automatically.
-- This is our public profile extension:

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  province TEXT,                          -- Home province
  favorite_activities TEXT[],             -- ['fishing', 'hiking', 'camping']
  karma_posts INTEGER DEFAULT 0,
  karma_comments INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,      -- Verified guide/outfitter
  is_moderator BOOLEAN DEFAULT FALSE,
  language_preference TEXT DEFAULT 'en',  -- 'en' or 'fr'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- BOARDS (like subreddits)
-- ============================================

CREATE TABLE boards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,              -- 'fishing', 'hunting', 'camping', etc.
  name TEXT NOT NULL,                     -- 'Fishing'
  name_fr TEXT,                           -- 'Pêche'
  description TEXT,
  description_fr TEXT,
  icon_url TEXT,
  banner_url TEXT,
  color TEXT,                             -- Board accent color
  member_count INTEGER DEFAULT 0,
  post_count INTEGER DEFAULT 0,
  activity_type TEXT,                     -- Maps to existing activity categories
  rules JSONB,                            -- Board-specific rules
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- POSTS
-- ============================================

CREATE TYPE post_type AS ENUM ('discussion', 'trip_report', 'question', 'photo', 'gear_review', 'conditions_update');

CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  spot_id TEXT,                           -- Links to existing spot slug (e.g., 'lake-superior')
  spot_activity TEXT,                     -- Activity type for the spot ('fishing', 'hiking', etc.)

  title TEXT NOT NULL,
  body TEXT,                              -- Markdown content
  post_type post_type DEFAULT 'discussion',
  language TEXT DEFAULT 'en',

  -- Media
  image_urls TEXT[],                      -- User-uploaded photos
  link_url TEXT,                          -- External link (like Reddit link posts)

  -- Trip report specific fields
  trip_date DATE,
  conditions JSONB,                       -- { weather: 'sunny', water_temp: '18C', ice_thickness: '12in' }
  species_caught TEXT[],                  -- For fishing trip reports
  gear_used TEXT[],

  -- Scoring
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,               -- upvotes - downvotes (denormalized for sorting)
  comment_count INTEGER DEFAULT 0,
  hot_score FLOAT DEFAULT 0,             -- Reddit-style hot ranking algorithm

  -- Status
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  is_removed BOOLEAN DEFAULT FALSE,
  removed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast queries
CREATE INDEX idx_posts_board_hot ON posts(board_id, hot_score DESC) WHERE NOT is_removed;
CREATE INDEX idx_posts_board_new ON posts(board_id, created_at DESC) WHERE NOT is_removed;
CREATE INDEX idx_posts_board_top ON posts(board_id, score DESC) WHERE NOT is_removed;
CREATE INDEX idx_posts_spot ON posts(spot_id, spot_activity) WHERE spot_id IS NOT NULL;
CREATE INDEX idx_posts_author ON posts(author_id);

-- ============================================
-- COMMENTS (threaded, like Reddit)
-- ============================================

CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  author_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE, -- NULL = top-level comment

  body TEXT NOT NULL,                     -- Markdown
  language TEXT DEFAULT 'en',

  -- Scoring
  upvotes INTEGER DEFAULT 0,
  downvotes INTEGER DEFAULT 0,
  score INTEGER DEFAULT 0,

  -- Nesting
  depth INTEGER DEFAULT 0,               -- 0 = top-level, 1 = reply, 2 = reply-to-reply, etc.
  path TEXT,                              -- Materialized path for efficient tree queries (e.g., '001.003.007')

  -- Status
  is_removed BOOLEAN DEFAULT FALSE,
  removed_reason TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_post ON comments(post_id, path) WHERE NOT is_removed;
CREATE INDEX idx_comments_author ON comments(author_id);

-- ============================================
-- VOTES
-- ============================================

CREATE TABLE post_votes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),  -- -1 = downvote, 1 = upvote
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);

CREATE TABLE comment_votes (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  value SMALLINT NOT NULL CHECK (value IN (-1, 1)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, comment_id)
);

-- ============================================
-- BOARD MEMBERSHIPS
-- ============================================

CREATE TABLE board_members (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'member',             -- 'member', 'moderator', 'admin'
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, board_id)
);

-- ============================================
-- NOTIFICATIONS
-- ============================================

CREATE TYPE notification_type AS ENUM (
  'comment_reply', 'post_comment', 'post_upvote', 'mention', 'moderation'
);

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,                              -- URL to navigate to
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_user ON notifications(user_id, is_read, created_at DESC);

-- ============================================
-- REPORTS (moderation)
-- ============================================

CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID REFERENCES profiles(id),
  post_id UUID REFERENCES posts(id),
  comment_id UUID REFERENCES comments(id),
  reason TEXT NOT NULL,
  details TEXT,
  status TEXT DEFAULT 'pending',          -- 'pending', 'reviewed', 'actioned', 'dismissed'
  reviewed_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- SAVED POSTS & BOOKMARKS
-- ============================================

CREATE TABLE saved_posts (
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, post_id)
);
```

### Row Level Security Policies (Critical)

```sql
-- Profiles: users can read all, update only their own
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles" ON profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Posts: anyone can read non-removed, authenticated users can create
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read posts" ON posts FOR SELECT USING (NOT is_removed OR author_id = auth.uid());
CREATE POLICY "Create posts" ON posts FOR INSERT WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Update own posts" ON posts FOR UPDATE USING (auth.uid() = author_id);

-- Votes: one vote per user per post (enforced by PK + RLS)
ALTER TABLE post_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Read votes" ON post_votes FOR SELECT USING (true);
CREATE POLICY "Create vote" ON post_votes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update vote" ON post_votes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Delete vote" ON post_votes FOR DELETE USING (auth.uid() = user_id);

-- Same pattern for comment_votes, comments, etc.
```

### Database Functions (Hot Ranking)

```sql
-- Reddit-style hot ranking algorithm
-- Based on: score magnitude + time decay
CREATE OR REPLACE FUNCTION calculate_hot_score(ups INTEGER, downs INTEGER, created TIMESTAMPTZ)
RETURNS FLOAT AS $$
DECLARE
  s INTEGER;
  order_val FLOAT;
  sign_val INTEGER;
  seconds FLOAT;
BEGIN
  s := ups - downs;
  order_val := log(greatest(abs(s), 1));
  IF s > 0 THEN sign_val := 1;
  ELSIF s < 0 THEN sign_val := -1;
  ELSE sign_val := 0;
  END IF;
  seconds := extract(EPOCH FROM created) - 1134028003;
  RETURN round((sign_val * order_val + seconds / 45000)::numeric, 7);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Trigger to auto-update hot_score when votes change
CREATE OR REPLACE FUNCTION update_post_score()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE posts SET
    score = upvotes - downvotes,
    hot_score = calculate_hot_score(upvotes, downvotes, created_at)
  WHERE id = COALESCE(NEW.post_id, OLD.post_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_post_vote_change
  AFTER INSERT OR UPDATE OR DELETE ON post_votes
  FOR EACH ROW EXECUTE FUNCTION update_post_score();
```

---

## 5. Feature Breakdown by Phase

### Phase 1: MVP (Weeks 1-6)
**Goal**: Get community features live with core Reddit-style functionality

| Feature | Description | Priority |
|---------|-------------|----------|
| **Next.js setup** | Initialize Next.js app alongside existing static pages | Critical |
| **Supabase setup** | Create project, define schema, configure auth | Critical |
| **Auth system** | Sign up/login with Google OAuth + email/password | Critical |
| **User profiles** | Basic profile page with username, avatar, bio | Critical |
| **Boards** | 8 default boards (fishing, hunting, camping, hiking, kayaking, skiing, general, gear) | Critical |
| **Post creation** | Create text posts with markdown, link posts, image posts | Critical |
| **Post feed** | Hot/New/Top sorting on board pages | Critical |
| **Voting** | Upvote/downvote on posts | Critical |
| **Comments** | Threaded comments on posts (2-3 levels deep) | Critical |
| **Comment voting** | Upvote/downvote on comments | Critical |
| **Spot integration** | "Discuss this spot" widget on existing spot pages | High |
| **Mobile responsive** | Community pages work well on mobile | High |
| **Basic moderation** | Report button, admin can remove posts/comments | High |

#### Phase 1 Page Structure

```
/                           → Existing homepage (static)
/en/fishing/*               → Existing spot pages (static, with embedded community widget)
/en/community               → Community hub (Next.js) — "Front page" feed
/en/community/b/fishing     → Fishing board (Next.js)
/en/community/b/hunting     → Hunting board
/en/community/b/camping     → Camping board
/en/community/b/hiking      → Hiking board
/en/community/b/kayaking    → Kayaking board
/en/community/b/skiing      → Skiing board
/en/community/b/general     → General outdoor discussion
/en/community/b/gear        → Gear reviews & recommendations
/en/community/post/[id]     → Individual post page
/en/community/submit        → Create new post
/en/profile/[username]      → User profile
/en/auth/login              → Login page
/en/auth/signup             → Signup page
/fr/community/*             → French versions of all community pages
```

#### Spot Page Integration (Phase 1)

Each existing spot page (e.g., `/en/fishing/lake-superior.html`) gets a community widget embedded at the bottom:

```
┌─────────────────────────────────────────┐
│  🗣️ Community Discussion                │
│  ─────────────────────────────           │
│  Latest from the Lake Superior board:    │
│                                          │
│  ▲ 24  "Ice out report - April 2026"     │
│  ▲ 18  "Best lure for lake trout here?"  │
│  ▲ 12  "Trip report: amazing walleye run"│
│                                          │
│  [View all discussions] [Start a thread] │
└─────────────────────────────────────────┘
```

This widget loads via a `<script>` tag or iframe pointing to the Next.js app, so existing static pages don't need to be rebuilt.

---

### Phase 2: Community Growth (Weeks 7-14)
**Goal**: Features that drive engagement, retention, and organic growth

| Feature | Description |
|---------|-------------|
| **Karma system** | Post karma + comment karma, displayed on profiles |
| **User flair** | Activity-based badges ("Angler", "Trail Runner", "Guide") |
| **Notifications** | In-app + email notifications for replies, mentions |
| **Search** | Full-text search across posts, comments, and spots |
| **Trip reports** | Structured post type with date, conditions, species, gear fields |
| **Photo uploads** | Drag-and-drop image upload for posts (catch photos, trail pics) |
| **Conditions updates** | Quick-post format: "Conditions at [spot]: [details]" |
| **Saved posts** | Bookmark posts for later |
| **User settings** | Notification preferences, language, privacy |
| **Automod rules** | Spam detection, new-user restrictions, word filters |
| **Mod dashboard** | Report queue, user management, post/comment removal |
| **Board rules** | Per-board posting guidelines |
| **Share buttons** | Share to social media, copy link |
| **RSS feeds** | Per-board RSS feeds for power users |

### Phase 3: Monetization (Weeks 15-24)
**Goal**: Generate revenue while maintaining community trust

| Feature | Description |
|---------|-------------|
| **Affiliate gear links** | Contextual gear recommendations in trip reports and discussions |
| **Sponsored posts** | Marked "Promoted" posts from outdoor brands in feeds |
| **Premium membership** | "OutdoorIntel Pro" with advanced features |
| **Display ads** | Non-intrusive ad placements (sidebar, between posts) |
| **Outfitter directory** | Paid listings for guides, outfitters, lodges |
| **Gear marketplace** | Used gear buy/sell section (commission-based) |

### Phase 4: Scale & Differentiate (Months 6-12)
**Goal**: Features that make OutdoorIntel uniquely valuable vs. Reddit

| Feature | Description |
|---------|-------------|
| **Map-integrated feed** | See posts plotted on the interactive map |
| **Conditions heatmap** | Crowdsourced real-time conditions overlay on map |
| **Species tracker** | Log catches/sightings, build personal records |
| **Group trips** | Organize and join group outings |
| **Seasonal alerts** | "Ice-out season starting at [spot]" notifications |
| **API for partners** | Public API for conditions data, spot reviews |
| **Mobile app** | React Native or PWA upgrade for native-like experience |

---

## 6. API Design

### Next.js API Routes (Serverless on Vercel)

```
POST   /api/auth/signup           → Create account
POST   /api/auth/login            → Login
POST   /api/auth/logout           → Logout
GET    /api/auth/session          → Get current session

GET    /api/boards                → List all boards
GET    /api/boards/[slug]         → Get board details + metadata

GET    /api/posts                 → List posts (query: board, sort, page, spot_id)
POST   /api/posts                 → Create post
GET    /api/posts/[id]            → Get post with comments
PUT    /api/posts/[id]            → Edit post (author only)
DELETE /api/posts/[id]            → Delete post (author or mod)

POST   /api/posts/[id]/vote       → Upvote/downvote post { value: 1 | -1 | 0 }
POST   /api/posts/[id]/save       → Save/unsave post

GET    /api/posts/[id]/comments   → Get threaded comments
POST   /api/posts/[id]/comments   → Create comment { body, parent_id? }
PUT    /api/comments/[id]         → Edit comment
DELETE /api/comments/[id]         → Delete comment

POST   /api/comments/[id]/vote    → Vote on comment

GET    /api/profiles/[username]   → Get public profile
PUT    /api/profiles/me           → Update own profile

GET    /api/notifications         → Get user notifications
PUT    /api/notifications/read    → Mark notifications as read

POST   /api/reports               → Report post or comment

GET    /api/spots/[slug]/feed     → Get community posts for a specific spot
```

### Client-Side Data Fetching Pattern

```typescript
// Using Supabase client directly (bypasses API routes for reads)
// This is faster and uses Supabase's realtime capabilities

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Fetch posts for a board, sorted by hot score
const { data: posts } = await supabase
  .from('posts')
  .select(`
    *,
    author:profiles(username, avatar_url, karma_posts),
    board:boards(slug, name)
  `)
  .eq('board_id', boardId)
  .eq('is_removed', false)
  .order('hot_score', { ascending: false })
  .range(0, 24)

// Subscribe to realtime vote updates
supabase
  .channel('post-votes')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'posts',
    filter: `board_id=eq.${boardId}`
  }, (payload) => {
    // Update vote count in UI
  })
  .subscribe()
```

---

## 7. Community Structure ("Boards")

### Default Boards (Launch Day)

| Board | Slug | Description | Maps to Existing |
|-------|------|-------------|------------------|
| **Fishing** | `/b/fishing` | Everything fishing — reports, techniques, gear | `/en/fishing/*` (240 spots) |
| **Hunting** | `/b/hunting` | Hunting seasons, game, regulations, stories | `/en/hunting/*` |
| **Camping** | `/b/camping` | Campsite reviews, gear, backcountry tips | `/en/camping/*` |
| **Hiking** | `/b/hiking` | Trail reports, conditions, recommendations | `/en/hiking/*` |
| **Kayaking** | `/b/kayaking` | Paddling routes, rivers, ocean kayaking | `/en/kayaking/*` |
| **Skiing** | `/b/skiing` | Resorts, backcountry, conditions, gear | `/en/skiing/*` |
| **General** | `/b/general` | Off-topic outdoor chat, meetups, questions | New |
| **Gear** | `/b/gear` | Reviews, deals, recommendations, buy/sell | New |

### Sub-boards (Phase 2 — Regional)

As the community grows, add regional sub-boards:
- `/b/fishing/ontario`, `/b/fishing/quebec`, `/b/fishing/bc`
- `/b/hunting/alberta`, `/b/hunting/saskatchewan`

### Post Types

| Type | Icon | Use Case |
|------|------|----------|
| **Discussion** | 💬 | General questions and conversation |
| **Trip Report** | 🗺️ | Structured report with date, location, conditions |
| **Question** | ❓ | Specific question seeking advice |
| **Photo** | 📷 | Photo post (catch, view, camp setup) |
| **Gear Review** | ⚙️ | Review of outdoor equipment |
| **Conditions Update** | 🌤️ | Quick conditions report for a specific spot |

### Spot-to-Board Integration

Every existing spot page is linked to its activity board. When a user creates a post about Lake Superior fishing:

1. Post belongs to **board: fishing**
2. Post is **tagged with spot: lake-superior**
3. Post appears in the `/b/fishing` feed
4. Post ALSO appears on the Lake Superior spot page (`/en/fishing/lake-superior.html`) in the community widget
5. The spot page shows a count: "47 community posts about this spot"

---

## 8. Monetization Strategy

### Revenue Streams (Ordered by Implementation Ease)

#### Stream 1: Affiliate Marketing (Phase 1-2)
**Revenue potential: $500-$5,000/month at scale**

- Contextual gear links in trip reports and gear review posts
- "Gear for this spot" sections on spot pages (already planned in content expansion)
- Auto-detect gear mentions in posts and suggest affiliate links
- Partners: Amazon Associates, Bass Pro Shops, MEC, Cabela's, REI

```
Example: User posts trip report mentioning "Shimano Stradic"
→ System adds affiliate link card below post:
┌─────────────────────────────────────┐
│ 🎣 Shimano Stradic FL Spinning Reel │
│ Mentioned by the author             │
│ ★★★★★ 4.7/5 — $249.99             │
│ [View on Bass Pro] [View on Amazon] │
└─────────────────────────────────────┘
```

#### Stream 2: Display Advertising (Phase 3)
**Revenue potential: $1,000-$10,000/month at scale**

- Tasteful, outdoor-relevant ads (no popups, no autoplay)
- Placements: sidebar on desktop, between posts in feed (every 10th post)
- Ad networks: Google AdSense initially → Mediavine/AdThrive at 50k+ sessions/month
- Native ad format: "Sponsored" posts in the feed (clearly marked)

#### Stream 3: Premium Membership — "OutdoorIntel Pro" (Phase 3)
**Revenue potential: $2,000-$20,000/month at scale**
**Pricing: $4.99/month or $39.99/year**

Premium features:
- **Ad-free experience**
- **Advanced trip planner** with offline maps
- **Conditions alerts** — get notified when conditions at saved spots change
- **Pro badge** on profile and posts
- **Extended photo uploads** (higher limits)
- **Early access** to new features
- **Exclusive boards** (Pro-only fishing tips, gear deals)
- **Detailed spot analytics** (historical conditions, best times based on community data)

#### Stream 4: Outfitter & Guide Directory (Phase 3-4)
**Revenue potential: $2,000-$15,000/month at scale**

- Guides and outfitters pay for premium listings ($29-$99/month)
- Verified "Official Guide" badge
- Listing appears on relevant spot pages
- Direct booking integration
- Review system specific to guides/outfitters

#### Stream 5: Sponsored Content (Phase 3)
**Revenue potential: $500-$5,000/month**

- Outdoor brands sponsor posts/boards
- "Presented by [Brand]" on board headers
- Sponsored gear review posts (clearly marked)
- Seasonal campaign sponsorships ("Ice Fishing Season presented by [Brand]")

#### Stream 6: Used Gear Marketplace (Phase 4)
**Revenue potential: $500-$3,000/month**

- Buy/sell used outdoor gear
- 5-10% transaction fee
- Escrow through Stripe Connect
- Reputation system based on completed trades

### Revenue Projection (Conservative)

| Month | MAU | Revenue Source | Est. Monthly Revenue |
|-------|-----|---------------|---------------------|
| 3 | 1,000 | Affiliate links only | $100-$300 |
| 6 | 5,000 | Affiliate + early ads | $500-$1,500 |
| 12 | 20,000 | Affiliate + ads + some Pro | $2,000-$5,000 |
| 18 | 50,000 | All streams active | $5,000-$15,000 |
| 24 | 100,000 | All streams mature | $10,000-$30,000 |

---

## 9. Migration Plan

### Step-by-Step Implementation

#### Step 1: Project Setup (Days 1-3)

```bash
# Initialize Next.js inside the existing project
cd /home/user/outdoorintel
npx create-next-app@latest community --typescript --tailwind --app --src-dir

# Project structure becomes:
# /home/user/outdoorintel/
# ├── community/              ← New Next.js app
# │   ├── src/
# │   │   ├── app/
# │   │   │   ├── en/community/    ← Community pages
# │   │   │   ├── fr/community/    ← French community pages
# │   │   │   ├── en/auth/         ← Auth pages
# │   │   │   ├── en/profile/      ← Profile pages
# │   │   │   └── api/             ← API routes
# │   │   ├── components/          ← React components
# │   │   ├── lib/                 ← Supabase client, utils
# │   │   └── types/               ← TypeScript types
# │   ├── package.json
# │   └── next.config.ts
# ├── en/                     ← Existing static pages (untouched)
# ├── fr/                     ← Existing static pages (untouched)
# ├── data/                   ← Existing JSON data
# └── vercel.json             ← Updated routing config
```

#### Step 2: Vercel Routing Configuration

Update `vercel.json` to route community paths to Next.js and everything else to static files:

```jsonc
{
  "rewrites": [
    // Community routes → Next.js app
    { "source": "/en/community/:path*", "destination": "/community/en/community/:path*" },
    { "source": "/fr/community/:path*", "destination": "/community/fr/community/:path*" },
    { "source": "/en/auth/:path*", "destination": "/community/en/auth/:path*" },
    { "source": "/en/profile/:path*", "destination": "/community/en/profile/:path*" },
    { "source": "/api/:path*", "destination": "/community/api/:path*" },

    // Everything else → existing static files (default behavior)
  ]
}
```

#### Step 3: Supabase Setup (Day 2-3)

1. Create Supabase project at supabase.com
2. Run the schema SQL from Section 4
3. Configure auth providers (Google OAuth, email/password)
4. Set up RLS policies
5. Create `.env.local` with Supabase credentials

#### Step 4: Build Core Components (Days 4-14)

```
Components to build:
├── PostCard          — Post preview in feed (title, votes, comment count)
├── PostFeed          — Infinite scroll list of PostCards
├── PostDetail        — Full post with comments
├── CommentThread     — Threaded comment tree
├── CommentForm       — Write/reply to comment
├── VoteButton        — Upvote/downvote with animation
├── BoardHeader       — Board name, description, rules, member count
├── BoardSidebar      — Board info, related spots, rules
├── CreatePostForm    — Rich post creation with type selector
├── UserProfile       — Profile page with post/comment history
├── AuthForm          — Login/signup forms
├── NavBar            — Community navigation (matches existing site nav)
├── SpotWidget        — Embeddable widget for existing spot pages
└── NotificationBell  — Notification dropdown
```

#### Step 5: Embed Community Widget in Spot Pages (Days 12-16)

Add a script to inject the community widget into existing static spot pages:

```javascript
// community-widget.js — loaded on spot pages
// Fetches recent community posts for the current spot
// Renders a compact discussion card at the bottom of the page

(function() {
  const spotSlug = document.querySelector('[data-spot-slug]')?.dataset.spotSlug;
  const activity = document.querySelector('[data-activity]')?.dataset.activity;
  if (!spotSlug || !activity) return;

  const container = document.createElement('div');
  container.id = 'outdoor-intel-community';

  // Fetch posts for this spot from the API
  fetch(`/api/spots/${spotSlug}/feed?activity=${activity}&limit=5`)
    .then(r => r.json())
    .then(data => {
      // Render community widget
      container.innerHTML = renderWidget(data);
      document.querySelector('.spot-content')?.appendChild(container);
    });
})();
```

Update existing spot page templates to include `data-spot-slug` and `data-activity` attributes and load the widget script.

#### Step 6: Seed Initial Content (Days 14-18)

- Create the 8 default boards with descriptions and rules
- Seed 20-30 high-quality posts across boards (trip reports, discussions)
- Write welcome posts and community guidelines for each board
- Invite 10-20 beta testers from outdoor communities

#### Step 7: Launch & Iterate (Day 18+)

1. Soft launch to beta testers
2. Gather feedback, fix bugs
3. Add to existing site navigation
4. Announce on social media and outdoor forums
5. Begin Phase 2 features based on user feedback

---

## 10. Cost Estimates

### Phase 1 Costs (MVP)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Hobby (free) → Pro ($20/mo) | $0-$20 |
| Supabase | Free tier (50k MAU) | $0 |
| Domain | Already owned | $0 |
| Resend (email) | Free (100/day) | $0 |
| **Total Phase 1** | | **$0-$20/month** |

### At Scale (10k+ MAU)

| Service | Tier | Monthly Cost |
|---------|------|-------------|
| Vercel | Pro | $20 |
| Supabase | Pro (150k MAU, 8GB DB) | $25 |
| Resend | Pro (50k emails) | $20 |
| Supabase Storage | 100GB | Included in Pro |
| **Total at Scale** | | **~$65/month** |

### Break-even Analysis

- At $65/month infrastructure cost, you need approximately:
  - 13 Pro subscribers ($4.99/month), OR
  - ~$65 in affiliate commissions, OR
  - ~6,500 pageviews/month with display ads ($10 RPM)
- With 5,000 MAU, break-even is very achievable through affiliate alone

---

## Summary: Implementation Priority

```
NOW ──────────────────────────────────────────────────── LATER
│                                                          │
│  1. Next.js + Supabase setup                            │
│  2. Auth (Google + email)                               │
│  3. Boards + Posts + Voting                             │
│  4. Threaded Comments                                   │
│  5. Spot page community widget                          │
│  6. Basic moderation                                    │
│  7. User profiles + karma                               │
│  8. Notifications                                       │
│  9. Trip reports (structured post type)                 │
│  10. Photo uploads                                      │
│  11. Affiliate gear integration                         │
│  12. Display ads                                        │
│  13. Premium membership                                 │
│  14. Outfitter directory                                │
│  15. Map-integrated feed                                │
│  16. Used gear marketplace                              │
│  17. Mobile app                                         │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

**Bottom line**: This is a strong concept. OutdoorIntel already has the content foundation (499+ spots, 1,100+ pages) that Reddit outdoor subs lack. Adding a community layer turns passive visitors into engaged contributors, and the structured location data creates a moat that generic platforms can't replicate. The tech stack (Next.js + Supabase + Vercel) keeps costs near zero until you have real traction, and the multiple monetization streams provide a path to profitability.
